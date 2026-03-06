import type { ChatLanguage, ChatMessage } from "./providers/types.ts";

export type GuidanceBlock =
  | {
    type: "summary";
    title?: string;
    text: string;
    tone?: "neutral" | "positive" | "warning";
  }
  | {
    type: "key_facts";
    title: string;
    items: Array<{ label: string; value: string }>;
  }
  | {
    type: "next_steps" | "documents";
    title: string;
    items: string[];
  }
  | {
    type: "contact_card";
    title: string;
    contacts: Array<{ label: string; value: string; href?: string }>;
  }
  | {
    type: "verification_note";
    title: string;
    items: string[];
    tone?: "neutral" | "positive" | "warning";
  }
  | {
    type: "sources";
    title: string;
    items: Array<{ label: string; detail: string; href: string }>;
  }
  | {
    type: "handoff_summary";
    title: string;
    summary: string;
    fields: Array<{ label: string; value: string }>;
    copyText: string;
    copyLabel: string;
    copiedLabel: string;
  }
  | {
    type: "follow_up_chips";
    items: Array<{ label: string; prompt: string }>;
  };

type JourneyId =
  | "mandatory_service"
  | "deferral"
  | "exemption"
  | "contract_service"
  | "reserve"
  | "diaspora"
  | "alternative_service"
  | "contact"
  | "general";

type CaseProfile = {
  age?: number;
  gender?: "male" | "female";
  student?: boolean;
  childrenCount?: number;
  singleFather?: boolean;
  soleProvider?: boolean;
  disabledDependent?: boolean;
  healthIssue?: boolean;
  dualCitizen?: boolean;
  abroad?: boolean;
  foreignService?: boolean;
  completedService?: boolean;
  city?: string;
  contractInterest?: boolean;
  clergy?: boolean;
  warFamilyLoss?: boolean;
};

const HOTLINE = "+995 32 2 72 10 00";
const INFO_EMAIL = "info@mod.gov.ge";
const MOD_WEBSITE = "https://mod.gov.ge";
const MOD_ADDRESS = "20 General G. Kvinitadze St., 0112 Tbilisi, Georgia";
const MOD_ADDRESS_KA = "თბილისი, გენერალ გ. კვინიტაძის ქ. 20";
const MOD_HOURS = "Monday–Friday, 09:00–18:00";
const MOD_HOURS_KA = "ორშაბათი–პარასკევი, 09:00–18:00";
const MOD_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=20+General+G.+Kvinitadze+St,+Tbilisi,+Georgia";

const CITY_PATTERNS: Array<{ city: string; pattern: RegExp }> = [
  { city: "თბილისი", pattern: /\b(tbilisi|თბილისი|თბილისში|თბილისის)\b/i },
  { city: "ქუთაისი", pattern: /\b(kutaisi|ქუთაისი|ქუთაისში|ქუთაისის)\b/i },
  { city: "ბათუმი", pattern: /\b(batumi|ბათუმი|ბათუმში|ბათუმის)\b/i },
  { city: "გორი", pattern: /\b(gori|გორი|გორში)\b/i },
  { city: "ზუგდიდი", pattern: /\b(zugdidi|ზუგდიდი|ზუგდიდში)\b/i },
  { city: "თელავი", pattern: /\b(telavi|თელავი|თელავში)\b/i },
  { city: "რუსთავი", pattern: /\b(rustavi|რუსთავი|რუსთავში)\b/i },
];

function t(language: ChatLanguage, ka: string, en: string): string {
  return language === "ka" ? ka : en;
}

function normalizeText(messages: ChatMessage[]): string {
  return messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n")
    .trim();
}

function extractAge(text: string): number | undefined {
  const patterns = [
    /\b(1[7-9]|2\d|3\d|4\d|5\d)\s*(?:წლის(?:\s*ვარ)?|years?\s*old|yo\b)/i,
    /\bვარ\s*(1[7-9]|2\d|3\d|4\d|5\d)\b/i,
    /\bI am\s*(1[7-9]|2\d|3\d|4\d|5\d)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return Number(match[1]);
    }
  }

  return undefined;
}

function extractChildrenCount(text: string): number | undefined {
  const numeric = text.match(/\b(\d+)\s*(?:minor children|children|შვილი|შვილები)\b/i);
  if (numeric) return Number(numeric[1]);

  if (/\b(ორი|two)\s+(?:minor\s+)?(?:children|შვილი|შვილები)\b/i.test(text)) return 2;
  if (/\b(სამი|three)\s+(?:minor\s+)?(?:children|შვილი|შვილები)\b/i.test(text)) return 3;

  return undefined;
}

function extractCity(text: string): string | undefined {
  for (const entry of CITY_PATTERNS) {
    if (entry.pattern.test(text)) {
      return entry.city;
    }
  }

  return undefined;
}

function extractProfile(messages: ChatMessage[]): CaseProfile {
  const text = normalizeText(messages);

  return {
    age: extractAge(text),
    gender: /\b(ქალი|female|woman)\b/i.test(text)
      ? "female"
      : /\b(კაცი|მამაკაცი|male|man)\b/i.test(text)
      ? "male"
      : undefined,
    student: /\b(სტუდენტ|student|university|უნივერსიტეტ|bachelor|master|doctoral|phd)\b/i.test(text)
      ? true
      : undefined,
    childrenCount: extractChildrenCount(text),
    singleFather: /\b(single father|sole caretaker|მარტოხელა მამ|ერთადერთი მზრუნველი)\b/i.test(text)
      ? true
      : undefined,
    soleProvider: /\b(sole family provider|family provider|მარჩენალი|ოჯახის ერთადერთი შემომტანი)\b/i.test(text)
      ? true
      : undefined,
    disabledDependent: /\b(disabled family member|disabled dependent|caregiver|შშმ ოჯახის წევრ|შეზღუდული შესაძლებლობის მქონე ოჯახის წევრ|მოვლის ქვეშ მყოფი)\b/i
      .test(text)
      ? true
      : undefined,
    healthIssue: /\b(health|medical|diagnos|ჯანმრთელ|სამედიცინო|ავად|კომისია|უვარგისი)\b/i.test(text)
      ? true
      : undefined,
    dualCitizen: /\b(dual citizen|dual citizenship|ორმაგი მოქალაქ)\b/i.test(text)
      ? true
      : undefined,
    abroad: /\b(abroad|outside georgia|living abroad|საზღვარგარეთ|უცხოეთში|ემიგრაცი)\b/i.test(text)
      ? true
      : undefined,
    foreignService: /\b(foreign military service|served abroad|საზღვარგარეთ სამხედრო სამსახური|უცხო ქვეყნის ჯარში)\b/i
      .test(text)
      ? true
      : undefined,
    completedService: /\b(completed service|finished service|served already|მოვიხადე სამსახური|გავლილი მაქვს სამხედრო სამსახური)\b/i
      .test(text)
      ? true
      : undefined,
    city: extractCity(text),
    contractInterest: /\b(contract|professional military|career in the military|საკონტრაქტო|პროფესიულ სამსახურში|კარიერა ჯარში)\b/i
      .test(text)
      ? true
      : undefined,
    clergy: /\b(clergy|priest|orthodox clergy|სასულიერო პირ|მღვდელ|დიაკვნ)\b/i.test(text)
      ? true
      : undefined,
    warFamilyLoss: /\b(another family member died in military service|war casualty|only son|ომში დაღუპული ოჯახის წევრი|სამხედრო სამსახურში დაღუპული ოჯახის წევრი|ომში გარდაცვლილი)\b/i
      .test(text)
      ? true
      : undefined,
  };
}

