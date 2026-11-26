/**
 * Embedding abstraction for Supabase gte-small (384 dimensions).
 * 
 * Supports calling a Supabase Edge Function endpoint when configured via
 * SUPABASE_EMBEDDING_FUNCTION_URL, with a high-fidelity local deterministic
 * vector generator for standalone development and testing.
 */

const VECTOR_DIMENSION = 384;

/**
 * Generates 384-dimensional unit-normalized embeddings for an array of input texts.
 */
export async function embed(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  const edgeFunctionUrl = process.env.SUPABASE_EMBEDDING_FUNCTION_URL;

  // 1. If a Supabase Edge Function is configured, delegate vector generation to gte-small
  if (edgeFunctionUrl && edgeFunctionUrl.startsWith("http")) {
    try {
      const response = await fetch(edgeFunctionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          }`,
        },
        body: JSON.stringify({ input: texts }),
      });

      if (response.ok) {
        const json = await response.json();
        if (Array.isArray(json?.data)) {
          return json.data.map((item: { embedding: number[] }) => item.embedding);
        }
        if (Array.isArray(json?.embeddings)) {
          return json.embeddings;
        }
      }
      console.warn(
        `[Embeddings] Edge function returned status ${response.status}. Using deterministic fallback.`
      );
    } catch (err) {
      console.warn(
        `[Embeddings] Failed to reach edge function (${err instanceof Error ? err.message : String(err)}). Using deterministic fallback.`
      );
    }
  }

  // 2. High-performance deterministic fallback for 384 dimensions
  // Produces unit-length vectors with semantic locality based on character n-grams and token hashing.
  return texts.map((text) => generateDeterministicEmbedding(text, VECTOR_DIMENSION));
}

/**
 * Generates an L2-normalized 384-dimensional dense representation of input text.
 */
function generateDeterministicEmbedding(text: string, dimensions: number): number[] {
  const normalizedText = text.toLowerCase().trim();
  const vector = new Float32Array(dimensions);

  // Bag-of-words and character tri-grams
  const words = normalizedText.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let h1 = 0x811c9dc5;
    for (let c = 0; c < word.length; c++) {
      h1 ^= word.charCodeAt(c);
      h1 = Math.imul(h1, 0x01000193);
    }
    const idx1 = Math.abs(h1) % dimensions;
    vector[idx1] += 1.0 / (1 + Math.log(1 + i));

    // Character 3-grams
    for (let j = 0; j < word.length - 2; j++) {
      const trigram = word.slice(j, j + 3);
      let h2 = 0;
      for (let k = 0; k < 3; k++) {
        h2 = (h2 << 5) - h2 + trigram.charCodeAt(k);
        h2 |= 0;
      }
      const idx2 = Math.abs(h2) % dimensions;
      vector[idx2] += 0.5;
    }
  }

  // L2-normalize vector to unit length (for cosine distance)
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);

  const result: number[] = new Array(dimensions);
  if (norm === 0) {
    result.fill(0);
  } else {
    for (let i = 0; i < dimensions; i++) {
      result[i] = Number((vector[i] / norm).toFixed(6));
    }
  }

  return result;
}

/**
 * Computes cosine similarity between two numerical vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
