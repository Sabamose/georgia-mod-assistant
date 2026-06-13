const APPOINTMENT_INTENT_RE = /\b(appointment|book|visit|meet|schedule)\b|(\u10D3\u10D0\u10EF\u10D0\u10D5\u10E8\u10DC|\u10D5\u10D8\u10D6\u10D8\u10E2|\u10DB\u10D8\u10E1\u10D5\u10DA|\u10E9\u10D0\u10EC\u10D4\u10E0)/i;

const FIELD_MARKERS = {
  name: /\bfull name\b|(\u10E1\u10E0\u10E3\u10DA\u10D0\u10D3|\u10D2\u10E5\u10D5\u10D8\u10D0\u10D7)/i,
  topic: /\btopic\b|\breason\b|(\u10D7\u10D4\u10DB\u10D0|\u10DB\u10D8\u10D6\u10D4\u10D6)/i,
  city: /\bcity\b|(\u10E5\u10D0\u10DA\u10D0\u10E5|\u10E1\u10D0\u10D3)/i,
  slot: /\bdate\b|\btime\b|(\u10D7\u10D0\u10E0\u10D8\u10E6|\u10D3\u10E0\u10DD)/i,
};

const FIELD_ORDER = ["name", "topic", "city", "slot"];

function t(language, ka, en) {
  return language === "ka" ? ka : en;
}

function contentOf(message) {
  return String(message?.content || "");
}

function chip(label, prompt) {
  return { label, prompt };
}

function topicChips(language) {
  return language === "ka"
    ? [
      chip("\u10E1\u10D0\u10D5\u10D0\u10DA\u10D3\u10D4\u10D1\u10E3\u10DA\u10DD \u10E1\u10D0\u10DB\u10E1\u10D0\u10EE\u10E3\u10E0\u10D8", "\u10E1\u10D0\u10D5\u10D0\u10DA\u10D3\u10D4\u10D1\u10E3\u10DA\u10DD \u10E1\u10D0\u10DB\u10E1\u10D0\u10EE\u10E3\u10E0\u10D8"),
      chip("\u10D2\u10D0\u10D3\u10D0\u10D5\u10D0\u10D3\u10D4\u10D1\u10D0", "\u10D2\u10D0\u10D3\u10D0\u10D5\u10D0\u10D3\u10D4\u10D1\u10D0"),
      chip("\u10E1\u10D0\u10D9\u10DD\u10DC\u10E2\u10E0\u10D0\u10E5\u10E2\u10DD \u10E1\u10D0\u10DB\u10E1\u10D0\u10EE\u10E3\u10E0\u10D8", "\u10E1\u10D0\u10D9\u10DD\u10DC\u10E2\u10E0\u10D0\u10E5\u10E2\u10DD \u10E1\u10D0\u10DB\u10E1\u10D0\u10EE\u10E3\u10E0\u10D8"),
      chip("\u10D2\u10D0\u10D7\u10D0\u10D5\u10D8\u10E1\u10E3\u10E4\u10DA\u10D4\u10D1\u10D0", "\u10D2\u10D0\u10D7\u10D0\u10D5\u10D8\u10E1\u10E3\u10E4\u10DA\u10D4\u10D1\u10D0"),
    ]
    : [
      chip("Mandatory service", "Mandatory service"),
      chip("Deferral", "Deferral"),
      chip("Contract service", "Contract service"),
      chip("Exemption", "Exemption"),
    ];
}

function cityChips(language) {
  return language === "ka"
    ? [
      chip("\u10D7\u10D1\u10D8\u10DA\u10D8\u10E1\u10D8", "\u10D7\u10D1\u10D8\u10DA\u10D8\u10E1\u10D8"),
      chip("\u10D1\u10D0\u10D7\u10E3\u10DB\u10D8", "\u10D1\u10D0\u10D7\u10E3\u10DB\u10D8"),
      chip("\u10E5\u10E3\u10D7\u10D0\u10D8\u10E1\u10D8", "\u10E5\u10E3\u10D7\u10D0\u10D8\u10E1\u10D8"),
      chip("\u10E0\u10E3\u10E1\u10D7\u10D0\u10D5\u10D8", "\u10E0\u10E3\u10E1\u10D7\u10D0\u10D5\u10D8"),
    ]
    : [
      chip("Tbilisi", "Tbilisi"),
      chip("Batumi", "Batumi"),
      chip("Kutaisi", "Kutaisi"),
      chip("Rustavi", "Rustavi"),
    ];
}

