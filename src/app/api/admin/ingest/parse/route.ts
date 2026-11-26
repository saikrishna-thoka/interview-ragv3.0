import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Papa from "papaparse";

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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No CSV file provided." }, { status: 400 });
    }

    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      return NextResponse.json({ error: "File must be a CSV." }, { status: 400 });
    }

    const csvText = await file.text();
    if (!csvText.trim()) {
      return NextResponse.json({ error: "Uploaded CSV file is empty." }, { status: 400 });
    }

    const parseResult = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim(),
    });

    if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
      return NextResponse.json(
        { error: "Failed to parse CSV: " + parseResult.errors[0]?.message },
        { status: 400 }
      );
    }

    const headers = parseResult.meta.fields || [];
    const allRows = parseResult.data.filter((row) =>
      Object.values(row).some((val) => val && String(val).trim().length > 0)
    );

    if (allRows.length === 0) {
      return NextResponse.json({ error: "CSV file contains no valid data rows." }, { status: 400 });
    }

    // Auto-detect default mapping based on standard column headers
    const findMatch = (candidates: string[]) => {
      return (
        headers.find((h) =>
          candidates.some((c) => h.toLowerCase().includes(c.toLowerCase()))
        ) || ""
      );
    };

    const defaultMapping = {
      questionColumn: findMatch(["question", "query", "prompt", "problem"]) || headers[0] || "",
      answerColumn: findMatch(["answer", "solution", "model_answer", "response"]),
      topicColumn: findMatch(["topic", "category", "area", "domain", "subject"]),
      difficultyColumn: findMatch(["difficulty", "level", "tier"]),
    };

    return NextResponse.json({
      success: true,
      fileName: file.name,
      headers,
      preview: allRows.slice(0, 10),
      totalRows: allRows.length,
      defaultMapping,
      allRows,
    });
  } catch (error) {
    console.error("[Parse CSV Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
