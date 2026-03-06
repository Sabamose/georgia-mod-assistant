import registrationCentersRegistry from "./data/registration-centers.json" with { type: "json" };

const CENTER_REGISTRY = Array.isArray(registrationCentersRegistry?.centers)
  ? registrationCentersRegistry.centers
  : [];

const FEATURED_CITIES = [
  "თბილისი",
  "ბათუმი",
  "ქუთაისი",
  "რუსთავი",
  "გორი",
  "თელავი",
];

const CITY_METADATA = [
  { city: "თბილისი", en: "Tbilisi", aliases: ["tbilisi"] },
  { city: "ბათუმი", en: "Batumi", aliases: ["batumi"] },
  { city: "ქუთაისი", en: "Kutaisi", aliases: ["kutaisi"] },
  { city: "რუსთავი", en: "Rustavi", aliases: ["rustavi"] },
  { city: "გორი", en: "Gori", aliases: ["gori"] },
  { city: "თელავი", en: "Telavi", aliases: ["telavi"] },
  { city: "ახმეტა", en: "Akhmeta", aliases: ["akhmeta"] },
  { city: "გურჯაანი", en: "Gurjaani", aliases: ["gurjaani"] },
  { city: "ყვარელი", en: "Kvareli", aliases: ["kvareli"] },
  { city: "საგარეჯო", en: "Sagarejo", aliases: ["sagarejo"] },
  { city: "წნორი", en: "Tsnori", aliases: ["tsnori"] },
  { city: "გარდაბანი", en: "Gardabani", aliases: ["gardabani"] },
  { city: "მარნეული", en: "Marneuli", aliases: ["marneuli"] },
  { city: "ბოლნისი", en: "Bolnisi", aliases: ["bolnisi"] },
  { city: "დმანისი", en: "Dmanisi", aliases: ["dmanisi"] },
  { city: "თეთრიწყარო", en: "Tetritskaro", aliases: ["tetritskaro"] },
  { city: "კასპი", en: "Kaspi", aliases: ["kaspi"] },
  { city: "ქარელი", en: "Kareli", aliases: ["kareli"] },
  { city: "ხაშური", en: "Khashuri", aliases: ["khashuri"] },
  { city: "ადიგენი", en: "Adigeni", aliases: ["adigeni"] },
  { city: "ახალქალაქი", en: "Akhalkalaki", aliases: ["akhalkalaki"] },
  { city: "ბაღდათი", en: "Baghdati", aliases: ["baghdati"] },
  { city: "ვანი", en: "Vani", aliases: ["vani"] },
  { city: "ხონი", en: "Khoni", aliases: ["khoni"] },
  { city: "სამტრედია", en: "Samtredia", aliases: ["samtredia"] },
  { city: "ტყიბული", en: "Tkibuli", aliases: ["tkibuli"] },
  { city: "წყალტუბო", en: "Tskaltubo", aliases: ["tskaltubo"] },
  { city: "ქედა", en: "Keda", aliases: ["keda"] },
  { city: "ქობულეთი", en: "Kobuleti", aliases: ["kobuleti"] },
  { city: "შუახევი", en: "Shuakhevi", aliases: ["shuakhevi"] },
];

const CITY_LOOKUP = new Map(CITY_METADATA.map((entry) => [entry.city, entry]));
const ALL_DISTRICTS = [...new Set(CENTER_REGISTRY.map((center) => center.district_or_municipality).filter(Boolean))];

const CENTER_TYPE_ORDER = {
  regional_center: 0,
  district_branch: 1,
  municipal_branch: 2,
};

function t(language, ka, en) {
  return language === "ka" ? ka : en;
}