function detectJourney(messages: ChatMessage[], profile: CaseProfile): JourneyId {
  const text = normalizeText(messages);

  if (/\b(alternative service|conscientious|religious grounds|ethical grounds|ალტერნატიულ|რელიგიურ|ეთიკურ|იარაღის ტარება არ)\b/i.test(text)) {
    return "alternative_service";
  }

  if (
    /\b(გადავადება|deferral|student defer|სტუდენტი ვარ|paid deferral|ფასიანი გადავადება)\b/i.test(text) ||
    profile.student || (profile.childrenCount ?? 0) >= 2 || profile.singleFather ||
    profile.soleProvider || profile.disabledDependent
  ) {
    return "deferral";
  }

  if (
    /\b(გათავისუფლება|exemption|medical commission|უვარგისი|foreign military service|clergy|სამედიცინო კომისია)\b/i.test(text) ||
    profile.healthIssue || profile.foreignService || profile.clergy || profile.warFamilyLoss
  ) {
    return "exemption";
  }

  if (
    /\b(საკონტრაქტო|contract service|professional service|salary|ხელფასი|join professionally|კარიერა)\b/i.test(text) ||
    profile.contractInterest
  ) {
    return "contract_service";
  }

  if (/\b(რეზერვი|reserve|mobilization|მობილიზაცია)\b/i.test(text) || profile.completedService) {
    return "reserve";
  }

  if (
    /\b(dual citizen|citizenship|renounce citizenship|abroad|diaspora|ორმაგი მოქალაქ|მოქალაქეობის უარყოფა|დიასპორა|საზღვარგარეთ)\b/i
      .test(text) ||
    profile.dualCitizen || profile.abroad
  ) {
    return "diaspora";
  }

  if (/\b(contact|hotline|phone|center|address|კონტაქტ|ცხელი ხაზი|ნომერი|მისამართი|ცენტრი)\b/i.test(text)) {
    return "contact";
  }

  if (/\b(service|draft|registration|call-up|mandatory|conscript|აღრიცხვა|გაწვევა|სავალდებულო)\b/i.test(text)) {
    return "mandatory_service";
  }

  return "general";
}

function buildProfileFacts(profile: CaseProfile, language: ChatLanguage) {
  const items: Array<{ label: string; value: string }> = [];

  if (typeof profile.age === "number") {
    items.push({
      label: t(language, "ასაკი", "Age"),
      value: String(profile.age),
    });
  }

  if (profile.gender) {
    items.push({
      label: t(language, "სქესი", "Gender"),
      value: profile.gender === "female"
        ? t(language, "ქალი", "Female")
        : t(language, "კაცი", "Male"),
    });
  }

  if (profile.student) {
    items.push({
      label: t(language, "სტატუსი", "Status"),
      value: t(language, "სტუდენტი", "Student"),
    });
  }

  if ((profile.childrenCount ?? 0) > 0) {
    items.push({
      label: t(language, "შვილები", "Children"),
      value: String(profile.childrenCount),
    });
  }

  if (profile.singleFather) {
    items.push({
      label: t(language, "ოჯახური მდგომარეობა", "Family status"),
      value: t(language, "მარტოხელა მამა", "Single father"),
    });
  }

  if (profile.soleProvider) {
    items.push({
      label: t(language, "სოციალური სტატუსი", "Support status"),
      value: t(language, "ოჯახის ერთადერთი მარჩენალი", "Sole family provider"),
    });
  }

  if (profile.disabledDependent) {
    items.push({
      label: t(language, "მოვლის საფუძველი", "Care basis"),
      value: t(language, "შშმ ოჯახის წევრის მოვლა", "Care for a disabled dependent"),
    });
  }

  if (profile.healthIssue) {
    items.push({
      label: t(language, "სამედიცინო ფაქტორი", "Medical factor"),
      value: t(language, "საჭიროა სამედიცინო შეფასება", "Medical evaluation likely needed"),
    });
  }

  if (profile.dualCitizen) {
    items.push({
      label: t(language, "მოქალაქეობა", "Citizenship"),
      value: t(language, "ორმაგი მოქალაქეობა", "Dual citizenship"),
    });
  }

  if (profile.abroad) {
    items.push({
      label: t(language, "საცხოვრებელი გარემოება", "Residence context"),
      value: t(language, "საზღვარგარეთ ყოფნა", "Living abroad"),
    });
  }

  if (profile.foreignService) {
    items.push({
      label: t(language, "წინა სამხედრო გამოცდილება", "Prior military service"),
      value: t(language, "უცხოეთის სამხედრო სამსახური", "Foreign military service"),
    });
  }

  if (profile.completedService) {
    items.push({
      label: t(language, "სამსახურის სტატუსი", "Service status"),
      value: t(language, "სამხედრო სამსახური გავლილია", "Military service completed"),
    });
  }

  if (profile.clergy) {
    items.push({
      label: t(language, "სტატუსი", "Status"),
      value: t(language, "სასულიერო პირი", "Ordained clergy"),
    });
  }

  if (profile.warFamilyLoss) {
    items.push({
      label: t(language, "ოჯახური გარემოება", "Family circumstance"),
      value: t(language, "სამხედრო ან საომარი დანაკარგი ოჯახში", "Military or war-related family loss"),
    });
  }

  if (profile.city) {
    items.push({
      label: t(language, "ქალაქი", "City"),
      value: profile.city,
    });
  }

  return items;
}

function buildMandatoryGuidance(
  profile: CaseProfile,
  language: ChatLanguage,
): GuidanceBlock[] {
  let summary = t(
    language,
    "სავარაუდოდ, თქვენთვის რელევანტურია სავალდებულო სამხედრო სამსახურის პროცესი.",
    "The likely relevant path for you is mandatory military service.",
  );
  let tone: "neutral" | "positive" | "warning" = "neutral";

  if (profile.gender === "female") {
    summary = t(
      language,
      "ქალები სავალდებულო სამხედრო სამსახურს არ ექვემდებარებიან. სურვილის შემთხვევაში შეგიძლიათ პროფესიულ ან საკონტრაქტო სამსახურში ჩართვა.",
      "Women are not subject to mandatory military service. Professional or contract service remains voluntary.",
    );
    tone = "positive";
  } else if (typeof profile.age === "number" && (profile.age < 18 || profile.age > 27)) {
    summary = t(
      language,
      "თქვენ მიერ მითითებული ასაკის მიხედვით, სავალდებულო სამხედრო სამსახური სავარაუდოდ აღარ ან ჯერ არ გეხებათ. ზუსტი დადასტურებისთვის მიმართეთ სამხედრო აღრიცხვის ცენტრს.",
      "Based on the age you mentioned, mandatory military service likely does not currently apply to you. For confirmation, contact your military registration center.",
    );
    tone = "positive";
  } else if (typeof profile.age === "number") {
    summary = t(
      language,
      "თქვენ მიერ მითითებული ასაკის მიხედვით, სავალდებულო სამხედრო სამსახურის ვალდებულება შესაძლოა გეხებოდეთ.",
      "Based on the age you mentioned, mandatory military service may apply to you.",
    );
  }

  return appendJourneyBlocks([
    {
      type: "summary",
      title: t(language, "სავარაუდო მარშრუტი", "Likely route"),
      text: summary,
      tone,
    },
    {
      type: "key_facts",
      title: t(language, "მთავარი ფაქტები", "Key facts"),
      items: [
        ...buildProfileFacts(profile, language),
        {
          label: t(language, "ასაკობრივი დიაპაზონი", "Age range"),
          value: t(language, "18–27", "18–27"),
        },
        {
          label: t(language, "აღრიცხვის პერიოდი", "Registration period"),
          value: t(language, "1 იანვარი – 30 აპრილი", "January 1 – April 30"),
        },
        {
          label: t(language, "ჯარიმა", "Penalty"),
          value: t(language, "1,000 GEL გამოუცხადებლობისთვის", "1,000 GEL for failure to appear"),
        },
      ],
    },
    {
      type: "documents",
      title: t(language, "რა მოამზადოთ", "What to prepare"),
      items: [
        t(language, "პირადობის მოწმობა", "National ID card"),
        t(language, "დაბადების მოწმობა", "Birth certificate"),
        t(language, "განათლების დამადასტურებელი დოკუმენტები", "Education documents"),
        t(language, "სამედიცინო დოკუმენტები", "Medical records"),
        t(language, "2 ფოტო (3x4)", "2 photos (3x4 cm)"),
      ],
    },
    {
      type: "next_steps",
      title: t(language, "შემდეგი ნაბიჯები", "Next steps"),
      items: [
        t(language, "მიმართეთ ახლომდებარე სამხედრო აღრიცხვის ცენტრს.", "Contact your nearest military registration center."),
        t(language, "დაადასტურეთ თქვენი რეგისტრაციის სტატუსი და გამოძახების ეტაპი.", "Confirm your registration status and call-up stage."),
        t(language, `საჭიროების შემთხვევაში გამოიყენეთ სამინისტროს ცხელი ხაზი: ${HOTLINE}.`, `If needed, use the MOD hotline: ${HOTLINE}.`),
      ],
    },
  ], "mandatory_service", profile, language);
}

