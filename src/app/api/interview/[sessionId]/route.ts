import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    const { data: session, error: sessionError } = await adminSupabase
      .from("interview_sessions")
      .select(`
        id,
        user_id,
        role_id,
        difficulty,
        target_count,
        status,
        summary,
        created_at,
        roles ( id, name )
      `)
      .eq("id", params.sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.user_id !== user.id) {
      // Check if admin
      const { data: profile } = await adminSupabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Fetch all turns for this session
    const { data: turns, error: turnsError } = await adminSupabase
      .from("session_turns")
      .select("*")
      .eq("session_id", params.sessionId)
      .order("position", { ascending: true });

    if (turnsError) {
      throw turnsError;
    }

    return NextResponse.json({
      session,
      turns: turns || [],
    });
  } catch (error) {
    console.error("[Get Session Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
