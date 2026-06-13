const TOPIC_CHIPS = {
  ka: [
    "\u10E1\u10D0\u10D5\u10D0\u10DA\u10D3\u10D4\u10D1\u10E3\u10DA\u10DD \u10E1\u10D0\u10DB\u10E1\u10D0\u10EE\u10E3\u10E0\u10D8",
    "\u10D2\u10D0\u10D3\u10D0\u10D5\u10D0\u10D3\u10D4\u10D1\u10D0",
    "\u10E1\u10D0\u10D9\u10DD\u10DC\u10E2\u10E0\u10D0\u10E5\u10E2\u10DD \u10E1\u10D0\u10DB\u10E1\u10D0\u10EE\u10E3\u10E0\u10D8",
    "\u10D8\u10DE\u10DD\u10D5\u10D4 \u10E9\u10D4\u10DB\u10D8 \u10EA\u10D4\u10DC\u10E2\u10E0\u10D8",
  ],
  en: ["Mandatory Service", "Deferrals", "Professional Service", "Find My Center"],
};

const MORE_INFO_CHIPS = {
  ka: [
    "\u10DB\u10D4\u10E2\u10D8 \u10D8\u10DC\u10E4\u10DD\u10E0\u10DB\u10D0\u10EA\u10D8\u10D0",
    "\u10E1\u10EE\u10D5\u10D0 \u10D7\u10D4\u10DB\u10D0",
  ],
  en: ["Tell me more", "Different topic"],
};

const CONFIRMATION_CHIPS = {
  ka: [
    "\u10D3\u10D8\u10D0\u10EE",
    "\u10D0\u10E0\u10D0",
    "\u10DB\u10D4\u10E2\u10D8 \u10D8\u10DC\u10E4\u10DD\u10E0\u10DB\u10D0\u10EA\u10D8\u10D0",
  ],
  en: ["Yes", "No", "Tell me more"],
};

const KA_HELP_MARKERS = [
  "\u10E0\u10D8\u10D7 \u10E8\u10D4\u10DB\u10D8\u10EB\u10DA\u10D8\u10D0",
  "\u10E0\u10D8\u10D7 \u10E8\u10D4\u10D2\u10D5\u10D8\u10EB\u10DA\u10D8\u10D0",
  "\u10E0\u10DD\u10D2\u10DD\u10E0 \u10E8\u10D4\u10DB\u10D8\u10EB\u10DA\u10D8\u10D0",
];

const KA_CONFIRMATION_MARKERS = [
  "\u10D3\u10D0\u10D5\u10EF\u10D0\u10D5\u10E8\u10DC",
  "\u10D3\u10D0\u10D5\u10DC\u10D8\u10E8\u10DC",
  "\u10E9\u10D0\u10D5\u10DC\u10D8\u10E8\u10DC",
  "\u10D3\u10D0\u10D3\u10D0\u10E1\u10E2\u10E3\u10E0",
  "\u10D2\u10E1\u10E3\u10E0\u10D7",
  "\u10D2\u10D8\u10DC\u10D3\u10D0\u10D7",
  "\u10D2\u10DC\u10D4\u10D1\u10D0\u10D5\u10D7",
  "\u10E8\u10D4\u10D8\u10EB\u10DA\u10D4\u10D1\u10D0 \u10D3\u10D0\u10D5",
  "\u10E3\u10DC\u10D3\u10D0 \u10D3\u10D0\u10D5",
];

function chipsFor(language, group) {
  return group[language === "ka" ? "ka" : "en"];
}

function includesAny(text, markers) {
  return markers.some((marker) => text.includes(marker));
}

function isOpenHelpQuestion(text, language) {
  if (language === "ka") return includesAny(text, KA_HELP_MARKERS);
  return /\bhow can (?:i|we) help\b/.test(text) || /\bwhat can (?:i|we) help\b/.test(text);
}

function isConfirmationQuestion(text, language) {
  if (!text.includes("?")) return false;
  if (language === "ka") return includesAny(text, KA_CONFIRMATION_MARKERS);

  return /\b(?:should|shall) i\b/.test(text) ||
    /(?:^|[.!?]\s*)(?:do you want|would you like|want me to|should we|shall we)\b/.test(text) ||
    /\b(?:confirm this|confirm that|confirm the booking|add this|save this)\b/.test(text);
}

export function getSuggestedReplies({ messages, isThinking, language }) {
  if (isThinking) return [];

  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.role === "user" || lastMsg.role === "ai-stream") return [];
  if (Array.isArray(lastMsg.blocks) && lastMsg.blocks.some((block) => block.type === "follow_up_chips")) return [];

  const text = (lastMsg.text || "").toLowerCase();
  const userCount = messages.filter((message) => message.role === "user").length;

  if (userCount === 0 || isOpenHelpQuestion(text, language)) {
    return chipsFor(language, TOPIC_CHIPS);
  }

  if (text.includes("gel") || text.includes("\u10DA\u10D0\u10E0") || text.includes("months") || text.includes("\u10D7\u10D5\u10D4")) {
    return chipsFor(language, MORE_INFO_CHIPS);
  }

  if (isConfirmationQuestion(text, language)) {
    return chipsFor(language, CONFIRMATION_CHIPS);
  }

  return [];
}
