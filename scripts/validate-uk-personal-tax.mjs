import fs from "node:fs";

let ok = true;
function fail(message) { console.error(message); ok = false; }
function readJson(path) { return JSON.parse(fs.readFileSync(path, "utf8")); }

const playbook = readJson("research/uk/personal-tax/playbook.json");
const sources = readJson("research/uk/personal-tax/source-ledger.json");
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
const allowedOfficialHosts = [
  "https://www.gov.uk/",
  "https://commonslibrary.parliament.uk/",
  "https://obr.uk/",
];
for (const source of sources) {
  for (const key of ["id", "name", "url", "authority", "supports", "doesNotProve", "lastReviewed"]) {
    if (!source[key] || (Array.isArray(source[key]) && source[key].length === 0)) fail(`source ${source.id ?? "(unknown)"} missing ${key}`);
  }
  if (!allowedOfficialHosts.some((prefix) => source.url.startsWith(prefix))) {
    fail(`source must be official GOV.UK, Parliament or OBR for this module: ${source.id}`);
  }
  if (sourceUrls.has(source.url)) fail(`duplicate source URL: ${source.url}`);
  sourceUrls.add(source.url);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source.lastReviewed)) fail(`source lastReviewed must be YYYY-MM-DD: ${source.id}`);
}

if (fs.existsSync("research/uk/personal-tax/i18n.json")) {
  const i18n = readJson("research/uk/personal-tax/i18n.json");
  if (!Array.isArray(i18n.locales) || i18n.locales.length < 3) fail("i18n must define at least 3 locales");
  for (const locale of i18n.locales ?? []) {
    if (!i18n.ui?.[locale]) fail(`i18n missing ui pack for ${locale}`);
    for (const key of ["localeName", "heroTitle", "heroBody", "legalBadge", "politicsTitle", "playsTitle", "sourceLedgerTitle"]) {
      if (!i18n.ui?.[locale]?.[key]) fail(`i18n ${locale} missing ${key}`);
    }
  }
  for (const play of playbook.plays ?? []) {
    if (!i18n.playTranslations?.[play.id]) fail(`i18n missing play translation pack for ${play.id}`);
    for (const locale of i18n.locales ?? []) {
      if (!i18n.playTranslations?.[play.id]?.[locale]) fail(`i18n ${locale} missing play translation for ${play.id}`);
    }
  }
}

if (fs.existsSync("research/uk/personal-tax/politics.json")) {
  const politics = readJson("research/uk/personal-tax/politics.json");
  if (!Array.isArray(politics.themes) || politics.themes.length < 3) fail("politics must contain at least 3 themes");
  for (const theme of politics.themes ?? []) {
    for (const key of ["id", "label", "emoji", "plain", "cantonese", "whyItMatters", "sourceIds"]) {
      if (!theme[key] || (Array.isArray(theme[key]) && theme[key].length === 0)) fail(`politics theme ${theme.id ?? "(unknown)"} missing ${key}`);
    }
    for (const sourceId of theme.sourceIds ?? []) {
      if (!sourceIds.has(sourceId)) fail(`politics theme references missing source ${sourceId}: ${theme.id}`);
    }
  }
}

console.log(`UK personal-tax playbook OK: ${playbook.plays.length} plays, ${sources.length} sources`);

// Deep UK politics dataset — quality gate for the /uk/politics page.
// Politics needs richer commentary than the pure-tax module, so it allows
// professional/think-tank analysis too — but every source must carry an honest
// `authority` label from a known allow-list, so readers can weigh it.
if (fs.existsSync("research/uk/politics/politics.json")) {
  const deep = readJson("research/uk/politics/politics.json");
  const deepSources = new Set((deep.sources ?? []).map((s) => s.id));
  const allowedAuthorities = new Set([
    "official-government",
    "official-parliament",
    "official-independent-forecaster",
    "professional-analysis",
    "think-tank-analysis",
  ]);
  if (!Array.isArray(deep.deciders) || deep.deciders.length < 4) fail("politics deep: need >=4 deciders");
  if (!Array.isArray(deep.howLawWorks) || deep.howLawWorks.length < 3) fail("politics deep: need >=3 howLawWorks steps");
  if (!Array.isArray(deep.debates) || deep.debates.length < 4) fail("politics deep: need >=4 debates");
  if (!deep.stance || !/non-partisan/.test(deep.stance)) fail("politics deep: stance must be non-partisan");
  for (const debate of deep.debates ?? []) {
    for (const key of ["id", "title", "plain", "whoItHits", "whatToWatch", "sourceIds"]) {
      if (!debate[key] || (Array.isArray(debate[key]) && debate[key].length === 0)) {
        fail(`politics deep debate ${debate.id ?? "(unknown)"} missing ${key}`);
      }
    }
    for (const sourceId of debate.sourceIds ?? []) {
      if (!deepSources.has(sourceId)) fail(`politics deep debate references missing source ${sourceId}: ${debate.id}`);
    }
  }
  for (const source of deep.sources ?? []) {
    for (const key of ["id", "name", "url", "authority", "supports"]) {
      if (!source[key]) fail(`politics deep source ${source.id ?? "(unknown)"} missing ${key}`);
    }
    if (source.authority && !allowedAuthorities.has(source.authority)) {
      fail(`politics deep source has unknown authority label "${source.authority}": ${source.id}`);
    }
    if (!/^https:\/\//.test(source.url ?? "")) fail(`politics deep source url must be https: ${source.id}`);
  }
  if (ok) console.log(`UK politics deep dataset OK: ${deep.deciders.length} deciders, ${deep.debates.length} debates, ${deep.sources.length} sources`);
}

if (!ok) process.exit(1);
