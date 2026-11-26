import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { atsRequestSchema, atsReportSchema } from "@/lib/validations/resume";
import { callGroqWithRetry } from "@/lib/groq";
import { ATS_SCORING_SYSTEM_PROMPT } from "@/lib/prompts/ats-scoring";

export const dynamic = "force-dynamic";

interface GroqAtsResponse {
  overall_score: number;
  section_scores: {
    skills: number;
    experience: number;
    education: number;
    formatting: number;
    keywords: number;
  };
  matched_keywords: string[];
  missing_keywords: string[];
  suggestions: string[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = atsRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { resumeId, roleId } = parsed.data;
    const adminSupabase = createAdminClient();

    // 1. Fetch resume and verify ownership
    const { data: resume, error: resumeError } = await adminSupabase
      .from("resumes")
      .select("id, user_id, extracted_text")
      .eq("id", resumeId)
      .single();

    if (resumeError || !resume || !resume.extracted_text) {
      return NextResponse.json(
        { error: "Resume not found or contains no extractable text" },
        { status: 404 }
      );
    }

    if (resume.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden: Not your resume" }, { status: 403 });
    }

    // 2. Fetch role details
    const { data: role, error: roleError } = await adminSupabase
      .from("roles")
      .select("id, name")
      .eq("id", roleId)
      .single();

    if (roleError || !role) {
      return NextResponse.json({ error: "Target role not found" }, { status: 404 });
    }

    // 3. Build Groq prompt
    const userPromptContent = `
TARGET ROLE FOR ATS BENCHMARK:
${role.name}

CANDIDATE EXTRACTED RESUME TEXT:
${resume.extracted_text.slice(0, 8000)}

Analyze the resume against the target role requirements and produce the complete ATS scoring JSON.
`;

    const modelName = process.env.GROQ_MODEL_GENERATION || "openai/gpt-oss-120b";
    const groqResult = await callGroqWithRetry<GroqAtsResponse>({
      model: modelName,
      messages: [
        { role: "system", content: ATS_SCORING_SYSTEM_PROMPT },
        { role: "user", content: userPromptContent },
      ],
      temperature: 0.1,
      responseFormatJson: true,
    });

    const parsedReport = atsReportSchema.safeParse(groqResult);
    if (!parsedReport.success) {
      console.error("[ATS Report Schema Validation Failed]", parsedReport.error);
      throw new Error("Groq returned an invalid ATS report structure. Please retry.");
    }

    const report = parsedReport.data;
    const overallScore = Math.max(0, Math.min(100, Math.round(Number(report.overall_score) || 0)));

    // 4. Update resume record with ATS evaluation
    const { error: updateError } = await adminSupabase
      .from("resumes")
      .update({
        target_role_id: roleId,
        ats_score: overallScore,
        ats_report: {
          overall_score: overallScore,
          section_scores: report.section_scores,
          matched_keywords: report.matched_keywords,
          missing_keywords: report.missing_keywords,
          suggestions: report.suggestions.slice(0, 5),
        },
      })
      .eq("id", resumeId);

    if (updateError) {
      throw new Error("Failed to save ATS scoring results: " + updateError.message);
    }

    return NextResponse.json({
      success: true,
      resumeId,
      roleName: role.name,
      overallScore,
      atsReport: report,
    });
  } catch (error) {
    console.error("[ATS Scoring API Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
