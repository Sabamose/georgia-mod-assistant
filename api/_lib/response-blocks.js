const SOURCE_URLS = {
  mod: "https://mod.gov.ge",
  conscript: "https://conscript.mod.gov.ge",
};

const INTENTS = {
  handoff: {
    en: ["urgent", "complex", "legal", "lawyer", "hotline", "call", "personal case"],
    ka: ["\u10D2\u10D0\u10D3\u10D0\u10E3\u10D3\u10D4\u10D1", "\u10E0\u10D7\u10E3\u10DA", "\u10D8\u10E3\u10E0\u10D8\u10D3", "\u10D0\u10D3\u10D5\u10DD\u10D9\u10D0\u10E2", "\u10EA\u10EE\u10D4\u10DA\u10D8 \u10EE\u10D0\u10D6", "\u10D3\u10D0\u10E0\u10D4\u10D9"],
  },
  mandatory: {
    en: ["mandatory service", "conscription", "call-up", "serve", "duration", "age"],
    ka: ["\u10E1\u10D0\u10D5\u10D0\u10DA\u10D3\u10D4\u10D1\u10E3\u10DA", "\u10D2\u10D0\u10EC\u10D5\u10D4\u10D5", "\u10E1\u10D0\u10DB\u10EE\u10D4\u10D3\u10E0\u10DD \u10E1\u10D0\u10DB\u10E1\u10D0\u10EE\u10E3\u10E0", "\u10D5\u10D0\u10D3\u10D0", "\u10D0\u10E1\u10D0\u10D9"],
  },
  deferral: {
    en: ["deferral", "defer", "student", "gel", "5,000"],
    ka: ["\u10D2\u10D0\u10D3\u10D0\u10D5\u10D0\u10D3", "\u10E1\u10E2\u10E3\u10D3\u10D4\u10DC\u10E2", "\u10DA\u10D0\u10E0", "5,000"],
  },
  exemption: {
    en: ["exemption", "exempt", "medical", "health", "unfit", "commission"],
    ka: ["\u10D2\u10D0\u10D7\u10D0\u10D5\u10D8\u10E1\u10E3\u10E4", "\u10E1\u10D0\u10DB\u10D4\u10D3\u10D8\u10EA\u10D8\u10DC", "\u10EF\u10D0\u10DC\u10DB\u10E0\u10D7\u10D4\u10DA", "\u10E3\u10D5\u10D0\u10E0\u10D2\u10D8\u10E1"],
  },
  professional: {
    en: ["professional", "contract", "career", "salary", "benefits"],
    ka: ["\u10E1\u10D0\u10D9\u10DD\u10DC\u10E2\u10E0\u10D0\u10E5\u10E2", "\u10DE\u10E0\u10DD\u10E4\u10D4\u10E1\u10D8\u10E3\u10DA", "\u10D9\u10D0\u10E0\u10D8\u10D4\u10E0", "\u10EE\u10D4\u10DA\u10E4\u10D0\u10E1"],
  },
  center: {
    en: ["center", "branch", "address", "nearest", "office", "location"],
    ka: ["\u10EA\u10D4\u10DC\u10E2\u10E0", "\u10DB\u10D8\u10E1\u10D0\u10DB\u10D0\u10E0\u10D7", "\u10D2\u10D0\u10DC\u10E7\u10DD\u10E4\u10D8\u10DA", "\u10E4\u10D8\u10DA\u10D8\u10D0\u10DA"],
  },
  appointment: {
    en: ["appointment", "book", "visit", "meet", "apply", "application"],
    ka: ["\u10D3\u10D0\u10EF\u10D0\u10D5\u10E8\u10DC", "\u10D5\u10D8\u10D6\u10D8\u10E2", "\u10DB\u10D8\u10E1\u10D5\u10DA", "\u10E9\u10D0\u10EC\u10D4\u10E0", "\u10D2\u10D0\u10DC\u10EA\u10EE\u10D0\u10D3"],
  },
};

function t(language, ka, en) {
  return language === "ka" ? ka : en;
}

function normalizeText(text) {
  return String(text || "").toLowerCase();
}

function latestUserText(messages) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") return messages[index].content || "";
  }
  return "";
}

function hasAny(text, words) {
  return words.some((word) => text.includes(word));
}

