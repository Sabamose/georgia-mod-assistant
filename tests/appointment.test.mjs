import assert from "node:assert/strict";
import test from "node:test";

import {
  APPOINTMENT_MARKER,
  buildAppointmentBlock,
  createMarkerSplitter,
  parseAppointmentPayload,
} from "../api/_lib/appointment.js";

const PAYLOAD = {
  name: "გიორგი ბერიძე",
  topic: "სავალდებულო სამსახურის რეგისტრაცია",
  city: "თბილისი",
  date: "2026-06-15",
  time: "10:00",
  phone: null,
};

test("splitter passes plain text through untouched", () => {
  const splitter = createMarkerSplitter();
  let out = "";
  for (const chunk of ["გამარჯობა, ", "გადავადება ", "5,000 ლარი ღირს."]) {
    out += splitter.push(chunk);
  }
  const { text, payload } = splitter.flush();
  out += text;

  assert.equal(out, "გამარჯობა, გადავადება 5,000 ლარი ღირს.");
  assert.equal(payload, null);
});

test("splitter captures a marker split across chunks", () => {
  const message = `ვიზიტი დაჯავშნულია.\n\n${APPOINTMENT_MARKER} ${JSON.stringify(PAYLOAD)}`;
  // Stream in awkward 3-char chunks so the marker spans many boundaries.
  const splitter = createMarkerSplitter();
  let visible = "";
  for (let i = 0; i < message.length; i += 3) {
    visible += splitter.push(message.slice(i, i + 3));
  }
  const { text, payload } = splitter.flush();
  visible += text;

  assert.equal(visible, "ვიზიტი დაჯავშნულია.");
  assert.ok(payload.includes('"თბილისი"'));
  assert.deepEqual(parseAppointmentPayload(payload), PAYLOAD);
});

test("parseAppointmentPayload tolerates trailing junk", () => {
  const parsed = parseAppointmentPayload(` ${JSON.stringify(PAYLOAD)}\nthanks`);
  assert.deepEqual(parsed, PAYLOAD);
  assert.equal(parseAppointmentPayload("no json here"), null);
});

test("buildAppointmentBlock resolves a known city to a real center", () => {
  const block = buildAppointmentBlock(PAYLOAD, "ka");
  assert.equal(block.type, "appointment_card");
  assert.match(block.reference, /^MOD-[A-Z2-9]{6}$/);
  const centerField = block.fields.find((f) => f.label === "ცენტრი");
  assert.ok(centerField.value.includes("თბილისი"));
  const addressField = block.fields.find((f) => f.label === "მისამართი");
  assert.ok(addressField, "expected resolved center to include an address");
  assert.equal(block.ics.date, "2026-06-15");
});

test("buildAppointmentBlock rejects malformed payloads", () => {
  assert.equal(buildAppointmentBlock(null, "en"), null);
  assert.equal(buildAppointmentBlock({ ...PAYLOAD, date: "tomorrow" }, "en"), null);
  assert.equal(buildAppointmentBlock({ ...PAYLOAD, time: "noon" }, "en"), null);
  assert.equal(buildAppointmentBlock({ ...PAYLOAD, name: "" }, "en"), null);
});

test("buildAppointmentBlock keeps unknown cities usable", () => {
  const block = buildAppointmentBlock({ ...PAYLOAD, city: "სოფელი X" }, "en");
  assert.equal(block.type, "appointment_card");
  const centerField = block.fields.find((f) => f.label === "Center");
  assert.ok(centerField.value.includes("სოფელი X"));
});
