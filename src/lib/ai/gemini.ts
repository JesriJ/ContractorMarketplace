const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

export function hasGeminiKey() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

type GenerateJsonOptions = {
  model?: string;
  system: string;
  user: string;
  timeoutMs?: number;
};

export async function generateGeminiJson(options: GenerateJsonOptions): Promise<unknown | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = options.model ?? process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 12_000);

  try {
    const response = await fetch(
      `${GEMINI_BASE}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: options.system }] },
          contents: [{ role: "user", parts: [{ text: options.user }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    if (!text.trim()) return null;
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function embedGeminiText(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || !text.trim()) return [];

  const model = process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(
      `${GEMINI_BASE}/models/${model}:embedContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          content: { parts: [{ text: text.slice(0, 6000) }] },
        }),
      },
    );
    if (!response.ok) return [];
    const payload = (await response.json()) as {
      embedding?: { values?: number[] };
      embeddings?: Array<{ values?: number[] }>;
    };
    return payload.embedding?.values ?? payload.embeddings?.[0]?.values ?? [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  if (normA === 0 || normB === 0) return 0;
  return Math.max(0, Math.min(1, dot / (Math.sqrt(normA) * Math.sqrt(normB))));
}
