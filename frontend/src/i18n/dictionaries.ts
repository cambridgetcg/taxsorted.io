// Client-side i18n dictionaries. The site is a static export (output: "export"),
// so we do locale switching in the browser with a React context + localStorage,
// not Next.js server-side i18n routing (which needs a server).

export const LOCALES = ["en", "zh-Hant", "zh-Hans", "pl", "hi", "ur"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  "zh-Hant": "繁體中文 / 廣東話",
  "zh-Hans": "简体中文",
  pl: "Polski",
  hi: "हिन्दी",
  ur: "اردو",
};

export const DEFAULT_LOCALE: Locale = "en";

export function htmlLangFor(locale: Locale): string {
  if (locale === "zh-Hant") return "zh-Hant";
  if (locale === "zh-Hans") return "zh-Hans";
  return locale;
}

export function dirFor(locale: Locale): "ltr" | "rtl" {
  return locale === "ur" ? "rtl" : "ltr";
}

export const localeDir = dirFor;

type Dict = Record<string, string>;

const en: Dict = {
  "nav.home": "Home",
  "nav.learn": "Learn",
  "nav.dashboard": "Dashboard",
  "nav.playbook": "UK tax game",
  "nav.politics": "UK politics",
  "nav.tagline": "Tax, understood. Then sorted.",
  "nav.menu": "Menu",
  "nav.menu.open": "Open menu",
  "nav.menu.close": "Close menu",
  "lang.label": "Language",

  "home.title.line1": "Tax, understood.",
  "home.title.line2": "Then sorted.",
  "home.intro":
    "Wherever you are, whoever you are — tax explained in plain words, and figures you never have to retype. We draw the map honestly: your path begins with where you are, and who you are.",
  "home.where": "Where are you?",
  "home.who": "Who are you?",
  "home.who.body": "a person · a business · a charity · a trust — same door, same plain words, same engine.",
  "home.place.uk": "United Kingdom",
  "home.place.personal": "UK personal tax",
  "home.place.ireland": "Ireland",
  "home.place.germany": "Germany",
  "home.place.us": "United States",
  "home.status.open": "open",
  "home.status.drawing": "being drawn",
  "home.pillar.learn.name": "Learn",
  "home.pillar.learn.status": "being written",
  "home.pillar.learn.heading": "Start by understanding.",
  "home.pillar.learn.body":
    "Every rule we cover, explained in plain words: what it means, what you must do, what you can safely skip, how to optimise. Free, open, no account.",
  "home.pillar.file.name": "File",
  "home.pillar.file.status": "open as a preview",
  "home.pillar.file.heading": "Records in. Return out.",
  "home.pillar.file.body":
    "You never retype a number — every figure is derived, and shows where it came from. Today you can walk the UK VAT journey on sample books.",
  "home.pillar.connect.name": "Connect",
  "home.pillar.connect.status": "being built",
  "home.pillar.connect.heading": "Straight to the tax office.",
  "home.pillar.connect.body":
    "A direct line to HMRC first — so a return you approve is actually delivered, with a receipt. One engine, one truth.",
  "home.cta.playbook": "Play the UK tax game 😏",
  "home.cta.politics": "Go deep into UK politics",
  "home.honest":
    "Honest by default: what's live today is a preview. Prepared means ready; filed means sent. We never blur the two.",
  "home.lastline": "The UK is our first country, not our last.",

  "politics.kicker": "UK politics · who writes the rules",
  "politics.title": "Deep into UK tax politics",
  "politics.blurb":
    "Tax isn't physics — it's written by people, in public, with winners and losers. Here's who decides, how a rule becomes law, and the live fights that move real money. Educational and non-partisan: we explain the machine, not who to vote for.",
  "politics.who.title": "Who actually decides",
  "politics.how.title": "How a tax rule becomes law",
  "politics.debates.title": "Live debates that move money",
  "politics.forWhom": "Who it hits",
  "politics.forWatch": "What to watch",
  "politics.sources": "Sources",
  "politics.neutral": "Non-partisan note",
  "politics.neutral.body":
    "This page explains the mechanics of UK tax politics. It does not tell you who to vote for, and it names positions, not villains.",
  "politics.power": "Power",
  "politics.checkedBy": "Checked by",

  "playbook.kicker": "UK tax · a game you can learn",
  "playbook.title": "Learn to play the UK tax game — legally, plainly, with receipts.",
  "playbook.blurb":
    "Rich people aren't using magic; they're using rules, wrappers, timing, residence and reliefs. We turn the playbook into plain language: what the move is, why it works, who can really use it, and where optimisation ends and evasion begins.",
  "playbook.legalLine": "The line",
  "playbook.snapshot.pa": "Personal allowance",
  "playbook.snapshot.pa.note": "Then tapers after £100k adjusted net income.",
  "playbook.snapshot.isa": "ISA allowance",
  "playbook.snapshot.isa.note": "A legal wrapper, not a magic loophole.",
  "playbook.snapshot.cgt": "CGT annual exemption",
  "playbook.snapshot.cgt.note": "Tiny compared with the asset game.",
  "playbook.sameMoney.body":
    "This is the core pattern: work is taxed as income, wealth may be realised as gains. Same pounds, different lane. This simplified engine ignores NI, student loans, Scottish rates, and special reliefs — it is a teaching lens, not filing advice.",
  "playbook.trap.title": "The £100k trap",
  "playbook.threshold.example.children": "£70k + 2 children",
  "playbook.threshold.example.income": "£112k income",
  "playbook.plays.title": "The plays",
  "playbook.how": "How it works",
  "playbook.who": "Who can play hard",
  "playbook.counter": "Your counter-move",
  "playbook.sources": "Source ledger",
  "playbook.sources.blurb": "Every spicy claim has a receipt and a boundary.",
  "playbook.supports": "Supports",
  "playbook.notProve": "Does not prove",
  "playbook.receipt": "receipt",

  "common.back": "← TaxSorted",
  "common.notAdvice": "Educational only — not tax, legal or financial advice. Verify with GOV.UK or a qualified adviser.",
};

