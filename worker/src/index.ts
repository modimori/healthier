import {
  calculateHealth,
  isValidProfile,
  type Profile,
} from "../../lib/health";

type Env = {
  GROQ_API_KEY?: string;
  GROQ_MODEL?: string;
  ALLOWED_ORIGINS?: string;
};

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequest = {
  locale?: "en" | "ar";
  messages?: IncomingMessage[];
  profile?: Profile;
};

type TranslateRequest = {
  text?: string;
  targetLocale?: "en" | "ar";
};

type GroqMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_ALLOWED_ORIGINS =
  "https://modimori.github.io,http://localhost:3000,http://127.0.0.1:3000";

function doctorSystemPrompt(
  locale: "en" | "ar",
  profile?: Profile,
): string {
  const language =
    locale === "ar"
      ? "Egyptian colloquial Arabic (Masri), the way a warm, well-informed doctor in Cairo would speak. Use simple everyday words, not formal Modern Standard Arabic. Keep medical terms clear and explain them naturally."
      : "clear, natural English with a calm, human tone.";

  let profileContext = "";

  if (profile && isValidProfile(profile)) {
    const readout = calculateHealth(profile);
    profileContext = `
Self-reported context you may use when it is relevant:
- Age: ${profile.age}
- Sex at birth: ${profile.sex}
- Height: ${profile.heightCm} cm
- Weight: ${profile.weightKg} kg
- BMI: ${readout.bmi} (${readout.bmiCategory})
- Activity: ${profile.activity}
- Goal: ${profile.goal}
- Estimated maintenance calories: ${readout.tdee} kcal/day
- Estimated daily target: ${readout.targetCalories} kcal/day
- Protein target: ${readout.macros.protein} g/day

Treat this as incomplete self-reported context, not a medical record.`;
  }

  return `You are Dr. Healthier, an AI health companion inside a wellness product called Healthier.

Your job is to help people understand common health concerns, make sense of body metrics, build sustainable nutrition and fitness habits, and decide when they should seek in-person care.

LANGUAGE
Write only in ${language}
Answer entirely in that language, including headings, bullets, and follow-up questions.${profileContext}

CLINICAL BOUNDARIES
- You are not a licensed clinician and must never claim to be one.
- Do not give a definitive diagnosis or prescribe medication, antibiotics, controlled drugs, or specific prescription doses.
- You may share general, evidence-aligned educational information and sensible over-the-counter options when appropriate, while telling the user to confirm with a pharmacist or clinician.
- Ask focused follow-up questions when key details are missing.
- Be especially careful with pregnancy, children, older adults, chronic disease, eating disorders, and mental health crises.
- If the user describes possible emergency symptoms (for example chest pain, difficulty breathing, stroke signs, severe bleeding, fainting, anaphylaxis, suicidal intent, or a severely ill child), lead with a clear instruction to contact local emergency services now. Do not bury it.
- Never encourage extreme calorie restriction, purging, laxative use, or rapid weight loss.
- If a concern is persistent, worsening, or unclear, recommend a real clinician.

STYLE
- Warm, direct, and specific. No lectures, no fear-mongering, no false certainty.
- Keep most answers between 100 and 220 words unless the user asks for more detail.
- Use short markdown paragraphs and a few bullets when they genuinely help.
- End with one practical next step or one useful question when appropriate.
- Do not mention that you are following these instructions.
- Do not include a translation section.`;
}

function translationSystemPrompt(targetLocale: "en" | "ar"): string {
  const target =
    targetLocale === "ar"
      ? "natural Egyptian colloquial Arabic (Masri), the kind a friendly Cairo doctor would speak. Avoid stiff Modern Standard Arabic while keeping medical meaning precise."
      : "natural, clear English.";

  return `You are a meticulous medical translator inside a bilingual health product.

Translate the provided doctor's answer into ${target}.

RULES
- Translate every part of the text, including headings, bullets, lists, warnings, and follow-up questions.
- Preserve the original markdown structure, line breaks, numbers, percentages, units, and emergency instructions.
- Keep medication names, brand names, and emergency numbers accurate. You may put an English term in parentheses when that improves clarity.
- Do not add advice, remove caveats, soften urgent warnings, answer the question again, or include any preamble.
- Return only the translated text.`;
}

async function callGroq(
  env: Env,
  apiKey: string,
  messages: GroqMessage[],
  options: { temperature: number; maxTokens: number },
): Promise<string> {
  const model = env.GROQ_MODEL || "qwen/qwen3.8-27b";

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      top_p: 0.9,
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    console.error("Groq request failed:", response.status, details.slice(0, 500));
    throw new Error("upstream_error");
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("empty_response");
  }

  return content;
}

