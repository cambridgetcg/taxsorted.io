import fs from "node:fs";

let ok = true;
function fail(message) {
  console.error(message);
  ok = false;
}
function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

const path = "research/uk/politics/politics.json";
const politics = readJson(path);

for (const key of ["schema", "updated", "title", "stance", "note", "deciders", "howLawWorks", "debates", "sources"]) {
  if (!politics[key] || (Array.isArray(politics[key]) && politics[key].length === 0)) fail(`politics missing ${key}`);
}

if (politics.stance !== "non-partisan-educational") {
  fail('politics stance must equal "non-partisan-educational"');
}
if (!/does not|never tells|not tell/i.test(politics.note ?? "")) {
  fail("politics note must clearly avoid voting advice");
}
if (!Array.isArray(politics.deciders) || politics.deciders.length < 5) fail("politics needs at least 5 deciders");
if (!Array.isArray(politics.howLawWorks) || politics.howLawWorks.length < 5) fail("politics needs at least 5 law-making steps");
if (!Array.isArray(politics.debates) || politics.debates.length < 5) fail("politics needs at least 5 debates");

const sourceIds = new Set((politics.sources ?? []).map((source) => source.id));
const allowedAuthorities = new Set([
  "official-government",
  "official-parliament",
  "official-independent-forecaster",
  "professional-analysis",
  "think-tank-analysis",
]);

for (const decider of politics.deciders ?? []) {
  for (const key of ["id", "role", "what", "power", "checkedBy"]) {
    if (!decider[key]) fail(`decider ${decider.id ?? "(unknown)"} missing ${key}`);
  }
}

let expectedStep = 1;
for (const step of politics.howLawWorks ?? []) {
  for (const key of ["step", "title", "body"]) {
    if (!step[key]) fail(`law step ${step.step ?? "(unknown)"} missing ${key}`);
  }
  if (step.step !== expectedStep) fail(`law steps must be contiguous; expected ${expectedStep}, got ${step.step}`);
  expectedStep += 1;
}

const debateIds = new Set();
for (const debate of politics.debates ?? []) {
  for (const key of ["id", "title", "cantonese", "plain", "whoItHits", "whatToWatch", "sourceIds"]) {
    if (!debate[key] || (Array.isArray(debate[key]) && debate[key].length === 0)) {
      fail(`debate ${debate.id ?? "(unknown)"} missing ${key}`);
    }
  }
  if (debateIds.has(debate.id)) fail(`duplicate debate id: ${debate.id}`);
  debateIds.add(debate.id);
  for (const sourceId of debate.sourceIds ?? []) {
    if (!sourceIds.has(sourceId)) fail(`debate ${debate.id} references missing source ${sourceId}`);
  }
}

const sourceUrls = new Set();
for (const source of politics.sources ?? []) {
  for (const key of ["id", "name", "url", "authority", "supports"]) {
    if (!source[key]) fail(`source ${source.id ?? "(unknown)"} missing ${key}`);
  }
  if (!/^https:\/\//.test(source.url ?? "")) fail(`source ${source.id} url must start with https://`);
  if (sourceUrls.has(source.url)) fail(`duplicate source URL: ${source.url}`);
  sourceUrls.add(source.url);
  if (!allowedAuthorities.has(source.authority)) fail(`source ${source.id} has unsupported authority ${source.authority}`);
}

if (!ok) process.exit(1);
console.log(`UK politics dataset OK: ${politics.deciders.length} deciders, ${politics.howLawWorks.length} steps, ${politics.debates.length} debates, ${politics.sources.length} sources`);
