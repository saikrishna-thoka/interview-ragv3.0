import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const roleId = searchParams.get("roleId");
    const difficulty = searchParams.get("difficulty");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("questions")
      .select(
        `
        id,
        question,
        model_answer,
        role_id,
        topic,
        difficulty,
        status,
        source_file,
        created_at,
        roles ( id, name )
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (status && ["pending", "approved", "rejected"].includes(status)) {
      query = query.eq("status", status as "pending" | "approved" | "rejected");
    }

    if (roleId && roleId !== "all") {
      query = query.eq("role_id", roleId);
    }

    if (difficulty && ["Beginner", "Intermediate", "Advanced"].includes(difficulty)) {
      query = query.eq("difficulty", difficulty as "Beginner" | "Intermediate" | "Advanced");
    }

    if (search && search.trim()) {
      query = query.ilike("question", `%${search.trim()}%`);
    }

    const { data, count, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      questions: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("[Questions Query Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
