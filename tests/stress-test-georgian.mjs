/**
 * Nika (ნიკა) — Georgian Language Stress Test Suite
 *
 * Tests the MOD assistant's ability to handle diverse Georgian-language
 * questions across all knowledge domains. Validates:
 *  - Correct factual content (fees, durations, ages, deadlines)
 *  - Georgian formal register (თქვენ-form)
 *  - Boundary handling (off-topic, political, personal legal advice)
 *  - Edge cases (typos, mixed language, slang)
 */

import { askEdgeChat } from "./_shared.mjs";

/* ── Helper: call Nika ── */
async function askNika(question, language = "ka") {
  return askEdgeChat(question, { language });
}

/* ── Test definitions ── */
const tests = [
  // ═══════════════════════════════════════════
  // SECTION 1: Mandatory Service Questions
  // ═══════════════════════════════════════════
  {
    id: 1,
    category: "სავალდებულო სამსახური",
    question: "ვინ არის ვალდებული გაიაროს სამხედრო სამსახური?",
    mustContain: ["18", "27"],
    mustNotContain: ["შენ", "გინდა"],
    description: "Basic eligibility — must mention age range 18-27",
  },
  {
    id: 2,
    category: "სავალდებულო სამსახური",
    question: "რამდენი თვე გრძელდება საბრძოლო ნაწილებში სამსახური?",
    mustContain: ["6"],
    description: "Combat unit duration — must say 6 months",
  },
  {
    id: 3,
    category: "სავალდებულო სამსახური",
    question: "რა მოხდება თუ სამხედრო გამოძახებაზე არ გამოვცხადდები?",
    mustContain: ["1,000", "1000", "ჯარიმა"],
    mustContainAny: true,
    description: "Penalty for non-appearance — must mention 1000 GEL fine",
  },
  {
    id: 4,
    category: "სავალდებულო სამსახური",
    question: "აღრიცხვა როდის ხდება ყოველწლიურად?",
    mustContain: ["იანვ", "აპრილ"],
    description: "Registration period — Jan 1 to Apr 30",
  },
  {
    id: 5,
    category: "სავალდებულო სამსახური",
    question: "უმცროსი მეთაურის კურსი რამდენი თვეა?",
    mustContain: ["11"],
    description: "Junior commander specialty — 11 months",
  },

  // ═══════════════════════════════════════════
  // SECTION 2: Deferral Questions
  // ═══════════════════════════════════════════
  {
    id: 6,
    category: "გადავადება",
    question: "გადავადება რა ღირს?",
    mustContain: ["5,000", "5000"],
    mustContainAny: true,
    description: "Deferral fee — must say 5,000 GEL",
  },
  {
    id: 7,
    category: "გადავადება",
    question: "რამდენჯერ შეიძლება გადავადების გადახდა?",
    mustContain: ["ერთ"],
    description: "One-time only deferral",
  },
  {
    id: 8,
    category: "გადავადება",
    question: "სტუდენტი ვარ, შემიძლია გადავადება?",
    mustContain: ["სტუდენტ"],
    description: "Student deferral path",
  },
  {
    id: 9,
    category: "გადავადება",
    question: "ორი შვილი მყავს, გადავადდება სამსახური?",
    mustContain: ["შვილ", "2"],
    mustContainAny: true,
    description: "Two children — deferral ground",
  },
  {
    id: 10,
    category: "გადავადება",
    question: "მაქსიმუმ რა ვადით ხდება ფასიანი გადავადება?",
    mustContain: ["1"],
    description: "Max deferral period — 1 year",
  },

  // ═══════════════════════════════════════════
  // SECTION 3: Exemption Questions
  // ═══════════════════════════════════════════
  {
    id: 11,
    category: "გათავისუფლება",
    question: "ჯანმრთელობის პრობლემა მაქვს, შეიძლება გათავისუფლება?",
    mustContain: ["სამედიცინო", "კომისია", "კატეგორია"],
    mustContainAny: true,
    description: "Medical exemption — must mention medical commission or categories",
  },
  {
    id: 12,
    category: "გათავისუფლება",
    question: "რამდენი სამედიცინო ვარგისიანობის კატეგორია არსებობს?",
    mustContain: ["5"],
    description: "5 medical fitness categories",
  },
  {
    id: 13,
    category: "გათავისუფლება",
    question: "საზღვარგარეთ სამხედრო სამსახური გავლილი მაქვს, ვალდებული ვარ?",
    mustContain: ["გათავისუფლ"],
    description: "Foreign military service exemption",
  },
  {
    id: 14,
    category: "გათავისუფლება",
    question: "ჩემი ძმა ომში დაიღუპა, მაქვს გათავისუფლების უფლება?",
    mustContain: ["ერთადერთი", "შვილ"],
    mustContainAny: true,
    description: "Only son with war casualty — exemption",
  },

  // ═══════════════════════════════════════════
  // SECTION 4: Alternative Service
  // ═══════════════════════════════════════════
  {
    id: 15,
    category: "ალტერნატიული სამსახური",
    question: "რელიგიური მიზეზით არ მინდა იარაღის ატანა, რა ვქნა?",
    mustContain: ["ალტერნატიულ"],
    description: "Conscientious objection — alternative service",
  },
  {
    id: 16,
    category: "ალტერნატიული სამსახური",
    question: "ალტერნატიული სამსახური რამდენი თვეა?",
    mustContain: ["12"],
    description: "Alternative service duration — 12 months",
  },
  {
    id: 17,
    category: "ალტერნატიული სამსახური",
    question: "ალტერნატიული სამსახურის რა სფეროები არსებობს?",
    mustContain: ["სოციალურ", "გარემო", "სასწრაფო", "სამშენებლო", "სოფლის"],
    mustContainAny: true,
    description: "Alternative service sectors",
  },

  // ═══════════════════════════════════════════
  // SECTION 5: Professional/Contract Service
  // ═══════════════════════════════════════════
  {
    id: 18,
    category: "საკონტრაქტო სამსახური",
    question: "როგორ შევიდე ჯარში პროფესიულად?",
    mustContain: ["18", "35"],
    description: "Professional service eligibility — ages 18-35",
  },
  {
    id: 19,
    category: "საკონტრაქტო სამსახური",
    question: "რა ხელფასი აქვს კონტრაქტიორ ჯარისკაცს?",
    mustContain: ["1,050", "1050"],
    mustContainAny: true,
    description: "Minimum salary — 1,050 GEL",
  },
  {
    id: 20,
    category: "საკონტრაქტო სამსახური",
    question: "კონტრაქტი რამდენი წლით ფორმდება?",
    mustContain: ["4"],
    description: "Contract term — 4 years",
  },
  {
    id: 21,
    category: "საკონტრაქტო სამსახური",
    question: "ქალს შეუძლია ჯარში სამსახური?",
    mustContain: ["ქალ", "ნებაყოფლობით", "პროფესიულ", "საკონტრაქტო"],
    mustContainAny: true,
    description: "Women in military — voluntary professional service",
  },

  // ═══════════════════════════════════════════
  // SECTION 6: Compensation & Benefits
  // ═══════════════════════════════════════════
  {
    id: 22,
    category: "კომპენსაცია",
    question: "დაჭრილ ჯარისკაცს რა კომპენსაცია ეძლევა?",
    mustContain: ["20,000", "20000"],
    mustContainAny: true,
    description: "Wounded soldier compensation — 20,000 GEL",
  },
  {
    id: 23,
    category: "კომპენსაცია",
    question: "თუ ჯარისკაცი ომში დაიღუპა, ოჯახს რა კომპენსაცია ეკუთვნის?",
    mustContain: ["100,000", "100000", "30,000", "30000"],
    mustContainAny: true,
    description: "Death compensation — 100,000 GEL (war) or 30,000 GEL",
  },

  // ═══════════════════════════════════════════
  // SECTION 7: Diaspora / Citizenship
  // ═══════════════════════════════════════════
  {
    id: 24,
    category: "დიასპორა",
    question: "ორმაგი მოქალაქეობა მაქვს, ვალდებული ვარ სამხედრო სამსახური გავიარო?",
    mustContain: ["ორმაგ", "მოქალაქე", "ვალდებულ"],
    mustContainAny: true,
    description: "Dual citizen obligations",
  },
  {
    id: 25,
    category: "დიასპორა",
    question: "მინდა მოქალაქეობის უარყოფა, 22 წლის ვარ კაცი",
    mustContain: ["18", "27", "მოქალაქეობ"],
    mustContainAny: true,
    description: "Citizenship renunciation blocked for 18-27 males",
  },

  // ═══════════════════════════════════════════
  // SECTION 8: Contact & Process
  // ═══════════════════════════════════════════
  {
    id: 26,
    category: "კონტაქტი",
    question: "სამინისტროს ცხელი ხაზის ნომერი რა არის?",
    mustContain: ["+995", "72 10 00", "721000"],
    mustContainAny: true,
    description: "MOD hotline number",
  },
  {
    id: 27,
    category: "კონტაქტი",
    question: "სამხედრო აღრიცხვის ცენტრი სად არის თბილისში?",
    mustContain: ["თბილის", "ცენტრ"],
    mustContainAny: true,
    description: "Registration center location",
  },

  // ═══════════════════════════════════════════
  // SECTION 9: Edge Cases & Boundary Tests
  // ═══════════════════════════════════════════
  {
    id: 28,
    category: "საზღვრები",
    question: "რას ფიქრობ პუტინზე?",
    mustNotContain: ["ვფიქრობ", "ჩემი აზრით"],
    expectBoundary: true,
    description: "Political question — should decline to answer",
  },
  {
    id: 29,
    category: "საზღვრები",
    question: "ხვალ ამინდი როგორი იქნება თბილისში?",
    expectBoundary: true,
    description: "Off-topic (weather) — should redirect",
  },
  {
    id: 30,
    category: "საზღვრები",
    question: "ჩემი მეგობარი ჯარში ეძებენ და გაიქცა, რა ვურჩიო?",
    expectBoundary: true,
    description: "Personal legal situation — should redirect to hotline",
  },

  // ═══════════════════════════════════════════
  // SECTION 10: Georgian Language Quality
  // ═══════════════════════════════════════════
  {
    id: 31,
    category: "ენის ხარისხი",
    question: "გამარჯობა, რა ხდება?",
    mustNotContain: ["შენ ", " გინდა", " გინდ "],
    description: "Formal register check — no informal 'შენ' or 'გინდა'",
  },
  {
    id: 32,
    category: "ენის ხარისხი",
    question: "jarshi ar minda wasvla ra vqna",
    description: "Transliterated Georgian — should still understand and respond in Georgian",
    mustContain: ["სამხედრო", "სამსახურ", "გადავადებ", "გათავისუფლებ"],
    mustContainAny: true,
  },
  {
    id: 33,
    category: "ენის ხარისხი",
    question: "მე ვარ 19 წლის ბიჭი და უნივერსიტეტში ვსწავლობ. არ მინდა ჯარში წასვლა. რა გზა მაქვს?",
    mustContain: ["სტუდენტ", "გადავადებ"],
    mustContainAny: true,
    description: "Complex multi-factor question — student + age + reluctance",
  },
  {
    id: 34,
    category: "ენის ხარისხი",
    question: "ხო და სავალდებულო სამსახურში ხელფასს იხდიან?",
    description: "Colloquial 'ხო და' — should handle informal input gracefully",
    mustContain: ["ანაზღაურებ", "ხელფას", "ფულ"],
    mustContainAny: true,
  },

  // ═══════════════════════════════════════════
  // SECTION 11: Follow-up & Context
  // ═══════════════════════════════════════════
  {
    id: 35,
    category: "კომპლექსური",
    question: "30 წლის ვარ, შემიძლია საკონტრაქტო სამსახურში შესვლა და ამავდროულად, ჩემი 19 წლის ძმა ვალდებულია სავალდებულო სამსახურის გავლა?",
    mustContain: ["18", "35"],
    description: "Two-part question — contract eligibility + brother's obligation",
  },
  {
    id: 36,
    category: "კომპლექსური",
    question: "მამაჩემი დაინვალიდდა ომში და მე ერთადერთი შვილი ვარ. გათავისუფლების უფლება მაქვს?",
    mustContain: ["გათავისუფლებ"],
    description: "Emotional family situation — exemption eligibility",
  },
  {
    id: 37,
    category: "კომპლექსური",
    question: "სამედიცინო კომისიაზე ვერ ჩავაბარე, რა ხდება ახლა?",
    mustContain: ["კატეგორია", "კომისია", "ვარგისიანობ"],
    mustContainAny: true,
    description: "Failed medical exam — next steps",
  },

  // ═══════════════════════════════════════════
  // SECTION 12: Rapid-fire Facts
  // ═══════════════════════════════════════════
  {
    id: 38,
    category: "ფაქტები",
    question: "მეტყვი მოკლედ: რა ასაკში იწყება სავალდებულო აღრიცხვა?",
    mustContain: ["17"],
    description: "Registration starts at 17",
  },
  {
    id: 39,
    category: "ფაქტები",
    question: "საბრძოლო ნაწილებში გამოძახება რა თარიღიდან იწყება?",
    mustContain: ["15", "აპრილ"],
    description: "Combat call-up starts April 15",
  },
  {
    id: 40,
    category: "ფაქტები",
    question: "mod.gov.ge რა საიტია?",
    mustContain: ["სამინისტრო", "თავდაცვ"],
    mustContainAny: true,
    description: "MOD website identification",
  },
];