function normalizeSearchText(text) {
  return (text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createMapsUrl(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, Georgia`)}`;
}

function buildPhoneHref(phone) {
  const digits = (phone || "").replace(/\D/g, "");
  return digits ? `tel:+${digits}` : undefined;
}

function formatCity(city, language) {
  const metadata = CITY_LOOKUP.get(city);
  if (!metadata) return city;
  return language === "ka" ? city : metadata.en;
}

function formatCenterType(centerType, language) {
  switch (centerType) {
    case "regional_center":
      return t(language, "რეგიონული ცენტრი", "Regional center");
    case "district_branch":
      return t(language, "რაიონული განყოფილება", "District branch");
    default:
      return t(language, "მუნიციპალური განყოფილება", "Municipal branch");
  }
}

function featuredCityChips(language) {
  return FEATURED_CITIES.map((city) => ({
    label: formatCity(city, language),
    prompt: language === "ka" ? city : CITY_LOOKUP.get(city)?.en || city,
  }));
}

function findCity(text) {
  const normalized = normalizeSearchText(text);
  if (!normalized) return null;

  for (const entry of CITY_METADATA) {
    if (normalized.includes(normalizeSearchText(entry.city))) {
      return entry.city;
    }

    for (const alias of entry.aliases) {
      if (normalized.includes(alias.toLowerCase())) {
        return entry.city;
      }
    }
  }

  return null;
}

function findDistrict(text) {
  const normalized = normalizeSearchText(text);
  if (!normalized) return null;

  return ALL_DISTRICTS.find((district) =>
    normalized.includes(normalizeSearchText(district))
  ) || null;
}

function isCenterLookupText(text) {
  return /\b(center|closest|nearest|branch|address|office|location)\b/i.test(text) ||
    /(ცენტრი|მისამართი|განყოფილება|ფილიალი|სად მივიდე|რომელ ოფისში|სად ვნახო)/i.test(text);
}

function isCenterDocumentsText(text) {
  return /\b(document|documents|required|paperwork)\b/i.test(text) ||
    /(საბუთ|დოკუმენტ|რა მჭირდება|რა უნდა წავიღო|მისასვლელად)/i.test(text);
}

function isAnotherCityText(text) {
  return /\b(another city|different city|other city)\b/i.test(text) ||
    /(სხვა ქალაქ|სხვა მუნიციპალიტეტ)/i.test(text);
}

function hasCenterCards(messages) {
  return messages.some(
    (message) =>
      message?.role === "ai" &&
      Array.isArray(message.blocks) &&
      message.blocks.some((block) => block.type === "center_card"),
  );
}

function buildCenterCard(center, language) {
  const phone = center.local_phone || center.shared_hotline || "";
  return {
    type: "center_card",
    name: center.name_ka,
    city: formatCity(center.city, language),
    area: center.district_or_municipality || null,
    address: center.address_ka,
    phone,
    hours: center.working_hours_ka || t(language, "სამუშაო საათები დაუზუსტებელია", "Working hours not listed"),
    callHref: buildPhoneHref(phone),
    directionsHref: createMapsUrl(center.address_ka),
    meta: formatCenterType(center.center_type, language),
    sourceHref: Array.isArray(center.source_urls) ? center.source_urls[0] : null,
  };
}

function sortCenters(centers) {
  return [...centers].sort((a, b) => {
    const typeDelta =
      (CENTER_TYPE_ORDER[a.center_type] ?? 99) - (CENTER_TYPE_ORDER[b.center_type] ?? 99);
    if (typeDelta !== 0) return typeDelta;
    return `${a.city} ${a.district_or_municipality || ""}`.localeCompare(
      `${b.city} ${b.district_or_municipality || ""}`,
      "ka",
    );
  });
}

function buildCenterIntroMessage(language) {
  return {
    role: "ai",
    text: t(
      language,
      "მომწერეთ ქალაქი ან აირჩიეთ ქვემოთ. თუ საჭირო იქნება, შემდეგ რაიონითაც დავაზუსტებთ.",
      "Send your city or choose one below. If needed, we can narrow it down by district next.",
    ),
    journey: "center_lookup",
    blocks: [
      {
        type: "follow_up_chips",
        items: featuredCityChips(language),
      },
    ],
  };
}

function buildNeedCityMessage(language) {
  return {
    role: "ai",
    text: t(
      language,
      "მომწერეთ ქალაქი ან მუნიციპალიტეტი, რათა შესაბამისი ცენტრი გაჩვენოთ.",
      "Please send your city or municipality so I can show the relevant center.",
    ),
    journey: "center_lookup",
    blocks: [
      {
        type: "follow_up_chips",
        items: featuredCityChips(language),
      },
    ],
  };
}

function buildNotFoundMessage(language) {
  return {
    role: "ai",
    text: t(
      language,
      "ქალაქი ვერ ამოვიცანი. მომწერეთ ქალაქი ან მუნიციპალიტეტი, მაგალითად თბილისი ან ქუთაისი.",
      "I could not match a city. Please send a city or municipality, for example Tbilisi or Kutaisi.",
    ),
    journey: "center_lookup",
    blocks: [
      {
        type: "follow_up_chips",
        items: featuredCityChips(language),
      },
    ],
  };
}

function buildCenterResultsMessage(matches, language, matchedCity, matchedDistrict) {
  const sortedMatches = sortCenters(matches);
  const districtNames = [...new Set(sortedMatches.map((center) => center.district_or_municipality).filter(Boolean))];
  const multipleBranches = sortedMatches.length > 1;

  const summaryText = matchedDistrict
    ? t(
      language,
      `${matchedDistrict}-ისთვის შესაბამისი ცენტრი ვიპოვე.`,
      `I found the relevant center for ${matchedDistrict}.`,
    )
    : multipleBranches
    ? t(
      language,
      `${formatCity(matchedCity, language)}-ში რამდენიმე შესაბამისი ოფისი ვიპოვე.`,
      `I found several relevant offices in ${formatCity(matchedCity, language)}.`,
    )
    : t(
      language,
      `${formatCity(matchedCity, language)}-ში შესაბამისი ცენტრი ვიპოვე.`,
      `I found the relevant center in ${formatCity(matchedCity, language)}.`,
    );

  const blocks = [...sortedMatches.map((center) => buildCenterCard(center, language))];
  const followUpItems = [];

  if (multipleBranches && districtNames.length > 1 && !matchedDistrict) {
    followUpItems.push(
      ...districtNames.slice(0, 6).map((district) => ({
        label: district,
        prompt: district,
      })),
    );
  }

  followUpItems.push(
    {
      label: t(language, "რა საბუთები მჭირდება იქ?", "What documents do I need there?"),
      prompt: t(
        language,
        "სამხედრო აღრიცხვის ცენტრში მისასვლელად რა საბუთებია საჭირო?",
        "What documents are needed when visiting a military registration center?",
      ),
    },
    {
      label: t(language, "სხვა ქალაქი", "Another city"),
      prompt: t(language, "სხვა ქალაქი მინდა.", "I need another city."),
    },
  );

  blocks.push({
    type: "follow_up_chips",
    items: followUpItems,
  });

  return {
    role: "ai",
    text: multipleBranches && !matchedDistrict
      ? t(
        language,
        `${formatCity(matchedCity, language)}-ში რამდენიმე შესაბამისი ოფისი ვიპოვე. თუ რაიონი იცით, ქვემოდან აირჩიეთ ან მომწერეთ.`,
        `I found several relevant offices in ${formatCity(matchedCity, language)}. If you know the district, choose it below or type it.`,
      )
      : summaryText,
    journey: "center_lookup",
    blocks,
  };
}

export function buildCenterLookupConversation(language) {
  return [
    {
      role: "user",
      text: t(
        language,
        "მინდა ვიპოვო ჩემი სამხედრო აღრიცხვის ცენტრი.",
        "I want to find my military registration center.",
      ),
      ts: Date.now(),
    },
    {
      ...buildCenterIntroMessage(language),
      ts: Date.now(),
    },
  ];
}

export function getCenterLookupReply({
  text,
  language,
  selectedServiceId,
  messages,
}) {
  const trimmedText = (text || "").trim();
  if (!trimmedText) return null;

  const matchedCity = findCity(trimmedText);
  const matchedDistrict = findDistrict(trimmedText);
  const centerFlowActive = selectedServiceId === "center";
  const hasExistingCenterCards = hasCenterCards(messages);
  const locationIntent = isCenterLookupText(trimmedText) || isAnotherCityText(trimmedText);
  const documentsIntent = isCenterDocumentsText(trimmedText);

  if (documentsIntent) {
    return null;
  }

  if (!centerFlowActive && !locationIntent && !matchedCity && !matchedDistrict) {
    return null;
  }

  if (centerFlowActive && isAnotherCityText(trimmedText)) {
    return buildNeedCityMessage(language);
  }

  if (centerFlowActive && !hasExistingCenterCards && !matchedCity && !matchedDistrict && !locationIntent) {
    return buildNeedCityMessage(language);
  }

  const matches = sortCenters(
    CENTER_REGISTRY.filter((center) => {
      if (matchedDistrict) {
        return center.district_or_municipality === matchedDistrict;
      }

      if (matchedCity) {
        return center.city === matchedCity;
      }

      return false;
    }),
  );

  if (!matchedCity && !matchedDistrict) {
    return centerFlowActive ? buildNeedCityMessage(language) : buildNotFoundMessage(language);
  }

  if (matches.length === 0) {
    return buildNotFoundMessage(language);
  }

  const responseCity = matches[0]?.city || matchedCity;
  return buildCenterResultsMessage(matches, language, responseCity, matchedDistrict);
}
