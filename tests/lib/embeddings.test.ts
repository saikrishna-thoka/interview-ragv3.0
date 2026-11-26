import { test, describe } from "node:test";
import assert from "node:assert";
import { embed, cosineSimilarity } from "../../src/lib/embeddings.ts";

describe("Embeddings and Similarity Utilities", () => {
  test("embed returns 384-dimensional vectors", async () => {
    const texts = [
      "What is gradient boosting in machine learning?",
      "How does self-attention work in Transformers?",
    ];

    const vectors = await embed(texts);
    assert.strictEqual(vectors.length, 2);
    assert.strictEqual(vectors[0].length, 384);
    assert.strictEqual(vectors[1].length, 384);
  });

  test("cosineSimilarity returns 1 for identical vectors", () => {
    const vecA = [0.5, 0.5, 0.5, 0.5];
    const similarity = cosineSimilarity(vecA, vecA);
    assert.ok(Math.abs(similarity - 1.0) < 1e-4);
  });

  test("cosineSimilarity returns 0 for orthogonal vectors", () => {
    const vecA = [1, 0, 0, 0];
    const vecB = [0, 1, 0, 0];
    const similarity = cosineSimilarity(vecA, vecB);
    assert.strictEqual(similarity, 0);
  });

  test("cosineSimilarity handles empty vectors safely", () => {
    const similarity = cosineSimilarity([], []);
    assert.strictEqual(similarity, 0);
  });
});
