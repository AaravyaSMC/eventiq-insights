import Anthropic from "@anthropic-ai/sdk";

// SERVER-ONLY Anthropic client. The API key must never reach the browser —
// this module is only imported dynamically inside server functions.
if (typeof window !== "undefined") {
  throw new Error("anthropic.server.ts must never be imported into client code.");
}

const apiKey = process.env.ANTHROPIC_API_KEY;

export function getAnthropic(): Anthropic {
  if (!apiKey) {
    throw new Error(
      "Missing ANTHROPIC_API_KEY. Add it to your .env (server-side, no VITE_ prefix) to enable AI features.",
    );
  }
  return new Anthropic({ apiKey });
}

export const CLAUDE_MODEL = "claude-opus-4-8";
