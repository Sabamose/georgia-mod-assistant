import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import "./App.css";
import { buildCenterLookupConversation, getCenterLookupReply } from "./centerLookup.js";

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || "").trim();
const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
const THINKING_MIN_MS = 800;

function getClientConfigError(language) {
  return language === "ka"
    ? "დემო ჯერ არ არის კონფიგურირებული. აკლია Supabase-ის საჯარო პარამეტრები."
    : "This demo is not configured yet. Public Supabase settings are missing.";
}

/* Inline SVG flags — emoji flags don't render on Windows */
const FlagEN = () => (
  <svg width="20" height="14" viewBox="0 0 60 42" style={{ borderRadius: 2, display: "block" }}>
    <rect width="60" height="42" fill="#012169" />
    <path d="M0 0L60 42M60 0L0 42" stroke="#fff" strokeWidth="7" />
    <path d="M0 0L60 42M60 0L0 42" stroke="#C8102E" strokeWidth="4" clipPath="polygon(30 0,60 0,60 21,0 21,0 42,30 42)" />
    <path d="M30 0V42M0 21H60" stroke="#fff" strokeWidth="9" />
    <path d="M30 0V42M0 21H60" stroke="#C8102E" strokeWidth="5" />
  </svg>
);
const FlagKA = () => (
  <svg width="20" height="14" viewBox="0 0 300 200" style={{ borderRadius: 2, display: "block" }}>
    <rect width="300" height="200" fill="#fff" />
    <rect x="130" width="40" height="200" fill="#E8423F" />
    <rect y="80" width="300" height="40" fill="#E8423F" />
    <g fill="#E8423F">
      <rect x="35" y="15" width="10" height="50" /><rect x="15" y="30" width="50" height="10" />
      <rect x="185" y="15" width="10" height="50" /><rect x="165" y="30" width="50" height="10" />
      <rect x="35" y="135" width="10" height="50" /><rect x="15" y="150" width="50" height="10" />
      <rect x="185" y="135" width="10" height="50" /><rect x="165" y="150" width="50" height="10" />
    </g>
  </svg>
);

const LANGUAGES = [
  { code: "ka", displayCode: "GE", label: "\u10E5\u10D0\u10E0\u10D7\u10E3\u10DA\u10D8", Flag: FlagKA },
  { code: "en", displayCode: "EN", label: "English", Flag: FlagEN },
];

const T = {
  en: {
    welcome: "Welcome",
    howHelp: "How can we help you today?",
    newConvo: "New Conversation",
    poweredBy: "Powered by",
    ministry: "Ministry of Defense",
    aiAssistant: "AI Assistant",
    connecting: "Connecting...",
    chatWith: "Chat with Nika",
    offline: "Offline",
    typePlaceholder: "Type your message...",
    tryAgain: "Try again",
    mandatoryTitle: "Mandatory Service",
    mandatoryDesc: "Service obligations & registration",
    contractTitle: "Professional Service",
    contractDesc: "Career opportunities & benefits",
    deferralTitle: "Deferrals & Exemptions",
    deferralDesc: "Student, medical, other grounds",
    centerTitle: "Find My Center",
    centerDesc: "Exact branch address & directions",
    faqTitle: "FAQ",
    faqDesc: "Common questions answered",
  },
  ka: {
    welcome: "\u10DB\u10DD\u10D2\u10D4\u10E1\u10D0\u10DA\u10DB\u10D4\u10D1\u10D8\u10D7!",
    howHelp: "\u10E0\u10D8\u10D7 \u10E8\u10D4\u10D2\u10D5\u10D8\u10EB\u10DA\u10D8\u10D0 \u10D3\u10D0\u10D2\u10D4\u10EE\u10DB\u10D0\u10E0\u10DD\u10D7?",
    newConvo: "\u10D0\u10EE\u10D0\u10DA\u10D8 \u10E1\u10D0\u10E3\u10D1\u10D0\u10E0\u10D8",
    poweredBy: "\u10E8\u10D4\u10DB\u10E3\u10E8\u10D0\u10D5\u10D4\u10D1\u10E3\u10DA\u10D8\u10D0",
    ministry: "\u10D7\u10D0\u10D5\u10D3\u10D0\u10EA\u10D5\u10D8\u10E1 \u10E1\u10D0\u10DB\u10D8\u10DC\u10D8\u10E1\u10E2\u10E0\u10DD",
    aiAssistant: "\u10EA\u10D8\u10E4\u10E0\u10E3\u10DA\u10D8 \u10D0\u10E1\u10D8\u10E1\u10E2\u10D4\u10DC\u10E2\u10D8",
    connecting: "\u10DB\u10D8\u10DB\u10D3\u10D8\u10DC\u10D0\u10E0\u10D4\u10DD\u10D1\u10E1 \u10D9\u10D0\u10D5\u10E8\u10D8\u10E0\u10D8...",
    chatWith: "\u10E9\u10D0\u10E2\u10D8 \u10DC\u10D8\u10D9\u10D0\u10E1\u10D7\u10D0\u10DC",
    offline: "\u10DD\u10E4\u10DA\u10D0\u10D8\u10DC",
    typePlaceholder: "\u10E8\u10D4\u10D8\u10E7\u10D5\u10D0\u10DC\u10D4\u10D7 \u10E8\u10D4\u10E2\u10E7\u10DD\u10D1\u10D8\u10DC\u10D4\u10D1\u10D0...",
    tryAgain: "\u10D7\u10D0\u10D5\u10D8\u10D3\u10D0\u10DC \u10EA\u10D3\u10D0",
    mandatoryTitle: "\u10E1\u10D0\u10D5\u10D0\u10DA\u10D3\u10D4\u10D1\u10E3\u10DA\u10DD \u10E1\u10D0\u10DB\u10E1\u10D0\u10EE\u10E3\u10E0\u10D8",
    mandatoryDesc: "\u10E1\u10D0\u10DB\u10E1\u10D0\u10EE\u10E3\u10E0\u10D8\u10E1 \u10D5\u10D0\u10DA\u10D3\u10D4\u10D1\u10E3\u10DA\u10D4\u10D1\u10D4\u10D1\u10D8 \u10D3\u10D0 \u10E0\u10D4\u10D2\u10D8\u10E1\u10E2\u10E0\u10D0\u10EA\u10D8\u10D0",
    contractTitle: "\u10E1\u10D0\u10D9\u10DD\u10DC\u10E2\u10E0\u10D0\u10E5\u10E2\u10DD \u10E1\u10D0\u10DB\u10E1\u10D0\u10EE\u10E3\u10E0\u10D8",
    contractDesc: "\u10D9\u10D0\u10E0\u10D8\u10D4\u10E0\u10E3\u10DA\u10D8 \u10E8\u10D4\u10E1\u10D0\u10EB\u10DA\u10D4\u10D1\u10DA\u10DD\u10D1\u10D4\u10D1\u10D8",
    deferralTitle: "\u10D2\u10D0\u10D3\u10D0\u10D5\u10D0\u10D3\u10D4\u10D1\u10D0 \u10D3\u10D0 \u10D2\u10D0\u10D7\u10D0\u10D5\u10D8\u10E1\u10E3\u10E4\u10DA\u10D4\u10D1\u10D0",
    deferralDesc: "\u10E1\u10E2\u10E3\u10D3\u10D4\u10DC\u10E2\u10E3\u10E0\u10D8, \u10E1\u10D0\u10DB\u10D4\u10D3\u10D8\u10EA\u10D8\u10DC\u10DD, \u10E1\u10EE\u10D5\u10D0 \u10E1\u10D0\u10E4\u10E3\u10EB\u10D5\u10D4\u10DA\u10D8",
    centerTitle: "\u10D8\u10DE\u10DD\u10D5\u10D4 \u10E9\u10D4\u10DB\u10D8 \u10EA\u10D4\u10DC\u10E2\u10E0\u10D8",
    centerDesc: "\u10D6\u10E3\u10E1\u10E2\u10D8 \u10DB\u10D8\u10E1\u10D0\u10DB\u10D0\u10E0\u10D7\u10D8 \u10D3\u10D0 \u10D9\u10D5\u10DA\u10D0\u10D5\u10D8",
    faqTitle: "\u10EE\u10E8\u10D8\u10E0\u10D0\u10D3 \u10D3\u10D0\u10E1\u10DB\u10E3\u10DA\u10D8 \u10D9\u10D8\u10D7\u10EE\u10D5\u10D4\u10D1\u10D8",
    faqDesc: "\u10DE\u10D0\u10E1\u10E3\u10EE\u10D4\u10D1\u10D8 \u10D2\u10D0\u10D5\u10E0\u10EA\u10D4\u10DA \u10D9\u10D8\u10D7\u10EE\u10D5\u10D4\u10D1\u10D6\u10D4",
  },
};