export const dictionaries: Record<Locale, Dict> = {
  en,
  "zh-Hant": {
    ...en,
    "nav.learn": "學習",
    "nav.dashboard": "儀表板",
    "nav.playbook": "英國稅遊戲",
    "nav.politics": "英國政治",
    "nav.tagline": "睇得明嘅稅，然後搞掂佢。",
    "nav.menu": "選單",
    "nav.menu.open": "開啟選單",
    "nav.menu.close": "關閉選單",
    "lang.label": "語言",
    "home.title.line1": "睇得明嘅稅。",
    "home.title.line2": "然後搞掂佢。",
    "home.intro": "用人話解釋稅，數字唔使你重打。由你身處嘅地方同身份開始畫地圖。",
    "home.where": "你喺邊度？",
    "home.who": "你係邊個？",
    "home.place.uk": "英國",
    "home.place.personal": "英國個人稅",
    "home.status.open": "已開放",
    "home.status.drawing": "畫緊地圖",
    "home.cta.playbook": "玩英國稅 game 😏",
    "home.cta.politics": "深入英國稅務政治",
    "politics.kicker": "英國政治 · 邊個寫規則",
    "politics.title": "深入英國稅務政治",
    "politics.blurb": "稅唔係物理定律，而係人寫出嚟嘅規則。呢度講邊個決定、規則點變法律、同邊啲 live fights 會郁到真錢。",
    "politics.neutral": "非黨派說明",
    "politics.neutral.body": "呢頁解釋英國稅務政治機制，唔叫你投邊個，只講制度點運作。",
  },
  "zh-Hans": {
    ...en,
    "nav.learn": "学习",
    "nav.dashboard": "仪表板",
    "nav.playbook": "英国税务游戏",
    "nav.politics": "英国政治",
    "nav.tagline": "把税看懂，然后搞定。",
    "nav.menu": "菜单",
    "nav.menu.open": "打开菜单",
    "nav.menu.close": "关闭菜单",
    "lang.label": "语言",
    "home.title.line1": "把税看懂。",
    "home.title.line2": "然后搞定。",
    "home.intro": "用普通话解释税，数字不用重复输入。地图从你所在的国家和身份开始。",
    "home.where": "你在哪里？",
    "home.who": "你是谁？",
    "home.place.uk": "英国",
    "home.place.personal": "英国个人税",
    "home.status.open": "已开放",
    "home.status.drawing": "绘制中",
    "home.cta.playbook": "玩懂英国税务 😏",
    "home.cta.politics": "深入英国税务政治",
    "politics.kicker": "英国政治 · 谁写规则",
    "politics.title": "深入英国税务政治",
    "politics.blurb": "税不是物理定律，而是人公开写出来的规则。这里解释谁决定、规则如何成为法律，以及哪些现实争议会影响金钱。",
    "politics.neutral": "非党派说明",
    "politics.neutral.body": "本页解释英国税务政治机制，不告诉你投谁，只说明机器如何运转。",
  },
  pl: {
    ...en,
    "nav.learn": "Nauka",
    "nav.dashboard": "Panel",
    "nav.playbook": "Gra podatkowa UK",
    "nav.politics": "Polityka UK",
    "nav.tagline": "Podatki zrozumiane. Potem uporządkowane.",
    "nav.menu": "Menu",
    "nav.menu.open": "Otwórz menu",
    "nav.menu.close": "Zamknij menu",
    "lang.label": "Język",
    "home.title.line1": "Podatki zrozumiane.",
    "home.title.line2": "Potem uporządkowane.",
    "home.intro": "Podatki prostym językiem, bez przepisywania liczb. Zaczynamy od miejsca i roli, w której jesteś.",
    "home.where": "Gdzie jesteś?",
    "home.who": "Kim jesteś?",
    "home.place.personal": "UK personal tax",
    "home.status.open": "otwarte",
    "home.status.drawing": "w trakcie rysowania",
    "home.cta.playbook": "Zagraj w UK tax game 😏",
    "home.cta.politics": "Wejdź głęboko w politykę UK",
    "politics.title": "Głęboko w politykę podatkową UK",
    "politics.neutral": "Nota bezpartyjna",
  },
  hi: {
    ...en,
    "nav.learn": "सीखें",
    "nav.dashboard": "डैशबोर्ड",
    "nav.playbook": "UK tax game",
    "nav.politics": "UK politics",
    "nav.tagline": "Tax समझो. फिर sorted.",
    "nav.menu": "मेन्यू",
    "nav.menu.open": "मेन्यू खोलें",
    "nav.menu.close": "मेन्यू बंद करें",
    "lang.label": "भाषा",
    "home.title.line1": "Tax समझो.",
    "home.title.line2": "फिर sorted.",
    "home.where": "आप कहाँ हैं?",
    "home.who": "आप कौन हैं?",
    "home.status.open": "open",
    "home.status.drawing": "बन रहा है",
    "home.cta.playbook": "UK tax game खेलो 😏",
    "home.cta.politics": "UK politics में deep जाओ",
    "politics.title": "UK tax politics की गहराई",
    "politics.neutral": "Non-partisan note",
  },
  ur: {
    ...en,
    "nav.learn": "سیکھیں",
    "nav.dashboard": "ڈیش بورڈ",
    "nav.playbook": "UK tax game",
    "nav.politics": "UK politics",
    "nav.tagline": "Tax سمجھیں۔ پھر sorted۔",
    "nav.menu": "مینو",
    "nav.menu.open": "مینو کھولیں",
    "nav.menu.close": "مینو بند کریں",
    "lang.label": "زبان",
    "home.title.line1": "Tax سمجھیں۔",
    "home.title.line2": "پھر sorted۔",
    "home.where": "آپ کہاں ہیں؟",
    "home.who": "آپ کون ہیں؟",
    "home.status.open": "open",
    "home.status.drawing": "بن رہا ہے",
    "home.cta.playbook": "UK tax game کھیلیں 😏",
    "home.cta.politics": "UK politics میں deep جائیں",
    "politics.title": "UK tax politics کی گہرائی",
    "politics.neutral": "Non-partisan note",
  },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