function buildDeferralGuidance(
  profile: CaseProfile,
  language: ChatLanguage,
): GuidanceBlock[] {
  let summary = t(
    language,
    "თქვენი აღწერილობით, ყველაზე რელევანტური მიმართულება გადავადებაა.",
    "Based on your description, the most relevant path is deferral.",
  );

  const facts = [...buildProfileFacts(profile, language)];
  const documents = [t(language, "განაცხადი", "Application form"), t(language, "პირადობის მოწმობა", "National ID card")];
  const nextSteps = [
    t(language, "მოამზადეთ დამადასტურებელი დოკუმენტები.", "Prepare the supporting documents."),
    t(language, "მიმართეთ სამხედრო აღრიცხვის ცენტრს განაცხადით.", "Apply through your military registration center."),
    t(language, `თუ საკითხი ინდივიდუალურ შეფასებას მოითხოვს, დარეკეთ ცხელ ხაზზე: ${HOTLINE}.`, `If the case needs individual review, call the hotline: ${HOTLINE}.`),
  ];

  if (profile.student) {
    summary = t(
      language,
      "თქვენი აღწერილობით, ყველაზე რელევანტური მიმართულება სტუდენტური გადავადებაა.",
      "Based on your description, student deferral looks like the most relevant path.",
    );
    facts.push(
      {
        label: t(language, "სტუდენტური გადავადება", "Student deferral"),
        value: t(language, "მოქმედებს სწავლის დასრულებამდე", "Valid until graduation"),
      },
      {
        label: t(language, "დამატებითი პირობა", "Additional condition"),
        value: t(language, "სტუდენტმა უნდა წარადგინოს ცნობა ყოველწლიურად", "Enrollment certificate must be submitted annually"),
      },
    );
    documents.push(
      t(language, "სწავლის აქტიური სტატუსის ცნობა", "Enrollment certificate"),
    );
  } else if ((profile.childrenCount ?? 0) >= 2) {
    summary = t(
      language,
      "ორი ან მეტი არასრულწლოვანი შვილის არსებობის შემთხვევაში, გადავადების საფუძველი შესაძლოა გქონდეთ.",
      "Having two or more minor children may create grounds for deferral.",
    );
    facts.push({
      label: t(language, "ოჯახური საფუძველი", "Family ground"),
      value: t(language, "2+ არასრულწლოვანი შვილი", "2+ minor children"),
    });
    documents.push(
      t(language, "შვილების დაბადების მოწმობები", "Children's birth certificates"),
    );
  } else {
    facts.push(
      {
        label: t(language, "ფასიანი გადავადება", "Paid deferral"),
        value: t(language, "5,000 GEL, ერთჯერადად, მაქსიმუმ 1 წელი", "5,000 GEL, one-time, maximum 1 year"),
      },
    );
    documents.push(t(language, "გადახდის დამადასტურებელი დოკუმენტი", "Payment confirmation"));
  }

  return appendJourneyBlocks([
    {
      type: "summary",
      title: t(language, "სავარაუდო მარშრუტი", "Likely route"),
      text: summary,
      tone: "warning",
    },
    {
      type: "key_facts",
      title: t(language, "მთავარი ფაქტები", "Key facts"),
      items: facts,
    },
    {
      type: "documents",
      title: t(language, "საჭირო დოკუმენტები", "Required documents"),
      items: documents,
    },
    {
      type: "next_steps",
      title: t(language, "შემდეგი ნაბიჯები", "Next steps"),
      items: nextSteps,
    },
  ], "deferral", profile, language);
}

function buildExemptionGuidance(
  profile: CaseProfile,
  language: ChatLanguage,
): GuidanceBlock[] {
  const facts = [...buildProfileFacts(profile, language)];
  let summary = t(
    language,
    "თქვენი აღწერილობით, გათავისუფლების ან სამედიცინო შეფასების მარშრუტი ჩანს რელევანტური.",
    "Based on your description, exemption or a medical evaluation route looks relevant.",
  );
  const documents = [t(language, "პირადობის მოწმობა", "National ID card")];

  if (profile.foreignService) {
    summary = t(
      language,
      "თუ თქვენ უკვე გაქვთ გავლილი უცხო ქვეყნის სამხედრო სამსახური, გათავისუფლება შესაძლოა დოკუმენტურად დადასტურდეს.",
      "If you have already completed foreign military service, exemption may be available with proper documentation.",
    );
    facts.push({
      label: t(language, "უცხოეთის სამხედრო სამსახური", "Foreign military service"),
      value: t(language, "შესაძლო გათავისუფლების საფუძველი", "Possible ground for exemption"),
    });
    documents.push(
      t(language, "აპოსტილით დამოწმებული და თარგმნილი სამხედრო დოკუმენტები", "Apostilled and translated military service documents"),
    );
  } else if (profile.clergy) {
    summary = t(
      language,
      "თუ ოფიციალურად კურთხეული სასულიერო პირი ხართ, გათავისუფლების საფუძველი შესაძლოა გქონდეთ შესაბამისი ეკლესიური დოკუმენტით.",
      "If you are ordained clergy, you may have exemption grounds with official church documentation.",
    );
    facts.push({
      label: t(language, "საფუძველი", "Ground"),
      value: t(language, "კურთხეული სასულიერო პირი", "Ordained clergy"),
    });
    documents.push(
      t(language, "ეკლესიის ოფიციალური დამადასტურებელი დოკუმენტი", "Official church certification"),
    );
  } else if (profile.warFamilyLoss) {
    summary = t(
      language,
      "თუ ოჯახში სამხედრო სამსახურის ან ომის შედეგად დანაკარგი გაქვთ და შესაბამის კატეგორიაში ხართ, გათავისუფლების საფუძველი შესაძლოა არსებობდეს.",
      "If your family has a military-service or war-related loss and you fall into the relevant category, exemption grounds may exist.",
    );
    facts.push({
      label: t(language, "საფუძველი", "Ground"),
      value: t(language, "ოჯახში სამხედრო ან საომარი დანაკარგი", "Military or war-related family loss"),
    });
    documents.push(
      t(language, "ოჯახური გარემოების დამადასტურებელი ოფიციალური დოკუმენტები", "Official documents proving the family circumstance"),
    );
  } else {
    facts.push(
      {
        label: t(language, "სამედიცინო კატეგორიები", "Medical categories"),
        value: t(language, "5 კატეგორია", "5 categories"),
      },
      {
        label: t(language, "პროცესი", "Process"),
        value: t(language, "ცენტრი → სამედიცინო კომისია → გადაწყვეტილება", "Center → medical commission → decision"),
      },
    );
    documents.push(
      t(language, "სამედიცინო ცნობები და ისტორია", "Medical reports and records"),
    );
  }

  return appendJourneyBlocks([
    {
      type: "summary",
      title: t(language, "სავარაუდო მარშრუტი", "Likely route"),
      text: summary,
      tone: "warning",
    },
    {
      type: "key_facts",
      title: t(language, "მთავარი ფაქტები", "Key facts"),
      items: facts,
    },
    {
      type: "documents",
      title: t(language, "საჭირო დოკუმენტები", "Required documents"),
      items: documents,
    },
    {
      type: "next_steps",
      title: t(language, "შემდეგი ნაბიჯები", "Next steps"),
      items: [
        t(language, "მიმართეთ სამხედრო აღრიცხვის ცენტრს პირველადი შეფასებისთვის.", "Contact the military registration center for initial review."),
        t(language, "საჭიროების შემთხვევაში გაიარეთ სამედიცინო კომისია.", "Complete the medical commission if required."),
        t(language, `თქვენი კონკრეტული შემთხვევისთვის გამოიყენეთ ცხელი ხაზი: ${HOTLINE}.`, `For your specific case, use the hotline: ${HOTLINE}.`),
      ],
    },
  ], "exemption", profile, language);
}

