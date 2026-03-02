const { performance } = require("perf_hooks");
const { formatDocumentText } = require("../out/native/formatter");
const { ROOT, loadCorpus } = require("../scripts/lib/corpus");

function formatAll(fixtures) {
  let chars = 0;
  for (const fixture of fixtures) {
    chars += formatDocumentText(fixture.text, {
      stdinFilepath: fixture.filePath,
      workspaceRoot: ROOT
    }).length;
  }
  return chars;
}

function runBenchmark({
  iterations = Number(process.env.TCTIDIER_BENCH_ITERATIONS || "500"),
  warmupIterations = Number(process.env.TCTIDIER_BENCH_WARMUP || "25")
} = {}) {
  const fixtures = loadCorpus();
  if (fixtures.length === 0) {
    throw new Error("No benchmark fixture files found.");
  }

  for (let index = 0; index < warmupIterations; index += 1) {
    formatAll(fixtures);
  }

  let chars = 0;
  const start = performance.now();
  for (let index = 0; index < iterations; index += 1) {
    chars += formatAll(fixtures);
  }
  const elapsedMs = performance.now() - start;
  const totalRuns = fixtures.length * iterations;

  return {
    fixtures: fixtures.length,
    iterations,
    warmupIterations,
    totalRuns,
    chars,
    elapsedMs: Number(elapsedMs.toFixed(3)),
    avgMsPerDocument: Number((elapsedMs / totalRuns).toFixed(4)),
    docsPerSecond: Number(((totalRuns / elapsedMs) * 1000).toFixed(2)),
    charsPerSecond: Math.round((chars / elapsedMs) * 1000)
  };
}

function main() {
  const outputJson = process.argv.includes("--json");
  const summary = runBenchmark();

  if (outputJson) {
    console.log(JSON.stringify(summary));
    return;
  }

  console.log("TcTidier Native Benchmark");
  console.log(`fixtures: ${summary.fixtures}`);
  console.log(`iterations: ${summary.iterations}`);
  console.log(`warmupIterations: ${summary.warmupIterations}`);
  console.log(`totalRuns: ${summary.totalRuns}`);
  console.log(`elapsedMs: ${summary.elapsedMs}`);
  console.log(`avgMsPerDocument: ${summary.avgMsPerDocument}`);
  console.log(`docsPerSecond: ${summary.docsPerSecond}`);
  console.log(`charsPerSecond: ${summary.charsPerSecond}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  runBenchmark
};
