import { findCenterForCity, normalizeCity } from "./centers.js";

export const APPOINTMENT_MARKER = "APPOINTMENT_JSON:";

const REFERENCE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateReference() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let code = "";
  for (const byte of bytes) {
    code += REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length];
  }
  return `MOD-${code}`;
}

/**
 * Splits a streamed completion into displayable text and a trailing
 * APPOINTMENT_JSON payload, holding back just enough of the tail that a
 * marker spanning chunk boundaries is never leaked to the client.
 */
export function createMarkerSplitter(marker = APPOINTMENT_MARKER) {
  let pending = "";
  let captured = null;

  return {
    push(chunk) {
      if (captured !== null) {
        captured += chunk;
        return "";
      }

      pending += chunk;
      const markerIndex = pending.indexOf(marker);
      if (markerIndex !== -1) {
        const visible = pending.slice(0, markerIndex).replace(/\s+$/, "");
        captured = pending.slice(markerIndex + marker.length);
        pending = "";
        return visible;
      }

      // Hold back enough tail that a marker spanning chunk boundaries is never
      // emitted, plus any whitespace run touching it (so the blank line the
      // model puts before the marker stays out of the visible text too).
      let cut = pending.length - (marker.length - 1);
      while (cut > 0 && /\s/.test(pending[cut - 1])) cut -= 1;
      if (cut > 0) {
        const visible = pending.slice(0, cut);
        pending = pending.slice(cut);
        return visible;
      }
      return "";
    },
    flush() {
      const text = captured === null ? pending : "";
      const payload = captured;
      pending = "";
      return { text, payload };
    },
  };
}

export function parseAppointmentPayload(raw) {
  if (!raw || typeof raw !== "string") return null;
  const start = raw.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === "{") depth += 1;
    else if (raw[i] === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(raw.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function t(language, ka, en) {
  return language === "ka" ? ka : en;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function buildAppointmentBlock(payload, language) {
  if (!payload) return null;
  if (!isNonEmptyString(payload.name) || !isNonEmptyString(payload.topic)) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(payload.date || ""))) return null;
  if (!/^\d{1,2}:\d{2}$/.test(String(payload.time || ""))) return null;

  const city = normalizeCity(payload.city);
  const center = findCenterForCity(city);
  const centerName = center?.name ||
    (city
      ? t(language, `${city} — სამხედრო აღრიცხვის ცენტრი`, `${city} military registration center`)
      : t(language, "სამხედრო აღრიცხვის ცენტრი", "Military registration center"));
  const reference = generateReference();
  const phone = isNonEmptyString(payload.phone) && payload.phone.trim().toLowerCase() !== "null"
    ? payload.phone.trim()
    : null;

  const fields = [
    { label: t(language, "სახელი", "Name"), value: payload.name.trim() },
    { label: t(language, "ვიზიტის თემა", "Topic"), value: payload.topic.trim() },
    { label: t(language, "ცენტრი", "Center"), value: centerName },
    ...(center?.address ? [{ label: t(language, "მისამართი", "Address"), value: center.address }] : []),
    { label: t(language, "თარიღი", "Date"), value: payload.date },
    { label: t(language, "დრო", "Time"), value: payload.time.padStart(5, "0") },
    ...(phone ? [{ label: t(language, "ტელეფონი", "Phone"), value: phone }] : []),
  ];

  return {
    type: "appointment_card",
    title: t(language, "ვიზიტი დაჯავშნულია", "Appointment booked"),
    referenceLabel: t(language, "ჯავშნის ნომერი", "Booking reference"),
    reference,
    fields,
    note: t(
      language,
      "თან იქონიეთ პირადობის მოწმობა და თემასთან დაკავშირებული დოკუმენტები.",
      "Please bring your national ID and any documents related to your topic.",
    ),
    icsLabel: t(language, "კალენდარში დამატება", "Add to calendar"),
    ics: {
      summary: t(
        language,
        `ვიზიტი — ${centerName}`,
        `Visit — ${centerName}`,
      ),
      location: center?.address || centerName,
      date: payload.date,
      time: payload.time.padStart(5, "0"),
      durationMinutes: 30,
    },
  };
}
