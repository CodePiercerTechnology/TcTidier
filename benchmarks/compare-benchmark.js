const fs = require("fs");
const path = require("path");
const { runBenchmark } = require("./native-benchmark");

const ROOT = path.resolve(__dirname, "..");
const baselinePath = path.join(__dirname, "baseline.json");
const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));

function main() {
  const summary = runBenchmark({
    iterations: baseline.iterations,
    warmupIterations: baseline.warmupIterations
  });

  const failures = [];

  if (summary.avgMsPerDocument > baseline.maxAvgMsPerDocument) {
    failures.push(
      `avgMsPerDocument ${summary.avgMsPerDocument} exceeded baseline max ${baseline.maxAvgMsPerDocument}`
    );
  }

  if (summary.docsPerSecond < baseline.minDocsPerSecond) {
    failures.push(
      `docsPerSecond ${summary.docsPerSecond} was below baseline min ${baseline.minDocsPerSecond}`
    );
  }

  console.log(JSON.stringify({ baseline, summary }, null, 2));

  if (failures.length > 0) {
    throw new Error(`Benchmark regression detected: ${failures.join("; ")}`);
  }
}

main();