export function classifyIntent({ messages, assistantText = "" }) {
  const text = normalizeText(`${latestUserText(messages)} ${assistantText}`);
  for (const [intent, words] of Object.entries(INTENTS)) {
    if (hasAny(text, [...words.en, ...words.ka])) return intent;
  }
  return "general";
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
      chip("\u10D8\u10DE\u10DD\u10D5\u10D4 \u10E9\u10D4\u10DB\u10D8 \u10EA\u10D4\u10DC\u10E2\u10E0\u10D8", "\u10E1\u10D0\u10DB\u10EE\u10D4\u10D3\u10E0\u10DD \u10D0\u10E6\u10E0\u10D8\u10EA\u10EE\u10D5\u10D8\u10E1 \u10EA\u10D4\u10DC\u10E2\u10E0\u10D8 \u10E1\u10D0\u10D3 \u10D0\u10E0\u10D8\u10E1?"),
    ]
    : [
      chip("Mandatory Service", "Mandatory Service"),
      chip("Deferrals", "Deferrals"),
      chip("Professional Service", "Professional Service"),
      chip("Find My Center", "Where is my military registration center?"),
    ];
}

function intentChips(intent, language) {
  if (language === "ka") {
    switch (intent) {
      case "deferral":
        return [
          chip("\u10E4\u10D0\u10E1\u10D8\u10D0\u10DC\u10D8 \u10D2\u10D0\u10D3\u10D0\u10D5\u10D0\u10D3\u10D4\u10D1\u10D0", "\u10E4\u10D0\u10E1\u10D8\u10D0\u10DC\u10D8 \u10D2\u10D0\u10D3\u10D0\u10D5\u10D0\u10D3\u10D4\u10D1\u10D0 \u10E0\u10DD\u10D2\u10DD\u10E0 \u10EE\u10D3\u10D4\u10D1\u10D0?"),
          chip("\u10E1\u10E2\u10E3\u10D3\u10D4\u10DC\u10E2\u10D8\u10E1 \u10D2\u10D0\u10D3\u10D0\u10D5\u10D0\u10D3\u10D4\u10D1\u10D0", "\u10E1\u10E2\u10E3\u10D3\u10D4\u10DC\u10E2\u10D8\u10E1 \u10D2\u10D0\u10D3\u10D0\u10D5\u10D0\u10D3\u10D4\u10D1\u10D0 \u10D5\u10D8\u10E1 \u10D4\u10D9\u10E3\u10D7\u10D5\u10DC\u10D8\u10E1?"),
          chip("\u10EA\u10D4\u10DC\u10E2\u10E0\u10E8\u10D8 \u10D5\u10D8\u10D6\u10D8\u10E2\u10D8\u10E1 \u10D3\u10D0\u10EF\u10D0\u10D5\u10E8\u10DC\u10D0", "\u10D2\u10D0\u10D3\u10D0\u10D5\u10D0\u10D3\u10D4\u10D1\u10D8\u10E1 \u10D7\u10D4\u10DB\u10D0\u10D6\u10D4 \u10EA\u10D4\u10DC\u10E2\u10E0\u10E8\u10D8 \u10D5\u10D8\u10D6\u10D8\u10E2\u10D8 \u10DB\u10D8\u10DC\u10D3\u10D0."),
        ];
      case "mandatory":
        return [
          chip("\u10D5\u10D0\u10D3\u10D4\u10D1\u10D8 \u10D3\u10D0 \u10D0\u10E1\u10D0\u10D9\u10D8", "\u10E1\u10D0\u10D5\u10D0\u10DA\u10D3\u10D4\u10D1\u10E3\u10DA\u10DD \u10E1\u10D0\u10DB\u10E1\u10D0\u10EE\u10E3\u10E0\u10D8\u10E1 \u10D5\u10D0\u10D3\u10D4\u10D1\u10D8 \u10D3\u10D0 \u10D0\u10E1\u10D0\u10D9\u10D8 \u10E0\u10D0 \u10D0\u10E0\u10D8\u10E1?"),
          chip("\u10D2\u10D0\u10D3\u10D0\u10D5\u10D0\u10D3\u10D4\u10D1\u10D8\u10E1 \u10D5\u10D0\u10E0\u10D8\u10D0\u10DC\u10E2\u10D4\u10D1\u10D8", "\u10E0\u10D0 \u10D2\u10D0\u10D3\u10D0\u10D5\u10D0\u10D3\u10D4\u10D1\u10D8\u10E1 \u10D5\u10D0\u10E0\u10D8\u10D0\u10DC\u10E2\u10D4\u10D1\u10D8 \u10D0\u10E0\u10E1\u10D4\u10D1\u10DD\u10D1\u10E1?"),
          chip("\u10EA\u10D4\u10DC\u10E2\u10E0\u10D8\u10E1 \u10DE\u10DD\u10D5\u10DC\u10D0", "\u10E1\u10D0\u10DB\u10EE\u10D4\u10D3\u10E0\u10DD \u10D0\u10E6\u10E0\u10D8\u10EA\u10EE\u10D5\u10D8\u10E1 \u10EA\u10D4\u10DC\u10E2\u10E0\u10D8 \u10E1\u10D0\u10D3 \u10D0\u10E0\u10D8\u10E1?"),
        ];
      case "exemption":
        return [
          chip("\u10E1\u10D0\u10DB\u10D4\u10D3\u10D8\u10EA\u10D8\u10DC\u10DD \u10D9\u10DD\u10DB\u10D8\u10E1\u10D8\u10D0", "\u10E1\u10D0\u10DB\u10D4\u10D3\u10D8\u10EA\u10D8\u10DC\u10DD \u10D9\u10DD\u10DB\u10D8\u10E1\u10D8\u10D0 \u10E0\u10DD\u10D2\u10DD\u10E0 \u10D0\u10E4\u10D0\u10E1\u10D4\u10D1\u10E1?"),
          chip("\u10E1\u10D0\u10ED\u10D8\u10E0\u10DD \u10D3\u10DD\u10D9\u10E3\u10DB\u10D4\u10DC\u10E2\u10D4\u10D1\u10D8", "\u10D2\u10D0\u10D7\u10D0\u10D5\u10D8\u10E1\u10E3\u10E4\u10DA\u10D4\u10D1\u10D8\u10E1\u10D7\u10D5\u10D8\u10E1 \u10E0\u10D0 \u10E1\u10D0\u10D1\u10E3\u10D7\u10D4\u10D1\u10D8 \u10DB\u10ED\u10D8\u10E0\u10D3\u10D4\u10D1\u10D0?"),
          chip("\u10D9\u10DD\u10DC\u10E1\u10E3\u10DA\u10E2\u10D0\u10EA\u10D8\u10D8\u10E1 \u10D3\u10D0\u10EF\u10D0\u10D5\u10E8\u10DC\u10D0", "\u10D2\u10D0\u10D7\u10D0\u10D5\u10D8\u10E1\u10E3\u10E4\u10DA\u10D4\u10D1\u10D8\u10E1 \u10D7\u10D4\u10DB\u10D0\u10D6\u10D4 \u10D9\u10DD\u10DC\u10E1\u10E3\u10DA\u10E2\u10D0\u10EA\u10D8\u10D8\u10E1 \u10D5\u10D8\u10D6\u10D8\u10E2\u10D8 \u10DB\u10D8\u10DC\u10D3\u10D0."),
        ];
      case "professional":
        return [
          chip("\u10DB\u10DD\u10D7\u10EE\u10DD\u10D5\u10DC\u10D4\u10D1\u10D8", "\u10E1\u10D0\u10D9\u10DD\u10DC\u10E2\u10E0\u10D0\u10E5\u10E2\u10DD \u10E1\u10D0\u10DB\u10E1\u10D0\u10EE\u10E3\u10E0\u10D8\u10E1 \u10DB\u10DD\u10D7\u10EE\u10DD\u10D5\u10DC\u10D4\u10D1\u10D8 \u10E0\u10D0 \u10D0\u10E0\u10D8\u10E1?"),
          chip("\u10EE\u10D4\u10DA\u10E4\u10D0\u10E1\u10D8 \u10D3\u10D0 \u10E1\u10D0\u10E0\u10D2\u10D4\u10D1\u10D4\u10DA\u10D8", "\u10E1\u10D0\u10D9\u10DD\u10DC\u10E2\u10E0\u10D0\u10E5\u10E2\u10DD \u10E1\u10D0\u10DB\u10E1\u10D0\u10EE\u10E3\u10E0\u10E8\u10D8 \u10EE\u10D4\u10DA\u10E4\u10D0\u10E1\u10D8 \u10D3\u10D0 \u10E1\u10D0\u10E0\u10D2\u10D4\u10D1\u10DA\u10D4\u10D1\u10D8 \u10E0\u10D0 \u10D0\u10E0\u10D8\u10E1?"),
          chip("\u10D5\u10D8\u10D6\u10D8\u10E2\u10D8\u10E1 \u10D3\u10D0\u10EF\u10D0\u10D5\u10E8\u10DC\u10D0", "\u10E1\u10D0\u10D9\u10DD\u10DC\u10E2\u10E0\u10D0\u10E5\u10E2\u10DD \u10E1\u10D0\u10DB\u10E1\u10D0\u10EE\u10E3\u10E0\u10D8\u10E1 \u10D7\u10D4\u10DB\u10D0\u10D6\u10D4 \u10D5\u10D8\u10D6\u10D8\u10E2\u10D8 \u10DB\u10D8\u10DC\u10D3\u10D0."),
        ];
      case "center":
      case "appointment":
      case "handoff":
        return [
          chip("\u10E0\u10D0 \u10E1\u10D0\u10D1\u10E3\u10D7\u10D4\u10D1\u10D8 \u10DB\u10ED\u10D8\u10E0\u10D3\u10D4\u10D1\u10D0?", "\u10E1\u10D0\u10DB\u10EE\u10D4\u10D3\u10E0\u10DD \u10D0\u10E6\u10E0\u10D8\u10EA\u10EE\u10D5\u10D8\u10E1 \u10EA\u10D4\u10DC\u10E2\u10E0\u10E8\u10D8 \u10DB\u10D8\u10E1\u10D0\u10E1\u10D5\u10DA\u10D4\u10DA\u10D0\u10D3 \u10E0\u10D0 \u10E1\u10D0\u10D1\u10E3\u10D7\u10D4\u10D1\u10D8\u10D0 \u10E1\u10D0\u10ED\u10D8\u10E0\u10DD?"),
          chip("\u10EA\u10EE\u10D4\u10DA\u10D8 \u10EE\u10D0\u10D6\u10D8", "\u10D7\u10D0\u10D5\u10D3\u10D0\u10EA\u10D5\u10D8\u10E1 \u10E1\u10D0\u10DB\u10D8\u10DC\u10D8\u10E1\u10E2\u10E0\u10DD\u10E1 \u10EA\u10EE\u10D4\u10DA\u10D8 \u10EE\u10D0\u10D6\u10D8 \u10DB\u10DD\u10DB\u10D4\u10EA\u10D8\u10D7."),
          chip("\u10E1\u10EE\u10D5\u10D0 \u10D7\u10D4\u10DB\u10D0", "\u10E1\u10EE\u10D5\u10D0 \u10D7\u10D4\u10DB\u10D0"),
        ];
      default:
        return topicChips(language);
    }
  }

  switch (intent) {
    case "deferral":
      return [
        chip("Paid deferral", "How does paid deferral work?"),
        chip("Student deferral", "Who qualifies for student deferral?"),
        chip("Book center visit", "I want to book a center visit about deferral."),
      ];
    case "mandatory":
      return [
        chip("Durations and age", "What are the mandatory service age and durations?"),
        chip("Deferral options", "What deferral options exist?"),
        chip("Find my center", "Where is my military registration center?"),
      ];
    case "exemption":
      return [
        chip("Medical commission", "How does the medical commission assess fitness?"),
        chip("Required documents", "What documents are needed for exemption?"),
        chip("Book consultation", "I want to book a consultation about exemption."),
      ];
    case "professional":
      return [
        chip("Requirements", "What are the requirements for professional service?"),
        chip("Salary and benefits", "What are the salary and benefits for contract service?"),
        chip("Book visit", "I want to book a visit about contract service."),
      ];
    case "center":
    case "appointment":
    case "handoff":
      return [
        chip("Required documents", "What documents are needed when visiting a military registration center?"),
        chip("Hotline", "Give me the Ministry of Defense hotline."),
        chip("Different topic", "Different topic"),
      ];
    default:
      return topicChips(language);
  }
}

