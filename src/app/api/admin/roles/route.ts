import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch roles
    const { data: roles, error: rolesError } = await supabase
      .from("roles")
      .select("id, name, created_at")
      .order("name", { ascending: true });

    if (rolesError) {
      throw rolesError;
    }

    // Fetch question counts per role
    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("role_id, status");

    if (qError) {
      throw qError;
    }

    const countsByRole: Record<string, { total: number; approved: number; pending: number }> = {};

    roles.forEach((r) => {
      countsByRole[r.id] = { total: 0, approved: 0, pending: 0 };
    });

    questions?.forEach((q) => {
      if (q.role_id && countsByRole[q.role_id]) {
        countsByRole[q.role_id].total++;
        if (q.status === "approved") countsByRole[q.role_id].approved++;
        if (q.status === "pending") countsByRole[q.role_id].pending++;
      }
    });

    const enrichedRoles = roles.map((r) => ({
      ...r,
      counts: countsByRole[r.id] || { total: 0, approved: 0, pending: 0 },
    }));

    return NextResponse.json({ roles: enrichedRoles });
  } catch (error) {
    console.error("[Roles Query Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