function buildContractGuidance(
  profile: CaseProfile,
  language: ChatLanguage,
): GuidanceBlock[] {
  let summary = t(
    language,
    "თქვენი აღწერილობით, პროფესიული ან საკონტრაქტო სამხედრო სამსახურის მიმართულება ჩანს რელევანტური.",
    "Based on your description, professional or contract military service looks relevant.",
  );

  if (typeof profile.age === "number" && (profile.age < 18 || profile.age > 35)) {
    summary = t(
      language,
      "თქვენ მიერ მითითებული ასაკის მიხედვით, პროფესიული ან საკონტრაქტო სამსახურის ასაკობრივ ზღვარს შესაძლოა სცდებოდეთ. ზუსტი დადასტურებისთვის მიმართეთ სამხედრო აღრიცხვის ცენტრს.",
      "Based on the age you mentioned, you may fall outside the contract service age range. Confirm through the military registration center.",
    );
  }

  return appendJourneyBlocks([
    {
      type: "summary",
      title: t(language, "სავარაუდო მარშრუტი", "Likely route"),
      text: summary,
      tone: "positive",
    },
    {
      type: "key_facts",
      title: t(language, "მთავარი ფაქტები", "Key facts"),
      items: [
        ...buildProfileFacts(profile, language),
        {
          label: t(language, "ასაკობრივი დიაპაზონი", "Age range"),
          value: t(language, "18–35", "18–35"),
        },
        {
          label: t(language, "საწყისი ანაზღაურება", "Starting salary"),
          value: t(language, "1,050 GEL/თვე", "1,050 GEL/month"),
        },
        {
          label: t(language, "კონტრაქტის ვადა", "Contract term"),
          value: t(language, "4 წელი", "4 years"),
        },
      ],
    },
    {
      type: "documents",
      title: t(language, "საჭირო დოკუმენტები", "Required documents"),
      items: [
        t(language, "პირადობის მოწმობა", "National ID card"),
        t(language, "განათლების დამადასტურებელი დოკუმენტი", "Education certificate"),
        t(language, "სამედიცინო ცნობა", "Medical certificate"),
        t(language, "4 ფოტო", "4 photos"),
        t(language, "სამხედრო აღრიცხვის დოკუმენტი", "Military record document"),
      ],
    },
    {
      type: "next_steps",
      title: t(language, "შემდეგი ნაბიჯები", "Next steps"),
      items: [
        t(language, "მიმართეთ სამხედრო აღრიცხვის ცენტრს განაცხადით.", "Apply through your military registration center."),
        t(language, "გაიარეთ სამედიცინო და ფიზიკური შემოწმება.", "Complete the medical and physical evaluations."),
        t(language, "მოამზადეთ გასაუბრებისა და უსაფრთხოების შემოწმებისთვის საჭირო დოკუმენტები.", "Prepare for the interview and background review."),
      ],
    },
  ], "contract_service", profile, language);
}

function buildReserveGuidance(
  profile: CaseProfile,
  language: ChatLanguage,
): GuidanceBlock[] {
  return appendJourneyBlocks([
    {
      type: "summary",
      title: t(language, "სავარაუდო მარშრუტი", "Likely route"),
      text: t(
        language,
        "თუ სამხედრო სამსახური უკვე გავლილი გაქვთ, სავარაუდოდ რეზერვის რეჟიმი გეხებათ.",
        "If you have already completed service, the reserve system is the likely relevant path.",
      ),
      tone: "neutral",
    },
    {
      type: "key_facts",
      title: t(language, "მთავარი ფაქტები", "Key facts"),
      items: [
        ...buildProfileFacts(profile, language),
        {
          label: t(language, "რეზერვის ვადა", "Reserve age"),
          value: t(language, "40 წლამდე სამხედროებისთვის, 50 წლამდე ოფიცრებისთვის", "Up to 40 for enlisted, up to 50 for officers"),
        },
        {
          label: t(language, "სასწავლო შეკრება", "Training"),
          value: t(language, "წლიურად 30 დღემდე", "Up to 30 days per year"),
        },
      ],
    },
    {
      type: "next_steps",
      title: t(language, "შემდეგი ნაბიჯები", "Next steps"),
      items: [
        t(language, "დაადასტურეთ თქვენი რეზერვის სტატუსი სამხედრო აღრიცხვის ცენტრში.", "Confirm your reserve status through the military registration center."),
        t(language, "შეინახეთ სამსახურის დასრულების დამადასტურებელი დოკუმენტები.", "Keep your service completion documents available."),
        t(language, `კონკრეტული შეკითხვისთვის გამოიყენეთ ცხელი ხაზი: ${HOTLINE}.`, `For case-specific questions, use the hotline: ${HOTLINE}.`),
      ],
    },
  ], "reserve", profile, language);
}

function buildDiasporaGuidance(
  profile: CaseProfile,
  language: ChatLanguage,
): GuidanceBlock[] {
  return appendJourneyBlocks([
    {
      type: "summary",
      title: t(language, "სავარაუდო მარშრუტი", "Likely route"),
      text: t(
        language,
        "თქვენი აღწერილობით, დიასპორისა და სამხედრო ვალდებულების საკითხი ჩანს რელევანტური.",
        "Based on your description, the diaspora and military-obligation route looks relevant.",
      ),
      tone: "warning",
    },
    {
      type: "key_facts",
      title: t(language, "მთავარი ფაქტები", "Key facts"),
      items: [
        ...buildProfileFacts(profile, language),
        {
          label: t(language, "ორმაგი მოქალაქეობა", "Dual citizenship"),
          value: t(language, "თავად არ გათავისუფლებთ სამხედრო ვალდებულებისგან", "Does not by itself exempt you from military obligations"),
        },
        {
          label: t(language, "მოქალაქეობის უარყოფა", "Citizenship renunciation"),
          value: t(language, "18–27 წლის მამაკაცებისთვის შეზღუდულია ვალდებულების შეუსრულებლობისას", "Restricted for males 18–27 with unresolved obligations"),
        },
      ],
    },
    {
      type: "next_steps",
      title: t(language, "შემდეგი ნაბიჯები", "Next steps"),
      items: [
        t(language, "დააზუსტეთ გაქვთ თუ არა დასრულებული სამსახური, გადავადება ან გათავისუფლება.", "Confirm whether you have completed service, a deferral, or an exemption."),
        t(language, "რეგისტრაცია და დამუშავება საქართველოში ხდება სამხედრო აღრიცხვის ცენტრში.", "Registration and processing must be handled in Georgia through a military registration center."),
        t(language, "თუ გაქვთ უცხოეთის სამხედრო სამსახურის დოკუმენტები, მოამზადეთ აპოსტილირებული და ნათარგმნი ასლები.", "If you have foreign military service documents, prepare apostilled and translated copies."),
      ],
    },
  ], "diaspora", profile, language);
}