function contactCardBlock(language) {
  return {
    type: "contact_card",
    title: t(language, "\u10EA\u10EE\u10D4\u10DA\u10D8 \u10EE\u10D0\u10D6\u10D8", "Hotline"),
    contacts: [
      {
        label: t(language, "\u10D7\u10D0\u10D5\u10D3\u10D0\u10EA\u10D5\u10D8\u10E1 \u10E1\u10D0\u10DB\u10D8\u10DC\u10D8\u10E1\u10E2\u10E0\u10DD", "Ministry of Defense"),
        value: "+995 32 2 72 10 00",
        href: "tel:+995322721000",
      },
      {
        label: t(language, "\u10E1\u10D0\u10DB\u10E3\u10E8\u10D0\u10DD \u10E1\u10D0\u10D0\u10D7\u10D4\u10D1\u10D8", "Working hours"),
        value: t(language, "\u10DD\u10E0\u10E8\u10D0\u10D1\u10D0\u10D7\u10D8-\u10DE\u10D0\u10E0\u10D0\u10E1\u10D9\u10D4\u10D5\u10D8, 09:00-18:00", "Monday-Friday, 09:00-18:00"),
      },
    ],
  };
}

function sourceBlock(language) {
  return {
    type: "sources",
    title: t(language, "\u10DD\u10E4\u10D8\u10EA\u10D8\u10D0\u10DA\u10E3\u10E0\u10D8 \u10EC\u10E7\u10D0\u10E0\u10DD\u10D4\u10D1\u10D8", "Official sources"),
    items: [
      {
        label: t(language, "\u10D7\u10D0\u10D5\u10D3\u10D0\u10EA\u10D5\u10D8\u10E1 \u10E1\u10D0\u10DB\u10D8\u10DC\u10D8\u10E1\u10E2\u10E0\u10DD", "Ministry of Defense"),
        detail: t(language, "\u10DD\u10E4\u10D8\u10EA\u10D8\u10D0\u10DA\u10E3\u10E0\u10D8 \u10D5\u10D4\u10D1\u10D2\u10D5\u10D4\u10E0\u10D3\u10D8 \u10D3\u10D0 \u10E1\u10D0\u10D9\u10DD\u10DC\u10E2\u10D0\u10E5\u10E2\u10DD \u10D8\u10DC\u10E4\u10DD\u10E0\u10DB\u10D0\u10EA\u10D8\u10D0", "Official website and contact information"),
        href: SOURCE_URLS.mod,
      },
      {
        label: t(language, "\u10D2\u10D0\u10EC\u10D5\u10D4\u10D5\u10D8\u10E1\u10D0 \u10D3\u10D0 \u10D0\u10E6\u10E0\u10D8\u10EA\u10EE\u10D5\u10D8\u10E1 \u10E1\u10D0\u10DB\u10E1\u10D0\u10EE\u10E3\u10E0\u10D8", "Conscription and registration"),
        detail: t(language, "\u10E1\u10D0\u10DB\u10EE\u10D4\u10D3\u10E0\u10DD \u10D0\u10E6\u10E0\u10D8\u10EA\u10EE\u10D5\u10D8\u10E1\u10D0 \u10D3\u10D0 \u10E0\u10D4\u10D9\u10E0\u10E3\u10E2\u10D8\u10E0\u10D4\u10D1\u10D8\u10E1 \u10D8\u10DC\u10E4\u10DD\u10E0\u10DB\u10D0\u10EA\u10D8\u10D0", "Military registration and recruiting information"),
        href: SOURCE_URLS.conscript,
      },
    ],
  };
}

function hasBlock(blocks, type) {
  return blocks.some((block) => block?.type === type);
}

export function buildResponseBlocks({ messages, assistantText, language, existingBlocks = [] }) {
  const blocks = [...existingBlocks];
  if (hasBlock(blocks, "appointment_card")) return blocks;

  const intent = classifyIntent({ messages, assistantText });
  if (intent === "handoff" && !hasBlock(blocks, "contact_card")) {
    blocks.push(contactCardBlock(language));
  }

  if (intent !== "general" && !hasBlock(blocks, "sources")) {
    blocks.push(sourceBlock(language));
  }

  if (!hasBlock(blocks, "follow_up_chips")) {
    blocks.push({
      type: "follow_up_chips",
      items: intentChips(intent, language),
    });
  }

  return blocks;
}
