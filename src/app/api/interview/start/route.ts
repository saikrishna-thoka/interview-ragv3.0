import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { startInterviewSchema } from "@/lib/validations/interview";

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

    const body = await request.json();
    const parsed = startInterviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid interview parameters", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { roleId, difficulty, targetCount, resumeId } = parsed.data;
    const adminSupabase = createAdminClient();

    // Verify role exists
    const { data: role, error: roleError } = await adminSupabase
      .from("roles")
      .select("id, name")
      .eq("id", roleId)
      .single();

    if (roleError || !role) {
      return NextResponse.json({ error: "Selected role does not exist" }, { status: 400 });
    }

    // Insert new interview session
    const { data: session, error: insertError } = await adminSupabase
      .from("interview_sessions")
      .insert({
        user_id: user.id,
        role_id: roleId,
        difficulty,
        target_count: targetCount,
        resume_id: resumeId || null,
        status: "in_progress",
      })
      .select("id")
      .single();

    if (insertError || !session) {
      throw new Error("Failed to initialize session: " + insertError?.message);
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      roleName: role.name,
      difficulty,
      targetCount,
    });
  } catch (error) {
    console.error("[Start Interview Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
