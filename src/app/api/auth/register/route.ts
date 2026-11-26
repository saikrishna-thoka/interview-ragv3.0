import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { registerSchema } from "@/lib/validations/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { email, password, fullName } = parsed.data;
    const adminSupabase = createAdminClient();

    // Create user with email_confirm: true so they can log in immediately
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already") || error.status === 422) {
        return NextResponse.json(
          { error: "An account with this email address already exists. Please sign in." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Ensure profiles record exists with role 'user'
    if (data.user) {
      await adminSupabase
        .from("profiles")
        .upsert({
          id: data.user.id,
          email: data.user.email || email,
          full_name: fullName.trim(),
          role: "user",
        })
        .select()
        .single();
    }

    return NextResponse.json({
      success: true,
      userId: data.user?.id,
      email: data.user?.email,
    });
  } catch (error) {
    console.error("[Register API Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
