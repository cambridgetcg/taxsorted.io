import fs from "node:fs";

let ok = true;
function fail(message) { console.error(message); ok = false; }

const playbook = JSON.parse(fs.readFileSync("research/uk/personal-tax/playbook.json", "utf8"));
const sources = JSON.parse(fs.readFileSync("research/uk/personal-tax/source-ledger.json", "utf8"));
const sourceIds = new Set(sources.map((source) => source.id));

for (const key of ["schema", "updated", "title", "ethicalLine", "corePattern", "snapshot", "plays"]) {
  if (!playbook[key]) fail(`playbook missing ${key}`);
}
if (!Array.isArray(playbook.plays) || playbook.plays.length < 7) fail("playbook must contain at least 7 UK plays");
if (!playbook.ethicalLine.includes("Evasion")) fail("ethicalLine must explicitly mention evasion");

const playIds = new Set();
for (const play of playbook.plays ?? []) {
  for (const key of ["id", "name", "cantonese", "howItWorks", "whoCanPlayHard", "ordinaryCounterMove", "legalLine", "sourceIds"]) {
    if (!play[key] || (Array.isArray(play[key]) && play[key].length === 0)) fail(`play ${play.id ?? "(unknown)"} missing ${key}`);
  }
  if (playIds.has(play.id)) fail(`duplicate play id: ${play.id}`);
  playIds.add(play.id);
  if (!play.legalLine.includes("Legit:") || !play.legalLine.includes("Not legit:")) {
    fail(`play legalLine must include both Legit and Not legit: ${play.id}`);
  }
  for (const sourceId of play.sourceIds ?? []) {
    if (!sourceIds.has(sourceId)) fail(`play references missing source ${sourceId}: ${play.id}`);
  }
}

const sourceUrls = new Set();
for (const source of sources) {
  for (const key of ["id", "name", "url", "authority", "supports", "doesNotProve", "lastReviewed"]) {
    if (!source[key] || (Array.isArray(source[key]) && source[key].length === 0)) fail(`source ${source.id ?? "(unknown)"} missing ${key}`);
  }
  if (!source.url.startsWith("https://www.gov.uk/")) fail(`source must be GOV.UK for this module: ${source.id}`);
  if (sourceUrls.has(source.url)) fail(`duplicate source URL: ${source.url}`);
  sourceUrls.add(source.url);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source.lastReviewed)) fail(`source lastReviewed must be YYYY-MM-DD: ${source.id}`);
}

if (!ok) process.exit(1);
console.log(`UK personal-tax playbook OK: ${playbook.plays.length} plays, ${sources.length} sources`);
