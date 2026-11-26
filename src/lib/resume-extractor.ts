import pdfParse from "pdf-parse/lib/pdf-parse.js";
import * as mammoth from "mammoth";

/**
 * Extracts plain text from resume file buffer (PDF, DOCX, or TXT)
 */
export async function extractResumeText(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const lowerName = fileName.toLowerCase();

  try {
    if (lowerName.endsWith(".pdf") || mimeType === "application/pdf") {
      const data = await pdfParse(buffer);
      const text = (data.text || "").trim();
      if (!text) {
        throw new Error(
          "The uploaded PDF appears to be empty or contains scanned images without extractable text."
        );
      }
      return cleanText(text);
    }

    if (
      lowerName.endsWith(".docx") ||
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ buffer });
      const text = (result.value || "").trim();
      if (!text) {
        throw new Error("The uploaded DOCX file does not contain readable text.");
      }
      return cleanText(text);
    }

    if (lowerName.endsWith(".txt") || mimeType === "text/plain") {
      const text = buffer.toString("utf-8").trim();
      return cleanText(text);
    }

    throw new Error("Unsupported file format. Please upload a PDF or DOCX file (max 5 MB).");
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Failed to parse and extract resume text.");
  }
}

function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\x20-\x7E\n\t]/g, " ")
    .trim();
}