const SERVICES = [
  { id: "mandatory", icon: "shield", titleKey: "mandatoryTitle", descKey: "mandatoryDesc" },
  { id: "contract", icon: "briefcase", titleKey: "contractTitle", descKey: "contractDesc" },
  { id: "deferral", icon: "clock", titleKey: "deferralTitle", descKey: "deferralDesc" },
  { id: "center", icon: "mapPin", titleKey: "centerTitle", descKey: "centerDesc" },
];

const SERVICE_SEED_PROMPTS = {
  en: {
    mandatory: "I need information about mandatory military service.",
    contract: "I need information about professional contract military service.",
    deferral: "I need information about deferrals and exemptions.",
    center: "I want to find my military registration center.",
  },
  ka: {
    mandatory: "სავალდებულო სამხედრო სამსახურის შესახებ ინფორმაცია მინდა.",
    contract: "საკონტრაქტო სამხედრო სამსახურის შესახებ ინფორმაცია მინდა.",
    deferral: "გადავადებისა და გათავისუფლების შესახებ ინფორმაცია მინდა.",
    center: "მინდა ვიპოვო ჩემი სამხედრო აღრიცხვის ცენტრი.",
  },
};

function getServiceSeedPrompt(serviceId, language) {
  const prompts = SERVICE_SEED_PROMPTS[language] || SERVICE_SEED_PROMPTS.en;
  return prompts[serviceId] || SERVICE_SEED_PROMPTS.en.mandatory;
}

/* Service SVG Icons */
function ServiceIcon({ type, size = 28 }) {
  const s = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" };
  const icons = {
    shield: <svg {...s}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
    briefcase: <svg {...s}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /><path d="M12 12v.01" /></svg>,
    clock: <svg {...s}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    users: <svg {...s}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>,
    mapPin: <svg {...s}><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
    help: <svg {...s}><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  };
  return icons[type] || null;
}

function formatTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getSafeHref(href, options = {}) {
  const { allowMailto = false, allowTel = false } = options;
  if (typeof href !== "string") return null;

  const trimmed = href.trim();
  if (!trimmed) return null;

  if (allowMailto && trimmed.startsWith("mailto:")) {
    return trimmed;
  }

  if (allowTel && trimmed.startsWith("tel:")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

/* Pre-process paragraph text */
function preprocessText(text) {
  if (!text) return text;
  if (/^[\s]*[-•]\s+/m.test(text) || /^[\s]*\d+[.)]\s+/m.test(text)) return text;
  const lines = text.split("\n");
  const result = [];
  for (const line of lines) {
    const colonListMatch = line.match(/^(.+?:\s*)(.+,\s+.+)/);
    if (colonListMatch) {
      const intro = colonListMatch[1].trim();
      const rest = colonListMatch[2];
      const items = rest.split(/,\s+/).flatMap(s => s.split(/\s+and\s+|\s+და\s+/));
      if (items.length >= 2) {
        result.push(intro);
        for (const item of items) {
          const cleaned = item.replace(/\.\s*$/, "").trim();
          if (cleaned) result.push(`- ${cleaned}`);
        }
        continue;
      }
    }
    const sentences = line.split(/(?<=\.)\s+/).filter(s => s.trim());
    if (sentences.length >= 3 && !line.startsWith("#")) {
      for (const s of sentences) result.push(`- ${s.replace(/\.\s*$/, "")}`);
      continue;
    }
    result.push(line);
  }
  return result.join("\n");
}

function normalizeComparableText(text) {
  return (text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getStructuredTextSet(blocks) {
  const values = new Set();

  for (const block of blocks || []) {
    if (block.type === "summary" && block.text) {
      values.add(normalizeComparableText(block.text));
    }

    if (block.type === "verification_note" && Array.isArray(block.items)) {
      for (const item of block.items) {
        values.add(normalizeComparableText(item));
      }
    }
  }

  return values;
}

function isLowValuePreamble(paragraph, structuredTexts) {
  const normalized = normalizeComparableText(paragraph);
  if (!normalized) return true;
  if (structuredTexts.has(normalized)) return true;

  const bannedLeadPatterns = [
    /^(სტატუსი|შედეგი|დასკვნა)\s*:/i,
    /^(status|result|conclusion)\s*:/i,
    /^ინფორმაციის მიხედვით[, ]/i,
    /^მოკლედ[, ]/i,
    /^ზოგადად[, ]/i,
    /^based on the information[, ]/i,
    /^in summary[, ]/i,
    /^generally[, ]/i,
  ];

  if (bannedLeadPatterns.some((pattern) => pattern.test(paragraph.trim()))) {
    return true;
  }

  const bannedGenericPatterns = [
    /დამატებითი მოქმედება არ არის საჭირო/i,
    /no further action is required/i,
  ];

  const looksLikeContactFooter =
    (/(\+995\s*\(?\d{2,3}\)?\s*\d{3}\s*\d{2}\s*\d{2}|https?:\/\/\S+|mod\.gov\.ge|@[a-z0-9.-]+)/i
      .test(paragraph) &&
      /(ცხელი ხაზი|ვებგვერდ|დამატებითი ინფორმაციისთვის|მიმართეთ|hotline|website|for more information|contact)/i
        .test(paragraph));

  if (looksLikeContactFooter) {
    return true;
  }

  return bannedGenericPatterns.some((pattern) => pattern.test(paragraph));
}

function trimStructuredLeadText(text) {
  const normalized = text.trim();
  if (!normalized) return "";
  if (normalized.length <= 260) return normalized;

  const sentences = normalized
    .split(/(?<=[.!?])\s+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return `${normalized.slice(0, 257).trimEnd()}...`;
  }

  const kept = [];
  let totalLength = 0;

  for (const sentence of sentences) {
    const nextLength = totalLength + sentence.length + (kept.length ? 1 : 0);
    if (kept.length >= 2 || nextLength > 260) break;
    kept.push(sentence);
    totalLength = nextLength;
  }

  if (kept.length > 0) {
    return kept.join(" ");
  }

  return `${normalized.slice(0, 257).trimEnd()}...`;
}

function getRenderableAssistantText(message) {
  const rawText = (message?.text || "")
    .replace(/\+995\s*\(?\d{2,3}\)?\s*\d{3}\s*\d{2}\s*\d{2}/g, "")
    .trim();

  if (!rawText) return "";

  const blocks = Array.isArray(message?.blocks) ? message.blocks : [];
  if (blocks.length === 0) return rawText;
  if (blocks.some((block) => block.type === "summary")) return "";

  const paragraphs = rawText
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return "";

  const structuredTexts = getStructuredTextSet(blocks);
  let firstUsefulIndex = 0;
  while (
    firstUsefulIndex < paragraphs.length &&
    isLowValuePreamble(paragraphs[firstUsefulIndex], structuredTexts)
  ) {
    firstUsefulIndex += 1;
  }

  const cleanedParagraphs = paragraphs.slice(firstUsefulIndex);
  if (cleanedParagraphs.length === 0) return "";

  const cleaned = trimStructuredLeadText(cleanedParagraphs[0]);
  if (!cleaned) return "";
  if (structuredTexts.has(normalizeComparableText(cleaned))) return "";
  return cleaned;
}

function extractContactItems(text, language) {
  const items = [];
  const seen = new Set();
  const pushItem = (item) => {
    if (!item?.href || seen.has(item.href)) return;
    seen.add(item.href);
    items.push(item);
  };

  const phoneMatch = text.match(/\+995\s*\(?\d{2,3}\)?\s*\d{3}\s*\d{2}\s*\d{2}/);
  if (phoneMatch) {
    const digits = phoneMatch[0].replace(/\D/g, "");
    pushItem({
      label: language === "ka" ? "ცხელი ხაზი" : "Hotline",
      value: phoneMatch[0],
      href: `tel:+${digits}`,
      icon: "\u{1F4DE}",
    });
  }

  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    pushItem({
      label: language === "ka" ? "ელფოსტა" : "Email",
      value: emailMatch[0],
      href: `mailto:${emailMatch[0]}`,
      icon: "\u2709\uFE0F",
    });
  }

  const websiteMatch = text.match(/https?:\/\/[^\s)]+/i) || text.match(/\bmod\.gov\.ge\b/i);
  if (websiteMatch) {
    const raw = websiteMatch[0];
    const href = raw.startsWith("http") ? raw : `https://${raw}`;
    pushItem({
      label: language === "ka" ? "ვებგვერდი" : "Website",
      value: raw.replace(/^https?:\/\//i, ""),
      href,
      icon: "\u{1F517}",
    });
  }

  return items;
}

/* Markdown renderer */
function RichText({ text }) {
  const elements = useMemo(() => {
    if (!text) return null;
    const processed = preprocessText(text);
    const lines = processed.split("\n");
    const result = [];
    let listItems = [];
    const flushList = () => { if (listItems.length) { result.push(<ul key={`ul-${result.length}`} className="rich-list">{listItems.map((item, j) => <li key={j}>{inlineFormat(item)}</li>)}</ul>); listItems = []; } };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const bm = line.match(/^[\s]*[-\u2022]\s+(.*)/);
      const nm = line.match(/^[\s]*\d+[.)]\s+(.*)/);
      const hm = line.match(/^#{1,3}\s+(.*)/);
      if (bm || nm) { listItems.push(bm ? bm[1] : nm[1]); }
      else { flushList(); if (hm) result.push(<div key={`h-${i}`} className="rich-heading">{inlineFormat(hm[1])}</div>); else if (line.trim() === "---") result.push(<hr key={`hr-${i}`} className="rich-divider" />); else if (!line.trim()) result.push(<br key={`br-${i}`} />); else result.push(<p key={`p-${i}`} className="rich-paragraph">{inlineFormat(line)}</p>); }
    }
    flushList(); return result;
  }, [text]);
  return <>{elements}</>;
}

function inlineFormat(text) {
  const parts = [];
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|\[([^\]]+)\]\((https?:\/\/[^)]+)\)|(\d[\d,]*\s*(?:GEL|ლარი))|(\+995\s*\(?\d{2,3}\)?\s*\d{3}\s*\d{2}\s*\d{2})|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  let last = 0, m;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(<strong key={m.index}>{m[2]}</strong>);
    else if (m[4]) parts.push(<em key={m.index}>{m[4]}</em>);
    else if (m[5] && m[6]) parts.push(<a key={m.index} href={m[6]} target="_blank" rel="noopener noreferrer" className="rich-link">{m[5]}</a>);
    else if (m[7]) parts.push(<span key={m.index} className="hl-price">{m[7]}</span>);
    else if (m[8]) { const d = m[8].replace(/\D/g, ""); parts.push(<a key={m.index} href={`tel:+${d}`} className="hl-contact">{m[8]}</a>); }
    else if (m[9]) parts.push(<a key={m.index} href={`mailto:${m[9]}`} className="hl-contact">{m[9]}</a>);
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : text;
}

