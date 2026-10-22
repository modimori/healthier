import { NextResponse } from "next/server";
import {
  calculateHealth,
  isValidProfile,
  type Profile,
} from "@/lib/health";

export const runtime = "nodejs";

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

type ChatRequest = {
  locale?: "en" | "ar";
  messages?: IncomingMessage[];
  profile?: Profile;
};

type GroqMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

function getLanguageName(locale: "en" | "ar"): string {
  return locale === "ar" ? "Egyptian Arabic" : "English";
}

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
Do not translate your answer yourself. A separate translation step runs afterwards.${profileContext}

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

function translationSystemPrompt(
  targetLocale: "en" | "ar",
): string {
  const target =
    targetLocale === "ar"
      ? "natural Egyptian colloquial Arabic (Masri), the kind a friendly Cairo doctor would speak. Avoid stiff Modern Standard Arabic while keeping medical meaning precise."
      : "natural, clear English.";

  return `You are a meticulous medical translator inside a bilingual health product.

Translate the doctor's answer into ${target}.

RULES
- Translate every part of the text, including headings, bullets, lists, warnings, and follow-up questions.
- Preserve the original markdown structure, line breaks, numbers, percentages, units, and emergency instructions.
- Keep medication names, brand names, and emergency numbers accurate. You may put an English term in parentheses when that improves clarity.
- Do not add advice, remove caveats, soften urgent warnings, answer the question again, or include any preamble.
- Return only the translated text.`;
}

async function callGroq(
  apiKey: string,
  messages: GroqMessage[],
  options: { temperature: number; maxTokens: number },
): Promise<string> {
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

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

async function translateAnswer(
  apiKey: string,
  answer: string,
  targetLocale: "en" | "ar",
): Promise<string> {
  const messages: GroqMessage[] = [
    { role: "system", content: translationSystemPrompt(targetLocale) },
    { role: "user", content: answer },
  ];

  try {
    return await callGroq(apiKey, messages, {
      temperature: 0.15,
      maxTokens: 1400,
    });
  } catch {
    return callGroq(apiKey, messages, {
      temperature: 0.1,
      maxTokens: 1400,
    });
  }
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

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "missing_key" }, { status: 503 });
  }

  let body: ChatRequest;

  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const locale = body.locale === "ar" ? "ar" : "en";
  const targetLocale = locale === "en" ? "ar" : "en";
  const messages = sanitizeMessages(
    Array.isArray(body.messages) ? body.messages : [],
  );

  if (!messages.some((message) => message.role === "user")) {
    return NextResponse.json({ error: "no_user_message" }, { status: 400 });
  }

  const profile =
    body.profile && isValidProfile(body.profile) ? body.profile : undefined;

  const conversation: GroqMessage[] = [
    { role: "system", content: doctorSystemPrompt(locale, profile) },
    ...messages,
  ];

  try {
    const answer = await callGroq(apiKey, conversation, {
      temperature: 0.45,
      maxTokens: 1000,
    });

    const translation = await translateAnswer(apiKey, answer, targetLocale);

    return NextResponse.json({
      answer,
      translation,
      targetLocale,
    });
  } catch (error) {
    console.error("Doctor chat error:", error);
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}
