declare module "mammoth" {
  export interface MammothResult {
    value: string;
    messages: unknown[];
  }
  export function extractRawText(input: { buffer: Buffer }): Promise<MammothResult>;
}

declare module "pdf-parse/lib/pdf-parse.js" {
  interface PDFData {
    numpages: number;
    numrender: number;
    info: Record<string, unknown>;
    metadata: Record<string, unknown>;
    text: string;
    version: string;
  }
  function pdf(dataBuffer: Buffer, options?: Record<string, unknown>): Promise<PDFData>;
  export = pdf;
}
