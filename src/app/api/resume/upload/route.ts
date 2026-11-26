import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractResumeText } from "@/lib/resume-extractor";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided in form data" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds the 5 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB)` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text server-side
    const extractedText = await extractResumeText(buffer, file.name, file.type);

    if (!extractedText || extractedText.length < 50) {
      return NextResponse.json(
        { error: "Could not extract sufficient readable text from the uploaded resume." },
        { status: 400 }
      );
    }

    // Sanitize file name and construct path: user_id/timestamp_cleanFileName
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${user.id}/${Date.now()}_${cleanFileName}`;

    // Upload to private Supabase Storage bucket 'resumes' using admin client for guaranteed permissions
    const adminSupabase = createAdminClient();
    const { error: storageError } = await adminSupabase.storage
      .from("resumes")
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (storageError) {
      console.warn("[Resume Storage Warning]", storageError.message);
      // We continue even if storage bucket isn't set up yet, as extracted text is stored in Postgres
    }

    // Insert record into resumes table using admin client to ensure permissions succeed
    const { data: resumeRecord, error: dbError } = await adminSupabase
      .from("resumes")
      .insert({
        user_id: user.id,
        file_path: storagePath,
        extracted_text: extractedText,
      })
      .select("id, file_path, created_at")
      .single();

    if (dbError || !resumeRecord) {
      throw new Error("Failed to record resume in database: " + dbError?.message);
    }

    return NextResponse.json({
      success: true,
      resumeId: resumeRecord.id,
      fileName: file.name,
      filePath: resumeRecord.file_path,
      extractedTextLength: extractedText.length,
      snippet: extractedText.slice(0, 300) + "...",
    });
  } catch (error) {
    console.error("[Resume Upload Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
