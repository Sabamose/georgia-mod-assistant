import {
  askEdgeChat,
  evaluateCaseAssertions,
  loadQualityCases,
  printSummary,
  runGeorgianHeuristics,
  summarizeCaseResult,
} from "./_shared.mjs";

const cases = loadQualityCases();
const minScore = Number(process.env.GEORGIAN_QUALITY_MIN_SCORE || 95);

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Georgian Quality Evaluation");
  console.log(`  Total cases: ${cases.length}`);
  console.log("═══════════════════════════════════════════════════════════");

  let passed = 0;
  const failures = [];

  for (const testCase of cases) {
    process.stdout.write(`[${testCase.id}] ${testCase.category}: ${testCase.prompt} ... `);

    try {
      const response = await askEdgeChat(testCase.prompt, {
        language: testCase.language || "ka",
      });

      const heuristicFailures = runGeorgianHeuristics(response, testCase);
      const assertionFailures = evaluateCaseAssertions(testCase, response);
      const caseFailures = [...heuristicFailures, ...assertionFailures];

      if (caseFailures.length === 0) {
        passed += 1;
        console.log("✅ PASS");
      } else {
        console.log(`❌ FAIL — ${caseFailures[0]}`);
        failures.push(summarizeCaseResult(testCase, response, caseFailures));
      }
    } catch (error) {
      console.log(`⚠️ ERROR — ${error.message}`);
      failures.push(summarizeCaseResult(testCase, "", [error.message]));
    }
  }

  printSummary("QUALITY SUMMARY", passed, cases.length);

  if (failures.length > 0) {
    console.log("\nFAILED CASES:");
    for (const failure of failures.slice(0, 15)) {
      console.log(`- [${failure.id}] ${failure.failures.join("; ")}`);
      console.log(`  Prompt: ${failure.prompt}`);
      console.log(`  Response: ${failure.response}`);
    }
  }

  const score = cases.length === 0 ? 0 : (passed / cases.length) * 100;
  if (score < minScore) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