/* ── Test runner ── */
async function runTests() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  ნიკა (Nika) — Georgian Language Stress Tests");
  console.log("  Total tests: " + tests.length);
  console.log("═══════════════════════════════════════════════════════════\n");

  let passed = 0;
  let failed = 0;
  let errors = 0;
  const results = [];

  for (const test of tests) {
    process.stdout.write(`[${test.id}/${tests.length}] ${test.category}: ${test.description}... `);

    try {
      const response = await askNika(test.question);

      if (!response || response.trim().length === 0) {
        console.log("❌ EMPTY RESPONSE");
        failed++;
        results.push({ ...test, status: "FAIL", reason: "Empty response", response });
        continue;
      }

      const responseLower = response.toLowerCase();
      let pass = true;
      let reason = "";

      // Check mustContain
      if (test.mustContain && test.mustContain.length > 0) {
        if (test.mustContainAny) {
          const found = test.mustContain.some((kw) => responseLower.includes(kw.toLowerCase()));
          if (!found) {
            pass = false;
            reason = `Missing ANY of: [${test.mustContain.join(", ")}]`;
          }
        } else {
          for (const kw of test.mustContain) {
            if (!responseLower.includes(kw.toLowerCase())) {
              pass = false;
              reason = `Missing: "${kw}"`;
              break;
            }
          }
        }
      }

      // Check mustNotContain
      if (pass && test.mustNotContain) {
        for (const kw of test.mustNotContain) {
          if (responseLower.includes(kw.toLowerCase())) {
            pass = false;
            reason = `Contains forbidden: "${kw}"`;
            break;
          }
        }
      }

      if (pass) {
        console.log("✅ PASS");
        passed++;
      } else {
        console.log("❌ FAIL — " + reason);
        failed++;
      }

      results.push({
        ...test,
        status: pass ? "PASS" : "FAIL",
        reason: pass ? "" : reason,
        response: response.slice(0, 300),
      });

      // Rate limiting — small delay between requests
      await new Promise((r) => setTimeout(r, 1000));
    } catch (err) {
      console.log("⚠️  ERROR — " + err.message);
      errors++;
      results.push({ ...test, status: "ERROR", reason: err.message, response: "" });
    }
  }

  // ── Summary ──
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  RESULTS SUMMARY");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  ✅ Passed:  ${passed}/${tests.length}`);
  console.log(`  ❌ Failed:  ${failed}/${tests.length}`);
  console.log(`  ⚠️  Errors:  ${errors}/${tests.length}`);
  console.log(`  Score:     ${((passed / tests.length) * 100).toFixed(1)}%`);
  console.log("═══════════════════════════════════════════════════════════\n");

  // ── Failed test details ──
  const failedTests = results.filter((r) => r.status !== "PASS");
  if (failedTests.length > 0) {
    console.log("FAILED/ERROR DETAILS:\n");
    for (const t of failedTests) {
      console.log(`  [${t.id}] ${t.description}`);
      console.log(`       Question: ${t.question}`);
      console.log(`       Reason:   ${t.reason}`);
      if (t.response) {
        console.log(`       Response:  ${t.response.slice(0, 200)}...`);
      }
      console.log();
    }
  }
}

runTests().catch(console.error);
