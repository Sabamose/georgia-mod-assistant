import {
  askAnthropicDirect,
  askOpenAIDirect,
  evaluateCaseAssertions,
  loadQualityCases,
  printSummary,
  runGeorgianHeuristics,
} from "./_shared.mjs";

const cases = loadQualityCases();
const limit = Number(process.env.PROVIDER_COMPARE_LIMIT || cases.length);
const selectedCases = cases.slice(0, limit);

async function scoreProvider(name, askProvider) {
  let passed = 0;
  const failures = [];

  for (const testCase of selectedCases) {
    process.stdout.write(`[${name}] [${testCase.id}] ${testCase.prompt} ... `);

    try {
      const response = await askProvider(testCase.prompt, {
        language: testCase.language || "ka",
      });
      const caseFailures = [
        ...runGeorgianHeuristics(response, testCase),
        ...evaluateCaseAssertions(testCase, response),
      ];

      if (caseFailures.length === 0) {
        passed += 1;
        console.log("✅ PASS");
      } else {
        console.log(`❌ FAIL — ${caseFailures[0]}`);
        failures.push({
          id: testCase.id,
          prompt: testCase.prompt,
          failures: caseFailures,
          response: response.slice(0, 200),
        });
      }
    } catch (error) {
      console.log(`⚠️ ERROR — ${error.message}`);
      failures.push({
        id: testCase.id,
        prompt: testCase.prompt,
        failures: [error.message],
        response: "",
      });
    }
  }

  printSummary(`${name.toUpperCase()} SUMMARY`, passed, selectedCases.length);
  return { passed, failures };
}

async function main() {
  if (!process.env.OPENAI_API_KEY || !process.env.ANTHROPIC_API_KEY) {
    throw new Error("OPENAI_API_KEY and ANTHROPIC_API_KEY must be set to compare providers");
  }

  console.log(`Comparing providers across ${selectedCases.length} cases`);
  const openAi = await scoreProvider("openai", askOpenAIDirect);
  const anthropic = await scoreProvider("anthropic", askAnthropicDirect);

  console.log("\nHEAD-TO-HEAD");
  console.log(`OpenAI passed: ${openAi.passed}/${selectedCases.length}`);
  console.log(`Anthropic passed: ${anthropic.passed}/${selectedCases.length}`);

  if (openAi.failures.length > 0) {
    console.log("\nOpenAI notable failures:");
    for (const failure of openAi.failures.slice(0, 10)) {
      console.log(`- [${failure.id}] ${failure.failures.join("; ")}`);
    }
  }

  if (anthropic.failures.length > 0) {
    console.log("\nAnthropic notable failures:");
    for (const failure of anthropic.failures.slice(0, 10)) {
      console.log(`- [${failure.id}] ${failure.failures.join("; ")}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