function buildAlternativeGuidance(
  profile: CaseProfile,
  language: ChatLanguage,
): GuidanceBlock[] {
  return appendJourneyBlocks([
    {
      type: "summary",
      title: t(language, "სავარაუდო მარშრუტი", "Likely route"),
      text: t(
        language,
        "თქვენი აღწერილობით, ალტერნატიული სამსახურის პროცესი ჩანს რელევანტური.",
        "Based on your description, the alternative service process looks relevant.",
      ),
      tone: "warning",
    },
    {
      type: "key_facts",
      title: t(language, "მთავარი ფაქტები", "Key facts"),
      items: [
        {
          label: t(language, "ხანგრძლივობა", "Duration"),
          value: t(language, "12 თვე", "12 months"),
        },
        {
          label: t(language, "საფუძველი", "Ground"),
          value: t(language, "რელიგიური ან ეთიკური სინდისის საფუძველი", "Religious or ethical conscientious objection"),
        },
      ],
    },
    {
      type: "documents",
      title: t(language, "საჭირო დოკუმენტები", "Required documents"),
      items: [
        t(language, "განაცხადი", "Application"),
        t(language, "პირადობის მოწმობა", "National ID card"),
        t(language, "სინდისის საფუძვლის წერილობითი განმარტება", "Written statement of conscientious grounds"),
        t(language, "დამადასტურებელი დოკუმენტები", "Supporting documents"),
      ],
    },
    {
      type: "next_steps",
      title: t(language, "შემდეგი ნაბიჯები", "Next steps"),
      items: [
        t(language, "მიმართეთ სამხედრო აღრიცხვის ცენტრს განცხადებით.", "Submit the application through the military registration center."),
        t(language, "მოემზადეთ კომისიის შეფასებისთვის.", "Prepare for commission review."),
      ],
    },
  ], "alternative_service", profile, language);
}

function buildContactGuidance(profile: CaseProfile, language: ChatLanguage): GuidanceBlock[] {
  const cityLine = profile.city
    ? t(
      language,
      `${profile.city}-ში დაგეხმარებათ სამხედრო აღრიცხვის ცენტრი.`,
      `The military registration center in ${profile.city} can help with your case.`,
    )
    : t(
      language,
      "საკონტაქტო ინფორმაციისთვის გამოიყენეთ სამინისტროს ცხელი ხაზი ან სამხედრო აღრიცხვის ცენტრი.",
      "Use the MOD hotline or your military registration center for contact support.",
    );

  return appendJourneyBlocks([
    {
      type: "summary",
      title: t(language, "საკონტაქტო გზა", "Contact path"),
      text: cityLine,
      tone: "neutral",
    },
    {
      type: "key_facts",
      title: t(language, "საჯარო ინფორმაცია", "Public information"),
      items: compactKeyFacts([
        profile.city
          ? { label: t(language, "ქალაქი", "City"), value: profile.city }
          : null,
        { label: t(language, "მისამართი", "Address"), value: t(language, MOD_ADDRESS_KA, MOD_ADDRESS) },
        { label: t(language, "სამუშაო საათები", "Working hours"), value: t(language, MOD_HOURS_KA, MOD_HOURS) },
      ]),
    },
  ], "contact", profile, language);
}

function buildGeneralGuidance(
  profile: CaseProfile,
  language: ChatLanguage,
): GuidanceBlock[] {
  return appendJourneyBlocks([
    {
      type: "summary",
      title: t(language, "როგორ დაგეხმაროთ უკეთ", "How to help you better"),
      text: t(
        language,
        "თუ მომწერთ ასაკს, სტატუსს და საკითხის ტიპს, უფრო ზუსტ მარშრუტს და შემდეგ ნაბიჯებს გაჩვენებთ.",
        "If you share your age, status, and topic, I can show a more precise route and next steps.",
      ),
      tone: "neutral",
    },
    {
      type: "next_steps",
      title: t(language, "სასარგებლო დეტალები", "Helpful details"),
      items: [
        t(language, "ასაკი", "Age"),
        t(language, "სტუდენტის სტატუსი ან ოჯახური მდგომარეობა", "Student status or family situation"),
        t(language, "გაინტერესებთ გადავადება, გათავისუფლება, საკონტრაქტო სამსახური თუ სხვა თემა", "Whether you need deferral, exemption, contract service, or another topic"),
      ],
    },
  ], "general", profile, language);
}

function compactKeyFacts(
  items: Array<{ label: string; value: string } | null>,
): Array<{ label: string; value: string }> {
  return items.filter(Boolean) as Array<{ label: string; value: string }>;
}

