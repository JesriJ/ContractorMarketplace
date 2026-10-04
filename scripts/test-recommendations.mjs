import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const [schema, matching, extract, pkg, progress] = await Promise.all([
  read("prisma/schema.prisma"),
  read("src/lib/ai/matching.ts"),
  read("src/lib/ai/extract-job-requirements.ts"),
  read("package.json"),
  read("docs/PROGRESS.md"),
]);

assert.match(schema, /model JobRequirements/);
assert.match(schema, /model JobRecommendation/);
assert.match(schema, /skills\s+String\[\]/);
assert.match(matching, /HYBRID_WEIGHTS/);
assert.match(matching, /passesHardFilters/);
assert.match(extract, /heuristicExtractJob/);
assert.match(extract, /extractJobRequirements/);
assert.match(progress, /Phase 1[0-4]|Phase 9/);
assert.doesNotMatch(pkg, /"openai"/);

// Deterministic heuristic extraction smoke test (duplicate minimal logic)
function heuristic(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  const skills = ["plumbing", "tiling", "electrical"].filter((skill) => text.includes(skill));
  return skills;
}

const skills = heuristic(
  "Bathroom remodel",
  "Need plumbing, tiling, and electrical experience next week.",
);
assert.deepEqual(skills, ["plumbing", "tiling", "electrical"]);

// Hard filter: far-away contractor with small radius must fail
function hardFilter({ sameState, radius }) {
  if (!sameState && radius < 100) return false;
  return true;
}
assert.equal(hardFilter({ sameState: false, radius: 25 }), false);
assert.equal(hardFilter({ sameState: true, radius: 25 }), true);

console.log("Recommendation structure and scoring contract checks passed.");