function GuidanceBlocks({ blocks, onQuickReply, language }) {
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = async (copyText, key) => {
    if (!copyText || !navigator?.clipboard?.writeText) return;

    try {
      await navigator.clipboard.writeText(copyText);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 1600);
    } catch {
      // Clipboard access can be blocked in some embedded browser contexts.
    }
  };

  if (!Array.isArray(blocks) || blocks.length === 0) return null;

  return (
    <div className="guidance-blocks">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;

        if (block.type === "summary") {
          return (
            <div key={key} className={`guidance-card guidance-summary ${block.tone ? `guidance-summary-${block.tone}` : ""}`}>
              {block.title ? <div className="guidance-title">{block.title}</div> : null}
              <p className="guidance-summary-text">{block.text}</p>
            </div>
          );
        }

        if (block.type === "key_facts") {
          return (
            <div key={key} className="guidance-card">
              <div className="guidance-title">{block.title}</div>
              <div className="guidance-facts-grid">
                {block.items.map((item, itemIndex) => (
                  <div key={`${item.label}-${itemIndex}`} className="guidance-fact">
                    <span className="guidance-fact-label">{item.label}</span>
                    <span className="guidance-fact-value">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (block.type === "documents" || block.type === "next_steps") {
          return (
            <div key={key} className="guidance-card">
              <div className="guidance-title">{block.title}</div>
              <ul className={`guidance-list guidance-list-${block.type}`}>
                {block.items.map((item, itemIndex) => (
                  <li key={`${item}-${itemIndex}`}>{item}</li>
                ))}
              </ul>
            </div>
          );
        }

        if (block.type === "contact_card") {
          return (
            <div key={key} className="contact-card guidance-contact-card">
              <div className="contact-card-title">{block.title}</div>
              <div className="contact-card-items">
                {block.contacts.map((contact, contactIndex) => {
                  const safeHref = getSafeHref(contact.href, {
                    allowMailto: true,
                    allowTel: true,
                  });

                  return (
                    <div
                      key={`${contact.value}-${contactIndex}`}
                      className="contact-card-item"
                    >
                      {safeHref ? (
                        <a
                          href={safeHref}
                          className="contact-card-item-link"
                          target={safeHref.startsWith("http") ? "_blank" : undefined}
                          rel={safeHref.startsWith("http") ? "noopener noreferrer" : undefined}
                        >
                          <span className="contact-card-icon">
                            {safeHref.startsWith("mailto:")
                              ? "\u2709\uFE0F"
                              : safeHref.startsWith("tel:")
                              ? "\u{1F4DE}"
                              : "\u{1F517}"}
                          </span>
                          <span className="guidance-contact-copy">
                            <strong>{contact.label}</strong>
                            <span>{contact.value}</span>
                          </span>
                        </a>
                      ) : (
                        <>
                          <span className="contact-card-icon">\u23F0</span>
                          <span className="guidance-contact-copy">
                            <strong>{contact.label}</strong>
                            <span>{contact.value}</span>
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        }

        if (block.type === "verification_note") {
          return (
            <div key={key} className={`guidance-card guidance-note ${block.tone ? `guidance-note-${block.tone}` : ""}`}>
              <div className="guidance-title">{block.title}</div>
              <ul className="guidance-list">
                {block.items.map((item, itemIndex) => (
                  <li key={`${item}-${itemIndex}`}>{item}</li>
                ))}
              </ul>
            </div>
          );
        }

        if (block.type === "center_card") {
          const safeDirectionsHref = getSafeHref(block.directionsHref);
          const safeSourceHref = getSafeHref(block.sourceHref);

          return (
            <div key={key} className="guidance-card guidance-center-card">
              <div className="guidance-center-top">
                <div className="guidance-center-copy">
                  <div className="guidance-center-name-row">
                    <span className="guidance-center-name">{block.name}</span>
                  </div>
                  {block.meta ? <span className="guidance-center-meta">{block.meta}</span> : null}
                  <span className="guidance-center-location">
                    {block.city}
                    {block.area ? ` • ${block.area}` : ""}
                  </span>
                  <span className="guidance-center-address">{block.address}</span>
                  <span className="guidance-center-hours">{block.hours}</span>
                  <span className="guidance-center-phone">{block.phone}</span>
                </div>
              </div>
              <div className="guidance-center-actions">
                {block.callHref ? (
                  <a href={block.callHref} className="guidance-center-action">
                    {language === "ka" ? "დარეკვა" : "Call"}
                  </a>
                ) : null}
                {safeDirectionsHref ? (
                  <a
                    href={safeDirectionsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="guidance-center-action guidance-center-action-primary"
                  >
                    {language === "ka" ? "მიმართულება" : "Directions"}
                  </a>
                ) : null}
                {safeSourceHref ? (
                  <a
                    href={safeSourceHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="guidance-center-action"
                  >
                    {language === "ka" ? "წყარო" : "Source"}
                  </a>
                ) : null}
              </div>
            </div>
          );
        }

        if (block.type === "handoff_summary") {
          return (
            <div key={key} className="guidance-card guidance-handoff">
              <div className="guidance-card-header">
                <div className="guidance-title">{block.title}</div>
                <button
                  type="button"
                  className="guidance-copy-btn"
                  onClick={() => handleCopy(block.copyText, key)}
                >
                  {copiedKey === key ? block.copiedLabel : block.copyLabel}
                </button>
              </div>
              <p className="guidance-handoff-summary">{block.summary}</p>
              <div className="guidance-handoff-fields">
                {block.fields.map((field, fieldIndex) => (
                  <div key={`${field.label}-${fieldIndex}`} className="guidance-handoff-field">
                    <span className="guidance-handoff-label">{field.label}</span>
                    <span className="guidance-handoff-value">{field.value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        if (block.type === "sources") {
          return (
            <div key={key} className="guidance-card">
              <div className="guidance-title">{block.title}</div>
              <div className="guidance-sources">
                {block.items.map((item, itemIndex) => {
                  const safeHref = getSafeHref(item.href);
                  if (!safeHref) return null;

                  return (
                    <a
                      key={`${item.label}-${itemIndex}`}
                      href={safeHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="guidance-source-item"
                    >
                      <span className="guidance-source-label">{item.label}</span>
                      <span className="guidance-source-detail">{item.detail}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          );
        }

        if (block.type === "follow_up_chips") {
          return (
            <div key={key} className="guidance-follow-ups">
              {block.title ? <div className="guidance-follow-ups-title">{block.title}</div> : null}
              {block.items.map((item) => (
                <button
                  key={item.prompt}
                  className="suggested-reply-chip"
                  onClick={() => onQuickReply(item.prompt)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

function ContactCard({ text, language }) {
  const items = extractContactItems(text, language);
  if (items.length === 0) return null;

  return (
    <div className="contact-card contact-card-compact">
      <div className="contact-card-title">
        {language === "ka" ? "სასარგებლო ბმულები" : "Useful links"}
      </div>
      <div className="contact-card-pills">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="contact-pill"
            target={item.href.startsWith("http") ? "_blank" : undefined}
            rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
          >
            <span className="contact-pill-icon">{item.icon}</span>
            <span className="contact-pill-copy">
              <strong>{item.label}</strong>
              <span>{item.value}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ── App ── */
function App() {
  const [view, setView] = useState("home"); // home | chat
  const [lang, setLang] = useState("ka");
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [status, setStatus] = useState("disconnected");
  const [isThinking, setIsThinking] = useState(false);

  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const thinkingStartRef = useRef(null);
  const pendingChunksRef = useRef([]);
  const flushTimerRef = useRef(null);

  const t = T[lang] || T.en;
  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];
  const settleMessages = useCallback((items) => {
    const last = items[items.length - 1];
    if (last?.role === "ai-stream") {
      return [...items.slice(0, -1), { ...last, role: "ai" }];
    }
    return items;
  }, []);

  const cancelPendingResponse = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    pendingChunksRef.current = [];
    setIsThinking(false);
  }, []);

  useEffect(() => { if (!langMenuOpen) return; const h = () => setLangMenuOpen(false); document.addEventListener("click", h); return () => document.removeEventListener("click", h); }, [langMenuOpen]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isThinking]);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia("(max-width: 768px), (max-height: 720px) and (pointer: coarse)");
    const syncExpandedState = () => {
      if (mediaQuery.matches) {
        setIsExpanded(false);
      }
    };

    syncExpandedState();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncExpandedState);
      return () => mediaQuery.removeEventListener("change", syncExpandedState);
    }

    mediaQuery.addListener(syncExpandedState);
    return () => mediaQuery.removeListener(syncExpandedState);
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia("(max-width: 768px), (max-height: 720px) and (pointer: coarse)");
    if (!isOpen || !mediaQuery.matches) return undefined;

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;
    const previousHtmlOverflow = documentElement.style.overflow;
    const previousHtmlOverscroll = documentElement.style.overscrollBehavior;

    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    documentElement.style.overflow = "hidden";
    documentElement.style.overscrollBehavior = "none";

    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
      documentElement.style.overflow = previousHtmlOverflow;
      documentElement.style.overscrollBehavior = previousHtmlOverscroll;
    };
  }, [isOpen]);

  /* HTTP Streaming */
  const flushPendingChunks = useCallback(() => { const c = pendingChunksRef.current; if (!c.length) return; pendingChunksRef.current = []; setIsThinking(false); setMessages(p => [...p, { role: "ai-stream", text: c.join(""), ts: Date.now() }]); }, []);
  const scheduleFlush = useCallback(() => { if (flushTimerRef.current) return; const r = Math.max(0, THINKING_MIN_MS - (Date.now() - (thinkingStartRef.current || Date.now()))); flushTimerRef.current = setTimeout(() => { flushTimerRef.current = null; flushPendingChunks(); }, r); }, [flushPendingChunks]);

  const sendToAPI = useCallback(async (allMessages, overrideLang) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsThinking(true);
    thinkingStartRef.current = Date.now();
    pendingChunksRef.current = [];

    const activeLang = overrideLang || lang;
    const apiMessages = allMessages
      .filter(m => m.role === "user" || m.role === "ai")
      .slice(-40)
      .map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setIsThinking(false);
      setMessages(p => [...p, {
        role: "ai",
        text: getClientConfigError(activeLang),
        ts: Date.now(),
        error: true,
      }]);
      return;
    }

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
          "apikey": SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ messages: apiMessages, language: activeLang }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalBlocks = [];
      let finalJourney = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop();

        for (const part of parts) {
          const dataLine = part.split("\n").find(l => l.startsWith("data: "));
          if (!dataLine) continue;

          try {
            const data = JSON.parse(dataLine.slice(6));

            if (data.type === "content_block_delta" && data.delta?.type === "text_delta") {
              const chunk = data.delta.text;
              const elapsed = Date.now() - (thinkingStartRef.current || Date.now());
              if (elapsed < THINKING_MIN_MS) {
                pendingChunksRef.current.push(chunk);
                scheduleFlush();
              } else {
                setIsThinking(false);
                const buf = pendingChunksRef.current.join("");
                pendingChunksRef.current = [];
                if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null; }
                setMessages(p => {
                  const last = p[p.length - 1];
                  const txt = (last?.role === "ai-stream" ? last.text : buf) + chunk;
                  if (last?.role === "ai-stream") return [...p.slice(0, -1), { role: "ai-stream", text: txt, ts: last.ts }];
                  return [...p, { role: "ai-stream", text: txt, ts: Date.now() }];
                });
              }
            } else if (data.type === "message_stop") {
              finalBlocks = Array.isArray(data.blocks) ? data.blocks : [];
              finalJourney = data.journey || null;
              if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null; }
              const buffered = pendingChunksRef.current.join("");
              pendingChunksRef.current = [];
              setIsThinking(false);
              setMessages(p => {
                const last = p[p.length - 1];
                if (last?.role === "ai-stream") {
                  return [...p.slice(0, -1), { role: "ai", text: last.text, ts: last.ts, blocks: finalBlocks, journey: finalJourney }];
                }
                if (buffered) return [...p, { role: "ai", text: buffered, ts: Date.now(), blocks: finalBlocks, journey: finalJourney }];
                return p;
              });
            }
          } catch { /* skip malformed SSE events */ }
        }
      }

      /* Finalize remaining buffered chunks */
      if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null; }
      const leftover = pendingChunksRef.current.join("");
      pendingChunksRef.current = [];
      setIsThinking(false);
      setMessages(p => {
        const last = p[p.length - 1];
        if (last?.role === "ai-stream") {
          return [...p.slice(0, -1), { role: "ai", text: last.text + leftover, ts: last.ts, blocks: finalBlocks, journey: finalJourney }];
        }
        if (leftover) return [...p, { role: "ai", text: leftover, ts: Date.now(), blocks: finalBlocks, journey: finalJourney }];
        return p;
      });
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Chat API error:", err);
      setIsThinking(false);
      if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null; }
      pendingChunksRef.current = [];
      setMessages(p => {
        const base = p[p.length - 1]?.role === "ai-stream"
          ? [...p.slice(0, -1), { ...p[p.length - 1], role: "ai" }]
          : p;
        return [...base, {
          role: "ai",
          text: activeLang === "ka"
            ? "\u10D9\u10D0\u10D5\u10E8\u10D8\u10E0\u10D8\u10E1 \u10E8\u10D4\u10EA\u10D3\u10DD\u10DB\u10D0. \u10D2\u10D7\u10EE\u10DD\u10D5\u10D7 \u10E1\u10EA\u10D0\u10D3\u10DD\u10D7 \u10D7\u10D0\u10D5\u10D8\u10D3\u10D0\u10DC."
            : "Sorry, something went wrong. Please try again.",
          ts: Date.now(),
          error: true,
          blocks: [],
          journey: null,
        }];
      });
    }
  }, [lang, scheduleFlush]);

  const sendMessage = useCallback(() => {
    const txt = inputText.trim();
    if (!txt || status !== "connected") return;
    setInputText("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    const userMsg = { role: "user", text: txt, ts: Date.now() };
    const baseMessages = settleMessages(messages);
    const localReply = getCenterLookupReply({
      text: txt,
      language: lang,
      selectedServiceId: selectedService?.id,
      messages: baseMessages,
    });

    if (localReply) {
      cancelPendingResponse();
      setMessages([...baseMessages, userMsg, { ...localReply, ts: Date.now() }]);
      return;
    }

    const updated = [...baseMessages, userMsg];
    setMessages(updated);
    sendToAPI(updated);
  }, [inputText, status, messages, settleMessages, lang, selectedService, cancelPendingResponse, sendToAPI]);

  const handleKeyDown = useCallback((e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }, [sendMessage]);

  const retryLastMessage = useCallback(() => {
    const idx = messages.length - 1;
    if (idx < 0 || !messages[idx]?.error) return;
    const cleaned = messages.slice(0, idx);
    setMessages(cleaned);
    sendToAPI(cleaned);
  }, [messages, sendToAPI]);

  const handleQuickReply = useCallback((text) => {
    if (status !== "connected") return;
    const userMsg = { role: "user", text, ts: Date.now() };
    const baseMessages = settleMessages(messages);
    const localReply = getCenterLookupReply({
      text,
      language: lang,
      selectedServiceId: selectedService?.id,
      messages: baseMessages,
    });

    if (localReply) {
      cancelPendingResponse();
      setMessages([...baseMessages, userMsg, { ...localReply, ts: Date.now() }]);
      return;
    }

    const updated = [...baseMessages, userMsg];
    setMessages(updated);
    sendToAPI(updated);
  }, [status, messages, settleMessages, lang, selectedService, cancelPendingResponse, sendToAPI]);

  /* Contextual suggested replies */
  const suggestedReplies = useMemo(() => {
    if (isThinking) return [];
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role === "user" || lastMsg.role === "ai-stream") return [];
    if (Array.isArray(lastMsg.blocks) && lastMsg.blocks.some(block => block.type === "follow_up_chips")) return [];
    const txt = (lastMsg.text || "").toLowerCase();
    const userCount = messages.filter(m => m.role === "user").length;
    const isKa = lang === "ka";

    if (userCount === 0) {
      return isKa
        ? ["\u10E1\u10D0\u10D5\u10D0\u10DA\u10D3\u10D4\u10D1\u10E3\u10DA\u10DD \u10E1\u10D0\u10DB\u10E1\u10D0\u10EE\u10E3\u10E0\u10D8", "\u10D2\u10D0\u10D3\u10D0\u10D5\u10D0\u10D3\u10D4\u10D1\u10D0", "\u10E1\u10D0\u10D9\u10DD\u10DC\u10E2\u10E0\u10D0\u10E5\u10E2\u10DD \u10E1\u10D0\u10DB\u10E1\u10D0\u10EE\u10E3\u10E0\u10D8", "\u10D8\u10DE\u10DD\u10D5\u10D4 \u10E9\u10D4\u10DB\u10D8 \u10EA\u10D4\u10DC\u10E2\u10E0\u10D8"]
        : ["Mandatory Service", "Deferrals", "Professional Service", "Find My Center"];
    }

    if (txt.includes("gel") || txt.includes("\u10DA\u10D0\u10E0") || txt.includes("months") || txt.includes("\u10D7\u10D5\u10D4")) {
      return isKa
        ? ["\u10DB\u10D4\u10E2\u10D8 \u10D8\u10DC\u10E4\u10DD\u10E0\u10DB\u10D0\u10EA\u10D8\u10D0", "\u10E1\u10EE\u10D5\u10D0 \u10D7\u10D4\u10DB\u10D0"]
        : ["Tell me more", "Different topic"];
    }

    if (txt.includes("?")) {
      return isKa
        ? ["\u10D3\u10D8\u10D0\u10EE", "\u10D0\u10E0\u10D0", "\u10DB\u10D4\u10E2\u10D8 \u10D8\u10DC\u10E4\u10DD\u10E0\u10DB\u10D0\u10EA\u10D8\u10D0"]
        : ["Yes", "No", "Tell me more"];
    }

    return [];
  }, [messages, isThinking, lang]);

  /* Navigation */
  const handleLangChange = (code) => {
    setLang(code);
    setLangMenuOpen(false);
    if (view === "chat") {
      cancelPendingResponse();
      if (selectedService?.id === "center") {
        setMessages(buildCenterLookupConversation(code));
      } else if (selectedService) {
        const svcMsg = getServiceSeedPrompt(selectedService.id, code);
        const newMsgs = [{ role: "user", text: svcMsg, ts: Date.now() }];
        setMessages(newMsgs);
        sendToAPI(newMsgs, code);
      } else {
        const newT = T[code] || T.en;
        setMessages([{ role: "ai", text: newT.howHelp, ts: Date.now() }]);
      }
    }
  };

  const openServiceChat = (service) => {
    cancelPendingResponse();
    setSelectedService(service);
    setView("chat"); setIsThinking(false); setStatus("connected");
    if (service.id === "center") {
      setMessages(buildCenterLookupConversation(lang));
      return;
    }
    const svcMsg = getServiceSeedPrompt(service.id, lang);
    const initialMsgs = [{ role: "user", text: svcMsg, ts: Date.now() }];
    setMessages(initialMsgs);
    sendToAPI(initialMsgs);
  };

  const openChat = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setSelectedService(null);
    setView("chat"); setIsThinking(false); setStatus("connected");
    setMessages([{ role: "ai", text: t.howHelp, ts: Date.now() }]);
  };

  const goHome = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setView("home"); setSelectedService(null);
    setStatus("disconnected");
    setMessages([]); setIsThinking(false);
  };

  const isConnected = status === "connected";
  const statusLabel = isConnected ? t.chatWith : t.offline;
  const lastMsg = messages[messages.length - 1];

  return (
    <>
      {/* Landing Page */}
      <div className="landing">
        <nav className="landing-nav">
          <div className="landing-nav-left">
            <img src="/logo.png" alt="MOD" className="landing-nav-logo" />
            <div className="landing-nav-title">
              <span className="landing-nav-name">Ministry of Defense of Georgia</span>
              <span className="landing-nav-sub">{lang === "ka" ? "\u10E1\u10D0\u10E5\u10D0\u10E0\u10D7\u10D5\u10D4\u10DA\u10DD\u10E1 \u10D7\u10D0\u10D5\u10D3\u10D0\u10EA\u10D5\u10D8\u10E1 \u10E1\u10D0\u10DB\u10D8\u10DC\u10D8\u10E1\u10E2\u10E0\u10DD" : "AI Assistant — Nika"}</span>
            </div>
          </div>
          <div className="landing-nav-links">
            <a href="https://mod.gov.ge" target="_blank" rel="noopener noreferrer">mod.gov.ge</a>
            <a href="tel:+995322721000">+995 32 2 72 10 00</a>
          </div>
        </nav>
        <div className="landing-hero">
          <div className="landing-hero-content">
            <div className="landing-badge">{lang === "ka" ? "\u10D7\u10D0\u10D5\u10D3\u10D0\u10EA\u10D5\u10D0" : "Defense"}</div>
            <h1 className="landing-title">{lang === "ka" ? "\u10DC\u10D8\u10D9\u10D0" : "Nika"}<br /><span className="landing-title-accent">{lang === "ka" ? "AI \u10D0\u10E1\u10D8\u10E1\u10E2\u10D4\u10DC\u10E2\u10D8" : "AI Assistant"}</span></h1>
            <p className="landing-subtitle">{lang === "ka" ? "\u10E1\u10D0\u10DB\u10EE\u10D4\u10D3\u10E0\u10DD \u10E1\u10D0\u10DB\u10E1\u10D0\u10EE\u10E3\u10E0\u10D8\u10E1 \u10E8\u10D4\u10E1\u10D0\u10EE\u10D4\u10D1 \u10D8\u10DC\u10E4\u10DD\u10E0\u10DB\u10D0\u10EA\u10D8\u10D0 — \u10E1\u10D0\u10D5\u10D0\u10DA\u10D3\u10D4\u10D1\u10E3\u10DA\u10DD \u10E1\u10D0\u10DB\u10E1\u10D0\u10EE\u10E3\u10E0\u10D8, \u10D2\u10D0\u10D3\u10D0\u10D5\u10D0\u10D3\u10D4\u10D1\u10D0, \u10D2\u10D0\u10D7\u10D0\u10D5\u10D8\u10E1\u10E3\u10E4\u10DA\u10D4\u10D1\u10D0, \u10E1\u10D0\u10D9\u10DD\u10DC\u10E2\u10E0\u10D0\u10E5\u10E2\u10DD \u10E1\u10D0\u10DB\u10E1\u10D0\u10EE\u10E3\u10E0\u10D8 \u10D3\u10D0 \u10E1\u10EE\u10D5\u10D0." : "Information about Georgian military service — mandatory service, deferrals, exemptions, professional careers, and more. Available 24/7 in Georgian and English."}</p>
            <div className="landing-stats">
              <div className="landing-stat"><span className="landing-stat-value">24/7</span><span className="landing-stat-label">{lang === "ka" ? "\u10EE\u10D4\u10DA\u10DB\u10D8\u10E1\u10D0\u10EC\u10D5\u10D3\u10DD\u10DB\u10D8" : "Available"}</span></div>
              <div className="landing-stat-divider" />
              <div className="landing-stat"><span className="landing-stat-value">2</span><span className="landing-stat-label">{lang === "ka" ? "\u10D4\u10DC\u10D0" : "Languages"}</span></div>
              <div className="landing-stat-divider" />
              <div className="landing-stat"><span className="landing-stat-value">5+</span><span className="landing-stat-label">{lang === "ka" ? "\u10D7\u10D4\u10DB\u10D4\u10D1\u10D8" : "Topics"}</span></div>
            </div>
            <div className="landing-features">
              <div className="landing-feature"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--mod-primary)" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg><span>{lang === "ka" ? "\u10E1\u10D0\u10D5\u10D0\u10DA\u10D3\u10D4\u10D1\u10E3\u10DA\u10DD \u10E1\u10D0\u10DB\u10E1\u10D0\u10EE\u10E3\u10E0\u10D8" : "Mandatory Service Info"}</span></div>
              <div className="landing-feature"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--mod-primary)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg><span>{lang === "ka" ? "\u10D2\u10D0\u10D3\u10D0\u10D5\u10D0\u10D3\u10D4\u10D1\u10D0 \u10D3\u10D0 \u10D2\u10D0\u10D7\u10D0\u10D5\u10D8\u10E1\u10E3\u10E4\u10DA\u10D4\u10D1\u10D0" : "Deferrals & Exemptions"}</span></div>
              <div className="landing-feature"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--mod-primary)" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></svg><span>{lang === "ka" ? "\u10DE\u10E0\u10DD\u10E4\u10D4\u10E1\u10D8\u10E3\u10DA\u10D8 \u10D9\u10D0\u10E0\u10D8\u10D4\u10E0\u10D0" : "Professional Careers"}</span></div>
            </div>
          </div>
          <div className="landing-hero-visual">
            <div className="landing-visual-ring" /><div className="landing-visual-ring landing-visual-ring-2" />
            <img src="/logo.png" alt="MOD Georgia" className="landing-hero-logo" />
          </div>
        </div>
        <div className="landing-footer"><span>{lang === "ka" ? "\u10E1\u10D0\u10E5\u10D0\u10E0\u10D7\u10D5\u10D4\u10DA\u10DD\u10E1 \u10D7\u10D0\u10D5\u10D3\u10D0\u10EA\u10D5\u10D8\u10E1 \u10E1\u10D0\u10DB\u10D8\u10DC\u10D8\u10E1\u10E2\u10E0\u10DD" : "Ministry of Defense of Georgia"} &middot; {lang === "ka" ? "\u10D0\u10E1\u10D8\u10E1\u10E2\u10D4\u10DC\u10E2\u10D8 \u10DC\u10D8\u10D9\u10D0" : "AI Assistant Nika"}</span></div>
      </div>

      {/* Widget */}
      <div className={`widget-host ${isOpen ? "widget-open" : ""}`}>
        <div className={`panel ${isOpen ? "open" : ""} ${isExpanded ? "panel-expanded" : ""}`}>
          {/* Header */}
          <div className="panel-header">
            <div className="panel-header-left">
              {view === "chat" && <button className="header-back-btn" onClick={goHome}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg></button>}
              <img src="/logo.png" alt="MOD" className="header-avatar" />
              <div className="header-info">
                <span className="header-name">{view === "home" ? t.ministry : (lang === "ka" ? "\u10DC\u10D8\u10D9\u10D0" : "Nika")}</span>
                <span className="header-status">{view === "home" ? t.aiAssistant : statusLabel}</span>
              </div>
            </div>
            <div className="header-actions">
              <div className="lang-selector">
                <button className="lang-trigger-btn" onClick={(e) => { e.stopPropagation(); setLangMenuOpen(v => !v); }}><span className="lang-flag"><currentLang.Flag /></span><span className="lang-code">{currentLang.displayCode}</span></button>
                {langMenuOpen && <div className="lang-menu">{LANGUAGES.map(l => <button key={l.code} className={`lang-option ${l.code === lang ? "active" : ""}`} onClick={() => handleLangChange(l.code)}><span className="lang-flag"><l.Flag /></span><span className="lang-label">{l.label}</span></button>)}</div>}
              </div>
              <button
                className={`header-action-btn header-expand-btn ${isExpanded ? "active" : ""}`}
                onClick={() => setIsExpanded(v => !v)}
                aria-label={isExpanded ? (lang === "ka" ? "შემცირება" : "Collapse widget") : (lang === "ka" ? "გაფართოება" : "Expand widget")}
                title={isExpanded ? (lang === "ka" ? "შემცირება" : "Collapse widget") : (lang === "ka" ? "გაფართოება" : "Expand widget")}
              >
                {isExpanded ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="14 10 14 5 19 5" />
                    <line x1="14" y1="10" x2="20" y2="4" />
                    <polyline points="10 14 10 19 5 19" />
                    <line x1="10" y1="14" x2="4" y2="20" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="14" y1="10" x2="21" y2="3" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="10" y1="14" x2="3" y2="21" />
                  </svg>
                )}
              </button>
              <button className="header-action-btn" onClick={() => setIsOpen(false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
            </div>
          </div>

          {/* HOME */}
          {view === "home" && (
            <div className="home-view">
              <div className="home-welcome">
                <h2 className="home-welcome-title">{t.welcome}</h2>
                <p className="home-welcome-sub">{t.howHelp}</p>
              </div>
              <div className="home-services">
                {SERVICES.map(s => (
                  <button key={s.id} className="service-card" onClick={() => openServiceChat(s)}>
                    <div className="service-card-icon"><ServiceIcon type={s.icon} /></div>
                    <span className="service-card-title">{t[s.titleKey]}</span>
                  </button>
                ))}
              </div>
              <button className="new-conversation-btn" onClick={openChat}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                <span>{t.newConvo}</span>
              </button>
              <div className="home-footer"><span>{t.poweredBy} <strong>Wiil</strong></span></div>
            </div>
          )}

          {/* CHAT */}
          {view === "chat" && (
            <>
              <div className="panel-messages">
                {messages.map((msg, i) => (
                  <div key={i} className={`msg ${msg.role === "user" ? "msg-user" : "msg-agent"}`}>
                    <div className="msg-content">
                      {msg.role === "user" ? msg.text : (
                        <>
                          {(msg.role !== "ai" || getRenderableAssistantText(msg)) && (
                            <RichText text={msg.role === "ai" ? getRenderableAssistantText(msg) : msg.text} />
                          )}
                          {msg.role === "ai-stream" && <span className="stream-cursor" />}
                          {msg.role === "ai" && Array.isArray(msg.blocks) && msg.blocks.length > 0 && (
                            <GuidanceBlocks blocks={msg.blocks} onQuickReply={handleQuickReply} language={lang} />
                          )}
                          {msg.role === "ai" && (!Array.isArray(msg.blocks) || !msg.blocks.some(block => block.type === "contact_card")) && (
                            <ContactCard text={msg.text} language={lang} />
                          )}
                        </>
                      )}
                    </div>
                    {msg.role !== "ai-stream" && msg.ts && <span className={`msg-time ${msg.role === "user" ? "msg-time-right" : ""}`}>{formatTime(msg.ts)}</span>}
                  </div>
                ))}

                {/* Retry */}
                {lastMsg?.error && !isThinking && (
                  <div className="chat-quick-actions">
                    <button className="quick-action-btn" onClick={retryLastMessage}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 105.64-11.36L3 10"/></svg>
                      {t.tryAgain}
                    </button>
                  </div>
                )}

                {/* Suggested quick replies */}
                {suggestedReplies.length > 0 && (
                  <div className="suggested-replies">
                    {suggestedReplies.map((reply, i) => (
                      <button key={i} className="suggested-reply-chip" onClick={() => handleQuickReply(reply)}>{reply}</button>
                    ))}
                  </div>
                )}

                {isThinking && <div className="thinking-indicator"><img src="/logo.png" alt="" className="thinking-avatar" /><div className="thinking-dots"><span /><span /><span /></div></div>}
                <div ref={messagesEndRef} />
              </div>

              <div className="panel-input-wrap">
                <div className="panel-input-box">
                  <textarea ref={inputRef} className="panel-textarea" placeholder={t.typePlaceholder} value={inputText} onChange={e => { setInputText(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px"; }} onKeyDown={handleKeyDown} disabled={!isConnected} rows={1} />
                  <div className="panel-input-actions"><button className="send-btn" onClick={sendMessage} disabled={!inputText.trim() || !isConnected}><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg></button></div>
                </div>
              </div>
            </>
          )}
        </div>

        <button className={`collapse-btn ${isOpen ? "visible" : ""}`} onClick={() => setIsOpen(false)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg></button>
        <button className={`trigger ${isOpen ? "hidden" : ""}`} onClick={() => setIsOpen(true)}>
          <div className="trigger-avatar-wrap"><img src="/logo.png" alt="MOD" className="trigger-avatar" /></div>
          <div className="trigger-cta"><svg className="trigger-chat-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z" /></svg><span>{lang === "ka" ? "\u10E9\u10D0\u10E2\u10D8 \u10DC\u10D8\u10D9\u10D0\u10E1\u10D7\u10D0\u10DC" : "Chat with Nika"}</span></div>
        </button>
      </div>
    </>
  );
}

export default App;