function uniqueStrings(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function journeyLabel(journey: JourneyId, language: ChatLanguage): string {
  const labels: Record<JourneyId, { ka: string; en: string }> = {
    mandatory_service: {
      ka: "სავალდებულო სამხედრო სამსახური",
      en: "Mandatory military service",
    },
    deferral: { ka: "გადავადება", en: "Deferral" },
    exemption: { ka: "გათავისუფლება", en: "Exemption" },
    contract_service: { ka: "საკონტრაქტო სამსახური", en: "Contract service" },
    reserve: { ka: "რეზერვი", en: "Reserve" },
    diaspora: { ka: "დიასპორის საკითხი", en: "Diaspora and military obligation" },
    alternative_service: { ka: "ალტერნატიული სამსახური", en: "Alternative service" },
    contact: { ka: "საკონტაქტო და მიმართვის გზა", en: "Contact and routing" },
    general: { ka: "ზოგადი სამხედრო საკითხი", en: "General military-service guidance" },
  };

  return language === "ka" ? labels[journey].ka : labels[journey].en;
}

function journeySectionLabel(journey: JourneyId, language: ChatLanguage): string {
  const sections: Record<JourneyId, { ka: string; en: string }> = {
    mandatory_service: {
      ka: "ცოდნის ბაზა — ნაწილი 2: სავალდებულო სამხედრო სამსახური",
      en: "Knowledge base — Section 2: Mandatory military service",
    },
    deferral: {
      ka: "ცოდნის ბაზა — ნაწილი 3: გადავადება",
      en: "Knowledge base — Section 3: Deferrals",
    },
    exemption: {
      ka: "ცოდნის ბაზა — ნაწილი 4: გათავისუფლება",
      en: "Knowledge base — Section 4: Exemptions",
    },
    alternative_service: {
      ka: "ცოდნის ბაზა — ნაწილი 5: ალტერნატიული სამსახური",
      en: "Knowledge base — Section 5: Alternative service",
    },
    contract_service: {
      ka: "ცოდნის ბაზა — ნაწილი 6: საკონტრაქტო სამსახური",
      en: "Knowledge base — Section 6: Contract service",
    },
    reserve: {
      ka: "ცოდნის ბაზა — ნაწილი 7: რეზერვი",
      en: "Knowledge base — Section 7: Reserve forces",
    },
    diaspora: {
      ka: "ცოდნის ბაზა — ნაწილი 9: მოქალაქეობა და სამხედრო ვალდებულება",
      en: "Knowledge base — Section 9: Citizenship and military obligations",
    },
    contact: {
      ka: "ცოდნის ბაზა — ნაწილი 1: საკონტაქტო ინფორმაცია",
      en: "Knowledge base — Section 1: Contact information",
    },
    general: {
      ka: "ცოდნის ბაზა — ნაწილი 10: ხშირად დასმული კითხვები",
      en: "Knowledge base — Section 10: FAQ",
    },
  };

  return language === "ka" ? sections[journey].ka : sections[journey].en;
}

function buildMissingInfo(
  journey: JourneyId,
  profile: CaseProfile,
  language: ChatLanguage,
): string[] {
  const missing: string[] = [];

  const pushAge = () => {
    if (typeof profile.age !== "number") {
      missing.push(t(language, "ასაკი", "Age"));
    }
  };

  switch (journey) {
    case "mandatory_service":
      pushAge();
      if (!profile.city) missing.push(t(language, "რეგისტრაციის ქალაქი", "Registration city"));
      if (profile.student === undefined) missing.push(t(language, "სტუდენტის სტატუსი", "Student status"));
      missing.push(t(language, "ოფიციალური გამოძახების სტატუსი", "Official summons status"));
      break;
    case "deferral":
      if (
        !profile.student && (profile.childrenCount ?? 0) < 2 && !profile.singleFather &&
        !profile.soleProvider && !profile.disabledDependent
      ) {
        missing.push(t(language, "გადავადების ზუსტი საფუძველი", "Exact deferral ground"));
      }
      if (profile.student && !profile.city) missing.push(t(language, "უნივერსიტეტი ან რეგისტრაციის ქალაქი", "University or registration city"));
      if ((profile.childrenCount ?? 0) === 0 && !profile.student) {
        missing.push(t(language, "ოჯახური გარემოების დამადასტურებელი ფაქტები", "Family-circumstance details"));
      }
      break;
    case "exemption":
      if (!profile.healthIssue && !profile.foreignService && !profile.clergy && !profile.warFamilyLoss) {
        missing.push(t(language, "გათავისუფლების ზუსტი საფუძველი", "Exact exemption ground"));
      }
      missing.push(t(language, "ოფიციალური დამადასტურებელი დოკუმენტები", "Official supporting documents"));
      break;
    case "contract_service":
      pushAge();
      if (!profile.city) missing.push(t(language, "სარეგისტრაციო ქალაქი", "Registration city"));
      missing.push(t(language, "განათლება", "Education level"));
      missing.push(t(language, "ფიზიკური და სამედიცინო მზადყოფნა", "Physical and medical readiness"));
      break;
    case "reserve":
      if (!profile.completedService) missing.push(t(language, "გავლილი სამსახურის დადასტურება", "Proof of completed service"));
      if (!profile.city) missing.push(t(language, "რეზერვის აღრიცხვის ქალაქი", "Reserve registration city"));
      break;
    case "diaspora":
      pushAge();
      if (!profile.dualCitizen) missing.push(t(language, "მოქალაქეობის ზუსტი სტატუსი", "Exact citizenship status"));
      if (!profile.foreignService) missing.push(t(language, "უცხოეთში სამხედრო სამსახურის არსებობა", "Whether foreign military service exists"));
      break;
    case "alternative_service":
      missing.push(t(language, "რელიგიური ან ეთიკური საფუძვლის ფორმულირება", "Religious or ethical grounds statement"));
      missing.push(t(language, "დამადასტურებელი წერილი ან განმარტება", "Supporting letter or statement"));
      break;
    case "contact":
      if (!profile.city) missing.push(t(language, "რომელი ქალაქიდან უკავშირდებით", "Which city you are contacting from"));
      missing.push(t(language, "საკითხის ტიპი", "The topic you need routed"));
      break;
    case "general":
      pushAge();
      if (profile.student === undefined) missing.push(t(language, "სტატუსი", "Status"));
      missing.push(t(language, "საკითხის ტიპი", "Topic"));
      break;
  }

  return uniqueStrings(missing).slice(0, 4);
}

function buildVerificationNote(
  journey: JourneyId,
  profile: CaseProfile,
  language: ChatLanguage,
): GuidanceBlock {
  const items = uniqueStrings([
    (() => {
      switch (journey) {
        case "mandatory_service":
          return t(language, "ოფიციალურად დასადასტურებელია, უკვე ხართ თუ არა აღრიცხვაზე და გამოგზავნილია თუ არა გამოძახება.", "Official confirmation is still needed on whether you are registered and whether a summons has already been issued.");
        case "deferral":
          return t(language, "გადავადება ძალაში შედის მხოლოდ შესაბამისი საფუძვლისა და დოკუმენტების ოფიციალური შემოწმების შემდეგ.", "Deferral becomes effective only after the relevant ground and documents are officially reviewed.");
        case "exemption":
          return t(language, "გათავისუფლების შედეგი საბოლოოდ დგინდება მხოლოდ კომისიის ან უფლებამოსილი ორგანოს გადაწყვეტილებით.", "Exemption is final only after a commission or other authorized body issues a decision.");
        case "contract_service":
          return t(language, "საკონტრაქტო სამსახურში მიღება დამოკიდებულია სამედიცინო, ფიზიკურ და უსაფრთხოების შემოწმებაზე.", "Acceptance into contract service depends on medical, physical, and background review.");
        case "reserve":
          return t(language, "რეზერვის სტატუსი და ვალდებულებები უნდა გადაამოწმოთ სამხედრო აღრიცხვის ცენტრში.", "Reserve status and obligations should be confirmed through the military registration center.");
        case "diaspora":
          return t(language, "საზღვარგარეთ ყოფნა ან ორმაგი მოქალაქეობა ავტომატურად არ წყვეტს სამხედრო ვალდებულებას.", "Living abroad or holding dual citizenship does not automatically resolve military obligations.");
        case "alternative_service":
          return t(language, "ალტერნატიული სამსახურის საფუძველი განისაზღვრება ოფიციალური განაცხადისა და კომისიის შეფასებით.", "Alternative service depends on an official application and commission review.");
        case "contact":
          return t(language, "ქალაქისა და საკითხის ტიპის მიხედვით შეიძლება სხვადასხვა აღრიცხვის ცენტრი ან ცხელი ხაზი იყოს საჭირო.", "Routing may differ by city and by the type of issue.");
        default:
          return t(language, "ზუსტი პასუხისთვის საჭიროა თქვენი გარემოებების ოფიციალური გადამოწმება შესაბამის ცენტრში.", "A precise answer still requires official confirmation of your circumstances through the appropriate center.");
      }
    })(),
    (() => {
      const missing = buildMissingInfo(journey, profile, language);
      if (missing.length === 0) return "";
      return t(language, `დასაზუსტებელია: ${missing.join(", ")}.`, `Still to confirm: ${missing.join(", ")}.`);
    })(),
  ]);

  return {
    type: "verification_note",
    title: t(language, "ოფიციალური დადასტურება", "Official confirmation"),
    items,
    tone: "warning",
  };
}

function buildPrimaryDocuments(
  journey: JourneyId,
  profile: CaseProfile,
  language: ChatLanguage,
): string[] {
  switch (journey) {
    case "mandatory_service":
      return [
        t(language, "პირადობის მოწმობა", "National ID card"),
        t(language, "დაბადების მოწმობა", "Birth certificate"),
        t(language, "სამედიცინო დოკუმენტები", "Medical records"),
      ];
    case "deferral":
      if (profile.student) {
        return [
          t(language, "პირადობის მოწმობა", "National ID card"),
          t(language, "სწავლის აქტიური სტატუსის ცნობა", "Enrollment certificate"),
          t(language, "ტრანსკრიპტი ან საჭირო დამატებითი ცნობა", "Transcript or supporting certificate"),
        ];
      }

      if ((profile.childrenCount ?? 0) >= 2) {
        return [
          t(language, "პირადობის მოწმობა", "National ID card"),
          t(language, "შვილების დაბადების მოწმობები", "Children's birth certificates"),
          t(language, "განაცხადი", "Application form"),
        ];
      }

      if (profile.soleProvider || profile.singleFather || profile.disabledDependent) {
        return [
          t(language, "პირადობის მოწმობა", "National ID card"),
          t(language, "დამოკიდებულების ან მოვლის დამადასტურებელი დოკუმენტები", "Dependency or caregiver documents"),
          t(language, "განაცხადი", "Application form"),
        ];
      }

      return [
        t(language, "პირადობის მოწმობა", "National ID card"),
        t(language, "გადახდის დამადასტურებელი დოკუმენტი", "Payment confirmation"),
        t(language, "განაცხადი", "Application form"),
      ];
    case "exemption":
      if (profile.foreignService) {
        return [
          t(language, "უცხოეთის სამხედრო სამსახურის დამადასტურებელი დოკუმენტი", "Foreign military service certificate"),
          t(language, "აპოსტილი და ქართული თარგმანი", "Apostille and Georgian translation"),
          t(language, "პირადობის მოწმობა", "National ID card"),
        ];
      }

      if (profile.clergy) {
        return [
          t(language, "ეკლესიის ოფიციალური დოკუმენტი", "Official church certification"),
          t(language, "პირადობის მოწმობა", "National ID card"),
        ];
      }

      return [
        t(language, "სამედიცინო დოკუმენტები", "Medical records"),
        t(language, "კომისიის შედეგები", "Medical commission results"),
        t(language, "პირადობის მოწმობა", "National ID card"),
      ];
    case "contract_service":
      return [
        t(language, "პირადობის მოწმობა", "National ID card"),
        t(language, "განათლების დამადასტურებელი დოკუმენტი", "Education certificate"),
        t(language, "სამედიცინო ცნობა", "Medical certificate"),
      ];
    case "reserve":
      return [
        t(language, "სამხედრო სამსახურის დასრულების დოკუმენტი", "Service completion document"),
        t(language, "პირადობის მოწმობა", "National ID card"),
      ];
    case "diaspora":
      return [
        t(language, "მოქალაქეობის დამადასტურებელი დოკუმენტები", "Citizenship documents"),
        t(language, "უცხოეთის სამხედრო დოკუმენტები, თუ არსებობს", "Foreign military documents if applicable"),
        t(language, "აპოსტილი და ქართული თარგმანი", "Apostille and Georgian translation"),
      ];
    case "alternative_service":
      return [
        t(language, "განაცხადი", "Application"),
        t(language, "სინდისის საფუძვლის წერილობითი განმარტება", "Written statement of conscientious grounds"),
        t(language, "დამადასტურებელი წერილი ან დოკუმენტი", "Supporting letter or document"),
      ];
    case "contact":
      return [
        t(language, "კითხვა ან საქმის მოკლე აღწერა", "Short description of the issue"),
        t(language, "პირადი ნომერი მხოლოდ მოთხოვნის შემთხვევაში", "Personal ID only if requested"),
      ];
    default:
      return [
        t(language, "ასაკი და სტატუსი", "Age and status"),
        t(language, "საკითხის მოკლე აღწერა", "Short issue summary"),
      ];
  }
}

function buildRecommendedAction(
  journey: JourneyId,
  profile: CaseProfile,
  language: ChatLanguage,
): string {
  switch (journey) {
    case "mandatory_service":
      return t(language, "დაადასტურეთ თქვენი აღრიცხვისა და გამოძახების სტატუსი სამხედრო აღრიცხვის ცენტრში.", "Confirm your registration and summons status through the military registration center.");
    case "deferral":
      return t(language, "გააგზავნეთ ან მიიტანეთ შესაბამისი გადავადების საფუძვლის დამადასტურებელი დოკუმენტები აღრიცხვის ცენტრში.", "Submit the supporting documents for your deferral ground to the registration center.");
    case "exemption":
      return t(language, "შეაგროვეთ ოფიციალური დამადასტურებელი დოკუმენტები და მოითხოვეთ კომისიის ან ცენტრის შეფასება.", "Collect the official supporting documents and request commission or center review.");
    case "contract_service":
      return t(language, "დაიწყეთ განაცხადი სამხედრო აღრიცხვის ცენტრში და მოემზადეთ ფიზიკური და სამედიცინო შემოწმებისთვის.", "Start the application at the military registration center and prepare for medical and physical screening.");
    case "reserve":
      return t(language, "გადაამოწმეთ რეზერვის სტატუსი და საკონტაქტო ინფორმაცია თქვენს აღრიცხვის ცენტრში.", "Verify your reserve status and contact details with your registration center.");
    case "diaspora":
      return t(language, "დააზუსტეთ მოქალაქეობისა და სამხედრო სტატუსის დოკუმენტები და შემდეგ დაუკავშირდით აღრიცხვის ცენტრს საქართველოში.", "Confirm your citizenship and military-status documents, then contact the registration center in Georgia.");
    case "alternative_service":
      return t(language, "მოამზადეთ წერილობითი განმარტება და წარადგინეთ განაცხადი ალტერნატიული სამსახურისთვის.", "Prepare the written statement and submit the alternative-service application.");
    case "contact":
      return profile.city
        ? t(language, `${profile.city}-ში შესაბამისი სამხედრო აღრიცხვის ცენტრი ან სამინისტროს ცხელი ხაზი გამოიყენეთ.`, `Use the appropriate military registration center in ${profile.city} or the MOD hotline.`)
        : t(language, "საკითხის სწრაფი გადამისამართებისთვის გამოიყენეთ სამინისტროს ცხელი ხაზი.", "Use the MOD hotline for the fastest routing.");
    default:
      return t(language, "მომწერეთ ასაკი, სტატუსი და საკითხის ტიპი, რათა ზუსტი მარშრუტი განვსაზღვროთ.", "Share your age, status, and topic so the likely route can be narrowed down.");
  }
}

function buildFactsSummary(profile: CaseProfile, language: ChatLanguage): string {
  const facts = buildProfileFacts(profile, language);
  if (facts.length === 0) {
    return t(language, "ჯერ მხოლოდ ზოგადი კითხვა არის აღწერილი.", "Only a general question has been provided so far.");
  }

  return facts.map((item) => `${item.label}: ${item.value}`).join("; ");
}

function buildContactPath(profile: CaseProfile, language: ChatLanguage): string {
  if (profile.city) {
    return t(
      language,
      `${profile.city}-ის სამხედრო აღრიცხვის ცენტრი ან ცხელი ხაზი ${HOTLINE}`,
      `${profile.city} military registration center or hotline ${HOTLINE}`,
    );
  }

  return t(
    language,
    `სამხედრო აღრიცხვის ცენტრი ან ცხელი ხაზი ${HOTLINE}`,
    `Military registration center or hotline ${HOTLINE}`,
  );
}

function buildHandoffSummary(
  journey: JourneyId,
  profile: CaseProfile,
  language: ChatLanguage,
): GuidanceBlock {
  const missing = buildMissingInfo(journey, profile, language);
  const documents = buildPrimaryDocuments(journey, profile, language);
  const fields = [
    {
      label: t(language, "საკითხი", "Topic"),
      value: journeyLabel(journey, language),
    },
    {
      label: t(language, "მითითებული ფაქტები", "Facts provided"),
      value: buildFactsSummary(profile, language),
    },
    {
      label: t(language, "დასაზუსტებელი", "Still to confirm"),
      value: missing.length > 0
        ? missing.join("; ")
        : t(language, "შემდეგი ეტაპი არის ოფიციალური დადასტურება.", "The next step is official confirmation."),
    },
    {
      label: t(language, "მოამზადეთ", "Prepare now"),
      value: documents.join("; "),
    },
    {
      label: t(language, "რეკომენდებული შემდეგი ნაბიჯი", "Recommended next step"),
      value: buildRecommendedAction(journey, profile, language),
    },
    {
      label: t(language, "საკონტაქტო გზა", "Contact path"),
      value: buildContactPath(profile, language),
    },
  ];

  const copyText = [
    t(language, "საქმის მოკლე შეჯამება", "Case summary"),
    ...fields.map((field) => `${field.label}: ${field.value}`),
  ].join("\n");

  return {
    type: "handoff_summary",
    title: t(language, "ოპერატორისთვის მოკლე შეჯამება", "Operator-ready summary"),
    summary: t(
      language,
      "ეს მოკლე ტექსტი შეგიძლიათ გაუზიაროთ სამინისტროს ოპერატორს ან შესაბამის ცენტრს.",
      "You can share this short summary with a MOD operator or the relevant center.",
    ),
    fields,
    copyText,
    copyLabel: t(language, "კოპირება", "Copy"),
    copiedLabel: t(language, "დაკოპირდა", "Copied"),
  };
}

function buildSourceBlock(
  journey: JourneyId,
  language: ChatLanguage,
): GuidanceBlock {
  return {
    type: "sources",
    title: t(language, "ოფიციალური წყარო", "Official source"),
    items: [
      {
        label: t(language, "ძირითადი წყარო", "Primary source"),
        detail: journeySectionLabel(journey, language),
        href: MOD_WEBSITE,
      },
      {
        label: t(language, "საჯარო ვებგვერდი", "Public website"),
        detail: MOD_WEBSITE,
        href: MOD_WEBSITE,
      },
    ],
  };
}

function appendJourneyBlocks(
  baseBlocks: GuidanceBlock[],
  journey: JourneyId,
  profile: CaseProfile,
  language: ChatLanguage,
): GuidanceBlock[] {
  return compactBlocks([
    ...baseBlocks,
    buildVerificationNote(journey, profile, language),
    buildHandoffSummary(journey, profile, language),
    buildContactCard(language),
    buildSourceBlock(journey, language),
    buildFollowUpChips(journey, language),
  ]);
}

function buildContactCard(language: ChatLanguage): GuidanceBlock {
  return {
    type: "contact_card",
    title: t(language, "საჯარო კონტაქტი", "Public contact"),
    contacts: [
      {
        label: t(language, "ცხელი ხაზი", "Hotline"),
        value: HOTLINE,
        href: "tel:+995322721000",
      },
      {
        label: t(language, "ელფოსტა", "Email"),
        value: INFO_EMAIL,
        href: `mailto:${INFO_EMAIL}`,
      },
      {
        label: t(language, "მისამართი", "Address"),
        value: t(language, MOD_ADDRESS_KA, MOD_ADDRESS),
        href: MOD_MAPS_URL,
      },
      {
        label: t(language, "სამუშაო საათები", "Working hours"),
        value: t(language, MOD_HOURS_KA, MOD_HOURS),
      },
      {
        label: t(language, "ვებგვერდი", "Website"),
        value: MOD_WEBSITE,
        href: MOD_WEBSITE,
      },
    ],
  };
}

function buildFollowUpChips(
  journey: JourneyId,
  language: ChatLanguage,
): GuidanceBlock {
  const ka: Record<JourneyId, Array<{ label: string; prompt: string }>> = {
    mandatory_service: [
      { label: "რა დოკუმენტები მჭირდება?", prompt: "სავალდებულო სამსახურისთვის რა დოკუმენტები მჭირდება?" },
      { label: "როდის იწყება გაწვევა?", prompt: "გაწვევა როდის იწყება?" },
      { label: "ჯარიმა რამდენია?", prompt: "გამოუცხადებლობის ჯარიმა რამდენია?" },
    ],
    deferral: [
      { label: "სტუდენტური გადავადება", prompt: "სტუდენტური გადავადების პირობები მითხარით." },
      { label: "ფასიანი გადავადება", prompt: "ფასიანი გადავადების პირობები მითხარით." },
      { label: "რა საბუთებია საჭირო?", prompt: "გადავადებისთვის რა საბუთებია საჭირო?" },
    ],
    exemption: [
      { label: "სამედიცინო კომისია", prompt: "სამედიცინო კომისიის პროცესი მითხარით." },
      { label: "კატეგორიები", prompt: "სამედიცინო კატეგორიები რა არის?" },
      { label: "უცხოეთის სამსახური", prompt: "უცხოეთში გავლილი სამხედრო სამსახური გათავისუფლების საფუძველია?" },
    ],
    contract_service: [
      { label: "ხელფასი", prompt: "საკონტრაქტო სამსახურის ხელფასი რა არის?" },
      { label: "რა პირობებია?", prompt: "საკონტრაქტო სამსახურის პირობები მითხარით." },
      { label: "რა საბუთებია საჭირო?", prompt: "საკონტრაქტო სამსახურისთვის რა საბუთებია საჭირო?" },
    ],
    reserve: [
      { label: "რეზერვის ვადა", prompt: "რეზერვში რამდენ ხანს ვრჩები?" },
      { label: "შეკრება რამდენია?", prompt: "რეზერვის სასწავლო შეკრება რამდენ ხანს გრძელდება?" },
      { label: "მობილიზაცია", prompt: "მობილიზაციის დროს რა ვალდებულება მაქვს?" },
    ],
    diaspora: [
      { label: "ორმაგი მოქალაქეობა", prompt: "ორმაგი მოქალაქეობა სამხედრო ვალდებულებას მიხსნის?" },
      { label: "მოქალაქეობის უარყოფა", prompt: "მოქალაქეობის უარყოფა შემიძლია?" },
      { label: "უცხოეთიდან რა ვქნა?", prompt: "საზღვარგარეთ ვარ და რა უნდა გავაკეთო?" },
    ],
    alternative_service: [
      { label: "ხანგრძლივობა", prompt: "ალტერნატიული სამსახური რამდენი თვეა?" },
      { label: "რა სფეროებია?", prompt: "ალტერნატიული სამსახურის სფეროები მითხარით." },
      { label: "რა საბუთებია საჭირო?", prompt: "ალტერნატიული სამსახურისთვის რა საბუთებია საჭირო?" },
    ],
    contact: [
      { label: "ცხელი ხაზი", prompt: "სამინისტროს ცხელი ხაზის ნომერი მომწერეთ." },
      { label: "მისამართი", prompt: "სამინისტროს მისამართი მომწერეთ." },
      { label: "აღრიცხვის ცენტრი", prompt: "სამხედრო აღრიცხვის ცენტრის შესახებ ინფორმაცია მინდა." },
    ],
    general: [
      { label: "გადავადება", prompt: "გადავადების პირობები მითხარით." },
      { label: "გათავისუფლება", prompt: "გათავისუფლების პირობები მითხარით." },
      { label: "საკონტრაქტო სამსახური", prompt: "საკონტრაქტო სამსახურის პირობები მითხარით." },
    ],
  };

  const en: Record<JourneyId, Array<{ label: string; prompt: string }>> = {
    mandatory_service: [
      { label: "Required documents", prompt: "What documents are required for mandatory service?" },
      { label: "Call-up date", prompt: "When does the call-up start?" },
      { label: "Penalty", prompt: "What is the penalty for not appearing?" },
    ],
    deferral: [
      { label: "Student deferral", prompt: "Tell me about student deferral." },
      { label: "Paid deferral", prompt: "Tell me about paid deferral." },
      { label: "Required documents", prompt: "What documents are needed for deferral?" },
    ],
    exemption: [
      { label: "Medical commission", prompt: "Explain the medical commission process." },
      { label: "Fitness categories", prompt: "What are the medical fitness categories?" },
      { label: "Foreign service", prompt: "Does foreign military service qualify for exemption?" },
    ],
    contract_service: [
      { label: "Salary", prompt: "What is the starting salary for contract service?" },
      { label: "Requirements", prompt: "What are the contract service requirements?" },
      { label: "Documents", prompt: "What documents are needed for contract service?" },
    ],
    reserve: [
      { label: "Reserve age", prompt: "How long do I stay in reserve?" },
      { label: "Training", prompt: "How long is reserve training?" },
      { label: "Mobilization", prompt: "What are my obligations during mobilization?" },
    ],
    diaspora: [
      { label: "Dual citizenship", prompt: "Does dual citizenship exempt me from service?" },
      { label: "Renunciation", prompt: "Can I renounce Georgian citizenship?" },
      { label: "Living abroad", prompt: "I live abroad. What should I do?" },
    ],
    alternative_service: [
      { label: "Duration", prompt: "How long is alternative service?" },
      { label: "Sectors", prompt: "Which sectors are available for alternative service?" },
      { label: "Documents", prompt: "What documents are needed for alternative service?" },
    ],
    contact: [
      { label: "Hotline", prompt: "What is the MOD hotline number?" },
      { label: "Address", prompt: "What is the MOD address?" },
      { label: "Registration center", prompt: "Tell me about the military registration center." },
    ],
    general: [
      { label: "Deferral", prompt: "Tell me about deferral." },
      { label: "Exemption", prompt: "Tell me about exemption." },
      { label: "Contract service", prompt: "Tell me about contract service." },
    ],
  };

  return {
    type: "follow_up_chips",
    items: language === "ka" ? ka[journey] : en[journey],
  };
}

function compactBlocks(blocks: Array<GuidanceBlock | null>): GuidanceBlock[] {
  return blocks.filter(Boolean).map((block) => block as GuidanceBlock);
}

export function buildGuidanceMetadata(
  messages: ChatMessage[],
  language: ChatLanguage,
): { journey: JourneyId; blocks: GuidanceBlock[] } {
  const profile = extractProfile(messages);
  const journey = detectJourney(messages, profile);

  const blocks = (() => {
    switch (journey) {
      case "mandatory_service":
        return buildMandatoryGuidance(profile, language);
      case "deferral":
        return buildDeferralGuidance(profile, language);
      case "exemption":
        return buildExemptionGuidance(profile, language);
      case "contract_service":
        return buildContractGuidance(profile, language);
      case "reserve":
        return buildReserveGuidance(profile, language);
      case "diaspora":
        return buildDiasporaGuidance(profile, language);
      case "alternative_service":
        return buildAlternativeGuidance(profile, language);
      case "contact":
        return buildContactGuidance(profile, language);
      default:
        return buildGeneralGuidance(profile, language);
    }
  })();

  return { journey, blocks };
}
