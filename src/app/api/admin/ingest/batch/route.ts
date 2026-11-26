import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ingestBatchPayloadSchema, classifiedBatchResponseSchema } from "@/lib/validations/csv";
import { callGroqWithRetry } from "@/lib/groq";
import { CLASSIFY_SYSTEM_PROMPT } from "@/lib/prompts/classify";
import { embed } from "@/lib/embeddings";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const parsedPayload = ingestBatchPayloadSchema.safeParse(body);

    if (!parsedPayload.success) {
      return NextResponse.json(
        { error: "Invalid payload format", details: parsedPayload.error.format() },
        { status: 400 }
      );
    }

    const { jobId: existingJobId, fileName, totalRows, batchIndex, rows } = parsedPayload.data;

    // 1. Ensure ingestion job exists or initialize new job
    let jobId = existingJobId;
    if (!jobId) {
      const { data: job, error: jobError } = await supabase
        .from("ingestion_jobs")
        .insert({
          file_name: fileName,
          total_rows: totalRows,
          processed_rows: 0,
          failed_rows: 0,
          status: "processing",
          created_by: user.id,
        })
        .select("id")
        .single();

      if (jobError || !job) {
        throw new Error("Failed to create ingestion job: " + jobError?.message);
      }
      jobId = job.id;
    }

    // 2. Fetch all role IDs to map role names to role_ids
    const { data: rolesData, error: rolesError } = await supabase
      .from("roles")
      .select("id, name");

    if (rolesError || !rolesData) {
      throw new Error("Failed to fetch roles: " + rolesError?.message);
    }

    const roleMap = new Map<string, string>();
    rolesData.forEach((r) => roleMap.set(r.name.toLowerCase().trim(), r.id));

    // 3. Format prompt questions for Groq classification
    const questionsInput = rows.map((r, idx) => ({
      index: idx,
      raw_question: r.question,
      provided_answer: r.answer || "",
      provided_topic: r.topic || "",
      provided_difficulty: r.difficulty || "",
    }));

    const classifyModel = process.env.GROQ_MODEL_CLASSIFY || "llama-3.1-8b-instant";

    let classifiedItems: Array<{
      index: number;
      cleaned_question: string;
      role: string;
      topic: string;
      difficulty: "Beginner" | "Intermediate" | "Advanced";
      model_answer?: string;
    }> = [];

    const promptMessages = [
      { role: "system" as const, content: CLASSIFY_SYSTEM_PROMPT },
      {
        role: "user" as const,
        content: `Classify the following ${rows.length} questions:\n${JSON.stringify(
          questionsInput,
          null,
          2
        )}`,
      },
    ];

    try {
      const groqResponse = await callGroqWithRetry<unknown>({
        model: classifyModel,
        messages: promptMessages,
        temperature: 0.1,
        responseFormatJson: true,
      });

      const validated = classifiedBatchResponseSchema.safeParse(groqResponse);
      if (validated.success) {
        classifiedItems = validated.data.classified;
      } else {
        // Retry once on schema mismatch
        console.warn("[Ingest Batch] Schema mismatch on first try. Retrying Groq call...");
        const retryResponse = await callGroqWithRetry<unknown>({
          model: classifyModel,
          messages: [
            ...promptMessages,
            {
              role: "user" as const,
              content:
                "Ensure your output strictly conforms to the JSON schema: { classified: [{ index, cleaned_question, role, topic, difficulty, model_answer }] }",
            },
          ],
          temperature: 0.0,
          responseFormatJson: true,
        });

        const retryValidated = classifiedBatchResponseSchema.parse(retryResponse);
        classifiedItems = retryValidated.classified;
      }
    } catch (classifyErr) {
      console.error("[Groq Classify Failure]", classifyErr);
      // Mark rows in this batch as failed without crashing the whole client loop
      await supabase
        .from("ingestion_jobs")
        .update({
          failed_rows: rows.length,
          processed_rows: rows.length,
          status: batchIndex * 20 + rows.length >= totalRows ? "completed" : "processing",
        })
        .eq("id", jobId);

      return NextResponse.json({
        jobId,
        processed: rows.length,
        inserted: 0,
        duplicates: 0,
        failed: rows.length,
        errors: [classifyErr instanceof Error ? classifyErr.message : "Classification failed"],
      });
    }

    // 4. Generate embeddings for all classified questions in one batch call
    const questionsToEmbed = classifiedItems.map((c) => c.cleaned_question);
    const embeddings = await embed(questionsToEmbed);

    let insertedCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;
    const itemErrors: string[] = [];

    // 5. Deduplicate and insert each question
    for (let i = 0; i < classifiedItems.length; i++) {
      const item = classifiedItems[i];
      const embeddingVector = embeddings[i];

      if (!embeddingVector || embeddingVector.length !== 384) {
        failedCount++;
        itemErrors.push(`Failed to generate 384d embedding for: ${item.cleaned_question.slice(0, 40)}`);
        continue;
      }

      // Check near-duplicate (cosine similarity > 0.92) via find_duplicate_question function
      const embeddingString = `[${embeddingVector.join(",")}]`;
      const { data: dupData, error: dupError } = await supabase.rpc(
        "find_duplicate_question",
        {
          query_embedding: embeddingString,
          similarity_threshold: 0.92,
        }
      );

      if (!dupError && dupData && dupData.length > 0) {
        duplicateCount++;
        continue;
      }

      const roleId = roleMap.get(item.role.toLowerCase().trim()) || null;

      const { error: insertError } = await supabase.from("questions").insert({
        question: item.cleaned_question,
        model_answer: item.model_answer || null,
        role_id: roleId,
        topic: item.topic,
        difficulty: item.difficulty,
        embedding: embeddingString,
        status: "pending", // Only approved questions are used in RAG
        source_file: fileName,
        created_by: user.id,
      });

      if (insertError) {
        failedCount++;
        itemErrors.push(insertError.message);
      } else {
        insertedCount++;
      }
    }

    // 6. Update ingestion_jobs tracking
    const { data: currentJob } = await supabase
      .from("ingestion_jobs")
      .select("processed_rows, failed_rows")
      .eq("id", jobId)
      .single();

    const newProcessed = (currentJob?.processed_rows || 0) + rows.length;
    const newFailed = (currentJob?.failed_rows || 0) + failedCount;
    const isFinished = newProcessed >= totalRows;

    await supabase
      .from("ingestion_jobs")
      .update({
        processed_rows: newProcessed,
        failed_rows: newFailed,
        status: isFinished ? "completed" : "processing",
      })
      .eq("id", jobId);

    return NextResponse.json({
      success: true,
      jobId,
      processed: rows.length,
      inserted: insertedCount,
      duplicates: duplicateCount,
      failed: failedCount,
      errors: itemErrors,
      isFinished,
    });
  } catch (error) {
    console.error("[Ingest Batch Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