function appointmentStarted(messages) {
  return messages.some((message) => message.role === "user" && APPOINTMENT_INTENT_RE.test(contentOf(message)));
}

function fieldAskedByAssistant(text) {
  for (const [field, pattern] of Object.entries(FIELD_MARKERS)) {
    if (pattern.test(text)) return field;
  }
  return null;
}

function collectedFields(messages) {
  const collected = new Set();
  let pendingField = null;

  for (const message of messages) {
    const text = contentOf(message);
    if (message.role === "assistant") {
      pendingField = fieldAskedByAssistant(text);
    } else if (message.role === "user" && pendingField && text.trim()) {
      collected.add(pendingField);
      pendingField = null;
    }
  }

  return collected;
}

function nextMissingField(messages) {
  const collected = collectedFields(messages);
  return FIELD_ORDER.find((field) => !collected.has(field)) || null;
}

function buildQuestion(field, language) {
  switch (field) {
    case "name":
      return t(language, "\u10E0\u10DD\u10D2\u10DD\u10E0 \u10D2\u10E5\u10D5\u10D8\u10D0\u10D7 \u10E1\u10E0\u10E3\u10DA\u10D0\u10D3?", "What is your full name?");
    case "topic":
      return t(language, "\u10E0\u10D0 \u10D7\u10D4\u10DB\u10D0\u10D6\u10D4 \u10D2\u10E1\u10E3\u10E0\u10D7 \u10D5\u10D8\u10D6\u10D8\u10E2\u10D8?", "What is the topic of your visit?");
    case "city":
      return t(language, "\u10E0\u10DD\u10DB\u10D4\u10DA \u10E5\u10D0\u10DA\u10D0\u10E5\u10E8\u10D8 \u10D2\u10E1\u10E3\u10E0\u10D7 \u10DB\u10D8\u10E1\u10D5\u10DA\u10D0?", "Which city would you like to visit?");
    case "slot":
      return t(language, "\u10E0\u10DD\u10DB\u10D4\u10DA \u10D7\u10D0\u10E0\u10D8\u10E6\u10E1\u10D0 \u10D3\u10D0 \u10D3\u10E0\u10DD\u10E1 \u10D2\u10D8\u10E0\u10E9\u10D4\u10D5\u10DC\u10D8\u10D0\u10D7 \u10D5\u10D8\u10D6\u10D8\u10E2\u10D8?", "What date and time would you prefer for the visit?");
    default:
      return "";
  }
}

function blocksForField(field, language) {
  if (field === "topic") {
    return [{
      type: "follow_up_chips",
      items: topicChips(language),
    }];
  }

  if (field === "city") {
    return [{
      type: "follow_up_chips",
      items: cityChips(language),
    }];
  }

  if (field === "slot") {
    return [{
      type: "follow_up_chips",
      items: [
        chip(t(language, "\u10E1\u10D0\u10DB\u10E3\u10E8\u10D0\u10DD \u10E1\u10D0\u10D0\u10D7\u10D4\u10D1\u10D8", "Working hours"), t(language, "\u10E1\u10D0\u10DB\u10E3\u10E8\u10D0\u10DD \u10E1\u10D0\u10D0\u10D7\u10D4\u10D1\u10D8 \u10E0\u10D0 \u10D0\u10E0\u10D8\u10E1?", "What are the working hours?")),
        chip(t(language, "\u10D3\u10D0\u10E0\u10D4\u10D9\u10D5\u10D0", "Call"), t(language, "\u10EA\u10EE\u10D4\u10DA\u10D8 \u10EE\u10D0\u10D6\u10D8 \u10DB\u10DD\u10DB\u10D4\u10EA\u10D8\u10D7.", "Give me the hotline.")),
      ],
    }];
  }

  return [];
}

export function buildAppointmentIntakeReply(messages, language) {
  if (!appointmentStarted(messages)) return null;

  const field = nextMissingField(messages);
  if (!field) return null;

  return {
    text: buildQuestion(field, language),
    journey: "appointment_intake",
    blocks: blocksForField(field, language),
  };
}
