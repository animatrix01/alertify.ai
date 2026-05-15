import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  alertId: z.string(),
  type: z.string(),
  severity: z.string(),
  title: z.string(),
  description: z.string().nullable(),
});

type AlertInput = z.infer<typeof InputSchema>;

const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `You are an emergency alert assistant for Alertify, a disaster alert platform.
Your job is to convert raw disaster alert data into short, calm, actionable safety guidance.

Rules:
- Maximum 2 sentences. No more.
- Start with a relevant emoji (⚠️ 🌊 🔥 🌪️ 🏔️ 🌡️ 🌍).
- Be specific about the risk and what to do.
- Tone: calm, professional, urgent but not panicked.
- Never say "I" or "we". Write in second person ("You should...", "Avoid...").
- If description is empty, infer from type and severity.`;

/**
 * Server function — runs on the server (Cloudflare Worker / Node SSR).
 * GROQ_API_KEY is never sent to the browser.
 */
export const getAlertAISummary = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }: { data: AlertInput }): Promise<string> => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === "your_groq_api_key_here") {
      return data.description ?? `${data.severity} ${data.type} alert. Follow local authority guidance.`;
    }

    const userMessage = `
Alert type: ${data.type}
Severity: ${data.severity}
Title: ${data.title}
Description: ${data.description ?? "No description provided."}

Generate a short emergency safety summary.`.trim();

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          max_tokens: 120,
          temperature: 0.4,
        }),
      });

      if (!res.ok) {
        console.error("[Groq] API error:", res.status, await res.text());
        return data.description ?? `${data.severity} ${data.type} alert. Follow local authority guidance.`;
      }

      const json = await res.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const summary = json.choices?.[0]?.message?.content?.trim();
      return summary || (data.description ?? `${data.severity} ${data.type} alert.`);
    } catch (err) {
      console.error("[Groq] Fetch failed:", err);
      return data.description ?? `${data.severity} ${data.type} alert. Follow local authority guidance.`;
    }
  });
