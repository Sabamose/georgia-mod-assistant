import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCenterLookupConversation,
  getCenterLookupReply,
} from "../src/centerLookup.js";

function getAssistantMessages(language = "ka") {
  return buildCenterLookupConversation(language).map((message) => ({
    role: message.role,
    text: message.text,
    blocks: message.blocks,
  }));
}

test("center intro shows only city chips", () => {
  const conversation = buildCenterLookupConversation("ka");
  const intro = conversation[1];

  assert.equal(intro.blocks.length, 1);
  assert.equal(intro.blocks[0].type, "follow_up_chips");
  assert.ok(intro.blocks[0].items.length > 0);
});

test("city chip returns center cards", () => {
  const reply = getCenterLookupReply({
    text: "თბილისი",
    language: "ka",
    selectedServiceId: "center",
    messages: getAssistantMessages("ka"),
  });

  assert.ok(reply);
  assert.ok(reply.blocks.some((block) => block.type === "center_card"));
});

test("district chip narrows to matching district branch", () => {
  const cityReply = getCenterLookupReply({
    text: "თბილისი",
    language: "ka",
    selectedServiceId: "center",
    messages: getAssistantMessages("ka"),
  });

  const reply = getCenterLookupReply({
    text: "დიდუბე",
    language: "ka",
    selectedServiceId: "center",
    messages: [
      ...getAssistantMessages("ka"),
      { role: "user", text: "თბილისი" },
      cityReply,
    ],
  });

  const centerCards = reply.blocks.filter((block) => block.type === "center_card");
  assert.ok(centerCards.length >= 1);
  assert.ok(centerCards.every((block) => block.area === "დიდუბე"));
});

test("all Tbilisi district chips narrow to the correct district", () => {
  const cityReply = getCenterLookupReply({
    text: "თბილისი",
    language: "ka",
    selectedServiceId: "center",
    messages: getAssistantMessages("ka"),
  });

  const chipBlock = cityReply.blocks.find((block) => block.type === "follow_up_chips");
  const districtChips = chipBlock.items.filter(
    (item) => item.label !== "რა საბუთები მჭირდება იქ?" && item.label !== "სხვა ქალაქი",
  );

  assert.ok(districtChips.length > 0);

  for (const chip of districtChips) {
    const reply = getCenterLookupReply({
      text: chip.prompt,
      language: "ka",
      selectedServiceId: "center",
      messages: [
        ...getAssistantMessages("ka"),
        { role: "user", text: "თბილისი" },
        cityReply,
      ],
    });

    const centerCards = reply.blocks.filter((block) => block.type === "center_card");
    assert.ok(centerCards.length >= 1, `expected center cards for ${chip.label}`);
    assert.ok(
      centerCards.every((block) => block.area === chip.label),
      `expected all center cards to match ${chip.label}`,
    );
  }
});

test("documents chip is not intercepted by center lookup", () => {
  const cityReply = getCenterLookupReply({
    text: "თბილისი",
    language: "ka",
    selectedServiceId: "center",
    messages: getAssistantMessages("ka"),
  });

  const reply = getCenterLookupReply({
    text: "სამხედრო აღრიცხვის ცენტრში მისასვლელად რა საბუთებია საჭირო?",
    language: "ka",
    selectedServiceId: "center",
    messages: [
      ...getAssistantMessages("ka"),
      { role: "user", text: "თბილისი" },
      cityReply,
    ],
  });

  assert.equal(reply, null);
});

test("another city chip asks for a new city", () => {
  const cityReply = getCenterLookupReply({
    text: "თბილისი",
    language: "ka",
    selectedServiceId: "center",
    messages: getAssistantMessages("ka"),
  });

  const reply = getCenterLookupReply({
    text: "სხვა ქალაქი მინდა.",
    language: "ka",
    selectedServiceId: "center",
    messages: [
      ...getAssistantMessages("ka"),
      { role: "user", text: "თბილისი" },
      cityReply,
    ],
  });

  assert.ok(reply);
  assert.match(reply.text, /ქალაქი|მუნიციპალიტეტი/);
  assert.equal(reply.blocks[0].type, "follow_up_chips");
});
