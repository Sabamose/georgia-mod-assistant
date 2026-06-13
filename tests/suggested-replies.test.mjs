import assert from "node:assert/strict";
import test from "node:test";

import { getSuggestedReplies } from "../src/suggestedReplies.js";

test("open Georgian help question shows topic chips instead of yes/no", () => {
  const replies = getSuggestedReplies({
    language: "ka",
    isThinking: false,
    messages: [
      { role: "user", text: "\u10D3\u10D0\u10DB\u10D4\u10EE\u10DB\u10D0\u10E0\u10D4" },
      {
        role: "ai",
        text: "\u10E0\u10D8\u10D7 \u10E8\u10D4\u10DB\u10D8\u10EB\u10DA\u10D8\u10D0 \u10D3\u10D0\u10D2\u10D4\u10EE\u10DB\u10D0\u10E0\u10DD\u10D7 \u10E1\u10D0\u10DB\u10EE\u10D4\u10D3\u10E0\u10DD \u10E1\u10D0\u10DB\u10E1\u10D0\u10EE\u10E3\u10E0\u10D8\u10E1 \u10E1\u10D0\u10D9\u10D8\u10D7\u10EE\u10D4\u10D1\u10E8\u10D8?",
      },
    ],
  });

  assert.deepEqual(replies, [
    "\u10E1\u10D0\u10D5\u10D0\u10DA\u10D3\u10D4\u10D1\u10E3\u10DA\u10DD \u10E1\u10D0\u10DB\u10E1\u10D0\u10EE\u10E3\u10E0\u10D8",
    "\u10D2\u10D0\u10D3\u10D0\u10D5\u10D0\u10D3\u10D4\u10D1\u10D0",
    "\u10E1\u10D0\u10D9\u10DD\u10DC\u10E2\u10E0\u10D0\u10E5\u10E2\u10DD \u10E1\u10D0\u10DB\u10E1\u10D0\u10EE\u10E3\u10E0\u10D8",
    "\u10D8\u10DE\u10DD\u10D5\u10D4 \u10E9\u10D4\u10DB\u10D8 \u10EA\u10D4\u10DC\u10E2\u10E0\u10D8",
  ]);
  assert.equal(replies.includes("\u10D3\u10D8\u10D0\u10EE"), false);
  assert.equal(replies.includes("\u10D0\u10E0\u10D0"), false);
});

test("confirmation question still shows yes and no chips", () => {
  const replies = getSuggestedReplies({
    language: "en",
    isThinking: false,
    messages: [
      { role: "user", text: "Book it" },
      { role: "ai", text: "Should I book your visit for Tuesday at 10:00?" },
    ],
  });

  assert.deepEqual(replies, ["Yes", "No", "Tell me more"]);
});

test("generic information-gathering questions do not show yes or no", () => {
  const replies = getSuggestedReplies({
    language: "en",
    isThinking: false,
    messages: [
      { role: "user", text: "I need an appointment" },
      { role: "ai", text: "Which city are you in?" },
    ],
  });

  assert.deepEqual(replies, []);
});

test("book-related how-to questions do not show yes or no", () => {
  const replies = getSuggestedReplies({
    language: "en",
    isThinking: false,
    messages: [
      { role: "user", text: "Appointments" },
      { role: "ai", text: "How do you want to book a visit?" },
    ],
  });

  assert.deepEqual(replies, []);
});