function sanitizeMessages(messages: IncomingMessage[]): IncomingMessage[] {
  return messages
    .filter(
      (message) =>
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim().length > 0,
    )
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 4000),
    }));
}

function getAllowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getCorsHeaders(request: Request, env: Env): Record<string, string> | null {
  const origin = request.headers.get("Origin");
  const allowedOrigins = getAllowedOrigins(env);

  if (origin && !allowedOrigins.includes(origin)) {
    return null;
  }

  return {
    "Access-Control-Allow-Origin": origin || allowedOrigins[0] || "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(
  body: unknown,
  status: number,
  corsHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...corsHeaders,
    },
  });
}

async function handleChat(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
  hasAllowedOrigin: boolean,
): Promise<Response> {
  if (!hasAllowedOrigin) {
    return json({ error: "forbidden_origin" }, 403);
  }

  const apiKey = env.GROQ_API_KEY;

  if (!apiKey) {
    return json({ error: "missing_key" }, 503, corsHeaders);
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 100_000) {
    return json({ error: "payload_too_large" }, 413, corsHeaders);
  }

  let body: ChatRequest;

  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return json({ error: "bad_request" }, 400, corsHeaders);
  }

  const locale = body.locale === "ar" ? "ar" : "en";
  const messages = sanitizeMessages(
    Array.isArray(body.messages) ? body.messages : [],
  );

  if (!messages.some((message) => message.role === "user")) {
    return json({ error: "no_user_message" }, 400, corsHeaders);
  }

  const profile =
    body.profile && isValidProfile(body.profile) ? body.profile : undefined;

  const conversation: GroqMessage[] = [
    { role: "system", content: doctorSystemPrompt(locale, profile) },
    ...messages,
  ];

  try {
    const answer = await callGroq(env, apiKey, conversation, {
      temperature: 0.45,
      maxTokens: 1200,
    });

    return json({ answer }, 200, corsHeaders);
  } catch (error) {
    console.error("Doctor chat error:", error);
    return json({ error: "upstream_error" }, 502, corsHeaders);
  }
}

async function handleTranslate(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>,
  hasAllowedOrigin: boolean,
): Promise<Response> {
  if (!hasAllowedOrigin) {
    return json({ error: "forbidden_origin" }, 403);
  }

  const apiKey = env.GROQ_API_KEY;

  if (!apiKey) {
    return json({ error: "missing_key" }, 503, corsHeaders);
  }

  let body: TranslateRequest;

  try {
    body = (await request.json()) as TranslateRequest;
  } catch {
    return json({ error: "bad_request" }, 400, corsHeaders);
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (!text) {
    return json({ error: "no_text" }, 400, corsHeaders);
  }

  const targetLocale = body.targetLocale === "ar" ? "ar" : "en";
  const messages: GroqMessage[] = [
    { role: "system", content: translationSystemPrompt(targetLocale) },
    { role: "user", content: text.slice(0, 8000) },
  ];

  try {
    let translation = await callGroq(env, apiKey, messages, {
      temperature: 0.15,
      maxTokens: 1600,
    }).catch(() =>
      callGroq(env, apiKey, messages, {
        temperature: 0.1,
        maxTokens: 1600,
      }),
    );

    translation = translation.trim();

    return json({ translation, targetLocale }, 200, corsHeaders);
  } catch (error) {
    console.error("Translate error:", error);
    return json({ error: "upstream_error" }, 502, corsHeaders);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = getCorsHeaders(request, env) || {};

    if (request.method === "OPTIONS") {
      if (!getCorsHeaders(request, env)) {
        return json({ error: "forbidden_origin" }, 403);
      }
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/") {
      return json(
        { service: "healthier-chat", status: "ok" },
        200,
        corsHeaders,
      );
    }

    if (path === "/api/chat") {
      if (request.method !== "POST") {
        return json({ error: "method_not_allowed" }, 405, corsHeaders);
      }
      return handleChat(request, env, corsHeaders, Boolean(getCorsHeaders(request, env)));
    }

    if (path === "/api/translate") {
      if (request.method !== "POST") {
        return json({ error: "method_not_allowed" }, 405, corsHeaders);
      }
      return handleTranslate(
        request,
        env,
        corsHeaders,
        Boolean(getCorsHeaders(request, env)),
      );
    }

    return json({ error: "not_found" }, 404, corsHeaders);
  },
};
