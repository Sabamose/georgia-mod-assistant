import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const EDGE_OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-2026-03-05";
const EDGE_ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";

export const GEORGIAN_BOUNDARY_KEYWORDS = [
  "კომპეტენციის მიღმა",
  "სამხედრო სამსახურთან დაკავშირებულ",
  "შესაბამის უწყებას",
  "ცხელ ხაზს",
];

const ENGLISH_LEAKAGE_WORDS = [
  "hello",
  "service",
  "contract",
  "professional",
  "mandatory",
  "deferral",
  "reserve",
  "support units",
];

export function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(ROOT_DIR, relativePath), "utf8");
}

export function parseDotEnvFile(relativePath = ".env") {
  const filePath = path.join(ROOT_DIR, relativePath);
  if (!fs.existsSync(filePath)) return {};

  const values = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    const rawValue = trimmed.slice(equalsIndex + 1).trim();
    values[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
  return values;
}

export function getEdgeConfig() {
  const envFile = parseDotEnvFile();
  const supabaseUrl = process.env.VITE_SUPABASE_URL || envFile.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || envFile.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment or .env");
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    edgeUrl: `${supabaseUrl.replace(/\/$/, "")}/functions/v1/chat`,
  };
}

export async function askEdgeChat(prompt, options = {}) {
  const { language = "ka", origin = "http://localhost:5173", messages } = options;
  const { edgeUrl, supabaseAnonKey } = getEdgeConfig();
  const payloadMessages = messages || [{ role: "user", content: prompt }];

  const response = await fetch(edgeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseAnonKey}`,
      "apikey": supabaseAnonKey,
      "Origin": origin,
    },
    body: JSON.stringify({
      messages: payloadMessages,
      language,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return collectAnthropicCompatibleText(response);
}

export async function collectAnthropicCompatibleText(response) {
  const text = await response.text();
  let fullResponse = "";

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line.startsWith("data: ")) continue;

    const data = line.slice(6);
    if (data === "[DONE]") break;

    try {
      const parsed = JSON.parse(data);
      if (parsed.type === "content_block_delta" && parsed.delta?.text) {
        fullResponse += parsed.delta.text;
      }
    } catch {
      // Ignore malformed SSE frames.
    }
  }

  return fullResponse;
}

export function loadQualityCases() {
  return JSON.parse(readProjectFile("tests/georgian-quality-cases.json"));
}

export function normalizeText(text) {
  return (text || "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function runGeorgianHeuristics(response, caseConfig = {}) {
  const text = response || "";
  const normalized = normalizeText(text);
  const failures = [];
  const allowLatin = caseConfig.allowLatin === true;
  const allowEnglishLeakage = caseConfig.allowEnglishLeakage === true;
  const allowMalformedSuffix = caseConfig.allowMalformedSuffix === true;

  if (!text.trim()) {
    failures.push("Empty response");
  }

  if (normalized.includes("შენ ") || normalized.includes(" გინდა") ||
    normalized.includes("შეგიძლია") || normalized.includes("გთხოვ ")) {
    failures.push("Contains informal Georgian register");
  }

  if (!allowMalformedSuffix && /[^\s]+-ს შესახებ/.test(text)) {
    failures.push("Contains malformed suffix artifact");
  }

  if (!allowLatin && /[A-Za-z]/.test(text)) {
    failures.push("Contains Latin characters in Georgian response");
  }

  if (!allowEnglishLeakage) {
    const leakedWord = ENGLISH_LEAKAGE_WORDS.find((word) => normalized.includes(word));
    if (leakedWord) {
      failures.push(`Contains English leakage: "${leakedWord}"`);
    }
  }

  return failures;
}

export function evaluateCaseAssertions(testCase, response) {
  const normalized = normalizeText(response);
  const failures = [];

  if (testCase.mustContainAll) {
    for (const fragment of testCase.mustContainAll) {
      if (!normalized.includes(String(fragment).toLowerCase())) {
        failures.push(`Missing required fragment: "${fragment}"`);
      }
    }
  }

  if (testCase.mustContainAny && testCase.mustContainAny.length > 0) {
    const matchesAny = testCase.mustContainAny.some((fragment) =>
      normalized.includes(String(fragment).toLowerCase())
    );
    if (!matchesAny) {
      failures.push(`Missing all expected fragments: [${testCase.mustContainAny.join(", ")}]`);
    }
  }

  if (testCase.mustNotContain) {
    for (const fragment of testCase.mustNotContain) {
      if (normalized.includes(String(fragment).toLowerCase())) {
        failures.push(`Contains forbidden fragment: "${fragment}"`);
      }
    }
  }

  if (testCase.expectBoundary === true) {
    const hasBoundarySignal = GEORGIAN_BOUNDARY_KEYWORDS.some((keyword) =>
      normalized.includes(keyword.toLowerCase())
    );
    if (!hasBoundarySignal) {
      failures.push("Missing expected boundary-handling language");
    }
  }

  return failures;
}

export function summarizeCaseResult(testCase, response, failures) {
  return {
    id: testCase.id,
    category: testCase.category,
    prompt: testCase.prompt,
    failures,
    response: response.slice(0, 240),
  };
}

export function buildDirectEvaluationPrompt(language = "ka") {
  const systemPrompt = readProjectFile("SYSTEM_PROMPT.md");
  const knowledgeBase = readProjectFile("knowledge-base.txt");
  const georgianAddendum = language === "ka"
    ? `\n\nკრიტიკული დამატებითი ინსტრუქცია:\n- ქართულ პასუხში არ გამოიყენოთ ლათინური ასოები.\n- ქართულ პასუხში არ გამოიყენოთ ინგლისური სიტყვები.\n- არასოდეს შექმნათ ფორმა "სამსახური-ს შესახებ".\n- თუ მომხმარებელი წერს ტრანსლიტერაციით, უპასუხეთ გამართული ქართულით.\n`
    : "";

  return `${systemPrompt}\n\n---\n\nKNOWLEDGE BASE:\n\n${knowledgeBase}${georgianAddendum}`;
}

async function collectSseJson(response) {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Streaming response body missing");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  const events = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() || "";

    for (const frame of frames) {
      const dataLines = frame
        .split("\n")
        .filter((line) => line.startsWith("data: "))
        .map((line) => line.slice(6));
      if (dataLines.length === 0) continue;

      const data = dataLines.join("\n");
      if (data === "[DONE]") continue;

      try {
        events.push(JSON.parse(data));
      } catch {
        // Ignore malformed frames.
      }
    }
  }

  return events;
}

export async function askOpenAIDirect(prompt, options = {}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const language = options.language || "ka";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: EDGE_OPENAI_MODEL,
      stream: true,
      max_output_tokens: 1024,
      instructions: buildDirectEvaluationPrompt(language),
      input: [{
        role: "user",
        content: [{
          type: "input_text",
          text: prompt,
        }],
      }],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI HTTP ${response.status}: ${await response.text()}`);
  }

  const events = await collectSseJson(response);
  return events
    .filter((event) => event.type === "response.output_text.delta" && typeof event.delta === "string")
    .map((event) => event.delta)
    .join("");
}

export async function askAnthropicDirect(prompt, options = {}) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }

  const language = options.language || "ka";
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: EDGE_ANTHROPIC_MODEL,
      max_tokens: 1024,
      stream: true,
      system: buildDirectEvaluationPrompt(language),
      messages: [{
        role: "user",
        content: prompt,
      }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic HTTP ${response.status}: ${await response.text()}`);
  }

  const events = await collectSseJson(response);
  return events
    .filter((event) => event.type === "content_block_delta" && event.delta?.type === "text_delta")
    .map((event) => event.delta.text)
    .join("");
}

export function printSummary(title, passed, total) {
  const score = total === 0 ? 0 : ((passed / total) * 100).toFixed(1);
  console.log(`\n${title}`);
  console.log(`Passed: ${passed}/${total}`);
  console.log(`Score: ${score}%`);
}
