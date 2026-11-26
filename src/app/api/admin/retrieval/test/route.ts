import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { embed } from "@/lib/embeddings";
import { z } from "zod";

export const dynamic = "force-dynamic";

const retrievalTestSchema = z.object({
  query: z.string().min(2, "Search query must be at least 2 characters"),
  roleId: z.string().uuid().nullable().optional(),
  difficulty: z.enum(["Beginner", "Intermediate", "Advanced"]).nullable().optional(),
  matchCount: z.number().int().min(1).max(20).default(5),
  similarityThreshold: z.number().min(0).max(1).default(0.0),
});

export async function POST(request: NextRequest) {
  const startTime = performance.now();
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
    const parsed = retrievalTestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { query, roleId, difficulty, matchCount, similarityThreshold } = parsed.data;

    // 1. Generate 384d embedding for the test query
    const embedStartTime = performance.now();
    const [queryEmbedding] = await embed([query]);
    const embedDurationMs = Math.round(performance.now() - embedStartTime);

    if (!queryEmbedding || queryEmbedding.length !== 384) {
      throw new Error("Failed to generate a valid 384-dimensional query vector.");
    }

    const embeddingString = `[${queryEmbedding.join(",")}]`;

    // 2. Execute match_questions stored procedure
    const vectorStartTime = performance.now();
    const { data: matchedQuestions, error: rpcError } = await supabase.rpc(
      "match_questions",
      {
        query_embedding: embeddingString,
        match_role_id: roleId || null,
        match_difficulty: difficulty || null,
        match_count: matchCount,
        similarity_threshold: similarityThreshold,
      }
    );
    const vectorDurationMs = Math.round(performance.now() - vectorStartTime);

    if (rpcError) {
      throw new Error(`Vector match RPC failed: ${rpcError.message}`);
    }

    // 3. Enrich with role names for clear display
    const { data: roles } = await supabase.from("roles").select("id, name");
    const roleMap = new Map((roles || []).map((r) => [r.id, r.name]));

    const enrichedResults = (matchedQuestions || []).map((item) => ({
      id: item.id,
      question: item.question,
      model_answer: item.model_answer,
      role_id: item.role_id,
      role_name: item.role_id ? roleMap.get(item.role_id) || "Unknown" : "General",
      topic: item.topic,
      difficulty: item.difficulty,
      similarity: Number(item.similarity.toFixed(4)),
      cosine_percentage: Math.round(item.similarity * 100),
    }));

    const totalDurationMs = Math.round(performance.now() - startTime);

    return NextResponse.json({
      success: true,
      query,
      filterApplied: {
        roleId: roleId || "all",
        roleName: roleId ? roleMap.get(roleId) : "All Roles",
        difficulty: difficulty || "All Difficulties",
        matchCount,
        similarityThreshold,
      },
      metrics: {
        totalMatches: enrichedResults.length,
        embedDurationMs,
        vectorDurationMs,
        totalDurationMs,
        highestSimilarity: enrichedResults[0]?.similarity || 0,
        groundingQuality:
          (enrichedResults[0]?.similarity || 0) >= 0.8
            ? "High"
            : (enrichedResults[0]?.similarity || 0) >= 0.65
            ? "Moderate"
            : "Weak (fallback recommended)",
      },
      results: enrichedResults,
    });
  } catch (error) {
    console.error("[Retrieval Test Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
