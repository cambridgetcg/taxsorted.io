// Client-side i18n dictionaries. The site is a static export (output: "export"),
// so we do locale switching in the browser with a React context + localStorage,
// not Next.js server-side i18n routing (which needs a server).
//
// Every locale carries the FULL key set — no {...en} spread, no silent English
// fallback. The dictionaries test enforces exact key parity, so a missing
// translation is a hard build failure, not a quiet regression.
//
// Strings may carry {date} and {amount} placeholders; the component that uses
// them fills in engine-derived values, so facts never live in copy.

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
  "nav.tools": "Do my tax",
  "nav.money": "Follow the money",
  "nav.about": "About",
  "nav.account": "Account",
  "nav.tagline": "Tax, understood. Then sorted.",
  "nav.menu": "Menu",
  "nav.menu.open": "Open menu",
  "nav.menu.close": "Close menu",
  "lang.label": "Language",

  "home.title.line1": "Tax, understood.",
  "home.title.line2": "Then sorted.",
  "home.intro": "Tax explained in plain words. You never retype a number.",
  "home.mtd.title": "Making Tax Digital (MTD) is here — are you in?",
  "home.mtd.body":
    "MTD is the new way to report Income Tax to HM Revenue & Customs (HMRC, the UK tax office). Mandatory since {date} for sole traders (self-employed people) and landlords with income over {amount}.",
  "home.mtd.check": "Check if I'm in — 60 seconds",
  "home.mtd.truth": "What's actually true",
  "home.mtd.smallprint":
    "Free and open-source. Working towards HMRC recognition. No account — your records stay in your browser.",
  "home.pillar.learn.name": "Learn",
  "home.pillar.learn.status": "being written",
  "home.pillar.learn.heading": "Start by understanding.",
  "home.pillar.learn.body":
    "Every rule in plain words — what it means, what to do, how to optimise.",
  "home.pillar.file.name": "File",
  "home.pillar.file.status": "open as a preview",
  "home.pillar.file.heading": "Records in. Return out.",
  "home.pillar.file.body":
    "You never retype a number. Every figure is derived and shows its source.",
  "home.pillar.connect.name": "Connect",
  "home.pillar.connect.status": "being built",
  "home.pillar.connect.heading": "Straight to the tax office.",
  "home.pillar.connect.body":
    "A direct line to HMRC, so a return you approve is delivered with a receipt.",
  "home.doors": "Where to next?",
  "home.door.learn": "Guides that explain tax in plain words.",
  "home.door.tools": "Check, record, and build your returns.",
  "home.door.money": "Who runs tax, and where public money goes.",
  "home.door.about": "What this is, who builds it, the promise.",
  "home.playground.teaser": "Play with the numbers",
  "home.world": "UK today — Ireland, Germany and the US are being drawn.",
  "home.honest": "Honest by default: what's live today is a preview.",
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

  "common.back": "TaxSorted",
  "common.notAdvice":
    "Educational only — not tax, legal or financial advice. Verify with GOV.UK or a qualified adviser.",
};

const zhHant: Dict = {
  "nav.home": "主頁",
  "nav.learn": "學習",
  "nav.tools": "搞掂我啲稅",
  "nav.money": "跟住錢走",
  "nav.about": "關於",
  "nav.account": "帳戶",
  "nav.tagline": "睇得明嘅稅，然後搞掂佢。",
  "nav.menu": "選單",
  "nav.menu.open": "開啟選單",
  "nav.menu.close": "關閉選單",
  "lang.label": "語言",

  "home.title.line1": "睇得明嘅稅。",
  "home.title.line2": "然後搞掂佢。",
  "home.intro": "用人話解釋稅，數字唔使你重打。",
  "home.mtd.title": "Making Tax Digital（MTD）已經開始 — 你係咪喺入面？",
  "home.mtd.body":
    "MTD 係向英國稅局 HMRC（HM Revenue & Customs）申報入息稅嘅新方式。由 {date} 起，收入超過 {amount} 嘅自僱人士同收租業主必須跟。",
  "home.mtd.check": "睇下我係咪喺入面 — 60 秒",
  "home.mtd.truth": "究竟乜嘢係真",
  "home.mtd.smallprint": "免費、開源。爭取緊 HMRC 認可。唔使開帳戶 — 你嘅紀錄只會留喺你個瀏覽器。",
  "home.pillar.learn.name": "學習",
  "home.pillar.learn.status": "寫緊",
  "home.pillar.learn.heading": "由明白開始。",
  "home.pillar.learn.body": "每條規則都用人話講 — 咩意思、要做咩、點樣合法慳稅。",
  "home.pillar.file.name": "報稅",
  "home.pillar.file.status": "預覽版開放中",
  "home.pillar.file.heading": "紀錄入，報表出。",
  "home.pillar.file.body": "數字唔使你重打 — 每個數都自動計出嚟，仲話你知由邊度嚟。",
  "home.pillar.connect.name": "直達",
  "home.pillar.connect.status": "起緊",
  "home.pillar.connect.heading": "直通稅局。",
  "home.pillar.connect.body": "直接駁去 HMRC — 你批准嘅報表真係會送到，仲有回條。",
  "home.doors": "想去邊？",
  "home.door.learn": "用人話解釋稅嘅指南。",
  "home.door.tools": "檢查、記帳、砌好你嘅報表。",
  "home.door.money": "邊個管稅，公帑去咗邊。",
  "home.door.about": "呢個係乜、邊個整、我哋嘅承諾。",
  "home.playground.teaser": "玩下啲數字",
  "home.world": "而家有英國 — 愛爾蘭、德國、美國畫緊。",
  "home.honest": "誠實至上：而家行緊嘅係預覽版。",
  "home.lastline": "英國係我哋第一個國家，唔係最後一個。",

  "politics.kicker": "英國政治 · 邊個寫規則",
  "politics.title": "深入英國稅務政治",
  "politics.blurb":
    "稅唔係物理定律，係人喺公開場合寫出嚟嘅規則，有人贏有人輸。呢度講邊個決定、規則點變法律、同邊啲辯論會郁到真錢。純教育、不偏黨派：我哋解釋部機器，唔叫你投邊個。",
  "politics.who.title": "邊個真係話事",
  "politics.how.title": "稅例點樣變法律",
  "politics.debates.title": "郁緊真錢嘅辯論",
  "politics.forWhom": "影響邊個",
  "politics.forWatch": "睇咩位",
  "politics.sources": "來源",
  "politics.neutral": "非黨派說明",
  "politics.neutral.body": "呢頁解釋英國稅務政治機制，唔叫你投邊個，只講立場，唔講奸角。",
  "politics.power": "權力",
  "politics.checkedBy": "邊個制衡",

  "playbook.kicker": "英國稅 · 一個學得識嘅遊戲",
  "playbook.title": "學識玩英國稅呢個遊戲 — 合法、講人話、有憑有據。",
  "playbook.blurb":
    "有錢人唔係用魔法，係用規則、稅務外殼、時機、居籍同免稅額。我哋將呢本天書變成人話：招式係咩、點解得、邊個真係用得、慳稅同逃稅條界喺邊。",
  "playbook.legalLine": "條界",
  "playbook.snapshot.pa": "個人免稅額",
  "playbook.snapshot.pa.note": "調整後淨收入過咗 £100k 就逐步扣減。",
  "playbook.snapshot.isa": "ISA 免稅額度",
  "playbook.snapshot.isa.note": "一個合法嘅稅務外殼，唔係魔法漏洞。",
  "playbook.snapshot.cgt": "資產增值稅（CGT）年度豁免",
  "playbook.snapshot.cgt.note": "同成個資產遊戲比，好細。",
  "playbook.sameMoney.body":
    "核心規律：勞動當收入嚟徵稅，財富可以當增值嚟變現。同一啲錢，唔同賽道。呢個簡化引擎唔計 NI（國民保險）、學生貸款、蘇格蘭稅率同特別減免 — 係教學鏡頭，唔係報稅建議。",
  "playbook.trap.title": "£100k 陷阱",
  "playbook.threshold.example.children": "£70k + 2 個小朋友",
  "playbook.threshold.example.income": "£112k 收入",
  "playbook.plays.title": "招式",
  "playbook.how": "點運作",
  "playbook.who": "邊個玩得盡",
  "playbook.counter": "你嘅應對",
  "playbook.sources": "來源帳簿",
  "playbook.sources.blurb": "每個大膽講法都有單據同邊界。",
  "playbook.supports": "支持",
  "playbook.notProve": "唔證明",
  "playbook.receipt": "單據",

  "common.back": "TaxSorted",
  "common.notAdvice":
    "只作教育用途 — 唔係稅務、法律或理財建議。請以 GOV.UK 或合資格顧問為準。",
};

const zhHans: Dict = {
  "nav.home": "首页",
  "nav.learn": "学习",
  "nav.tools": "搞定我的税",
  "nav.money": "跟着钱走",
  "nav.about": "关于",
  "nav.account": "账户",
  "nav.tagline": "把税看懂，然后搞定。",
  "nav.menu": "菜单",
  "nav.menu.open": "打开菜单",
  "nav.menu.close": "关闭菜单",
  "lang.label": "语言",

  "home.title.line1": "把税看懂。",
  "home.title.line2": "然后搞定。",
  "home.intro": "用大白话解释税，数字不用重复输入。",
  "home.mtd.title": "Making Tax Digital（MTD）已经开始 — 你在范围内吗？",
  "home.mtd.body":
    "MTD 是向英国税务局 HMRC（HM Revenue & Customs）申报所得税的新方式。自 {date} 起，收入超过 {amount} 的个体经营者和房东必须使用。",
  "home.mtd.check": "查查我在不在 — 60 秒",
  "home.mtd.truth": "真实情况是什么",
  "home.mtd.smallprint": "免费开源。正在争取 HMRC 认可。无需账户 — 你的记录只保存在你的浏览器里。",
  "home.pillar.learn.name": "学习",
  "home.pillar.learn.status": "撰写中",
  "home.pillar.learn.heading": "先看懂。",
  "home.pillar.learn.body": "每条规则都用大白话讲清 — 什么意思、要做什么、怎么合法省税。",
  "home.pillar.file.name": "申报",
  "home.pillar.file.status": "预览版开放",
  "home.pillar.file.heading": "记录进，报表出。",
  "home.pillar.file.body": "数字不用重复输入 — 每个数都自动算出，并注明来源。",
  "home.pillar.connect.name": "直连",
  "home.pillar.connect.status": "建设中",
  "home.pillar.connect.heading": "直达税务局。",
  "home.pillar.connect.body": "直连 HMRC — 你批准的报表真正送达，并有回执。",
  "home.doors": "接下来去哪？",
  "home.door.learn": "用大白话解释税的指南。",
  "home.door.tools": "检查、记账、生成你的报表。",
  "home.door.money": "谁管税，公款花到哪。",
  "home.door.about": "这是什么、谁在做、我们的承诺。",
  "home.playground.teaser": "玩玩这些数字",
  "home.world": "现在有英国 — 爱尔兰、德国、美国正在绘制。",
  "home.honest": "诚实为本：现在上线的是预览版。",
  "home.lastline": "英国是我们的第一个国家，不是最后一个。",

  "politics.kicker": "英国政治 · 谁写规则",
  "politics.title": "深入英国税务政治",
  "politics.blurb":
    "税不是物理定律，而是人公开写出来的规则，有人赢有人输。这里解释谁决定、规则如何成为法律，以及哪些现实争论牵动真金白银。教育性、不偏党派：我们解释这台机器，不告诉你投谁。",
  "politics.who.title": "谁真正说了算",
  "politics.how.title": "税规如何成为法律",
  "politics.debates.title": "牵动真金白银的辩论",
  "politics.forWhom": "影响谁",
  "politics.forWatch": "看什么",
  "politics.sources": "来源",
  "politics.neutral": "非党派说明",
  "politics.neutral.body": "本页解释英国税务政治的机制，不告诉你投谁；只讲立场，不树反派。",
  "politics.power": "权力",
  "politics.checkedBy": "由谁制衡",

  "playbook.kicker": "英国税 · 一个可以学会的游戏",
  "playbook.title": "学会玩英国税这场游戏 — 合法、直白、有凭有据。",
  "playbook.blurb":
    "有钱人用的不是魔法，而是规则、税务外壳、时机、税务居民身份和减免。我们把这本攻略翻成大白话：这一招是什么、为什么有效、谁真的能用、省税与逃税的界线在哪里。",
  "playbook.legalLine": "界线",
  "playbook.snapshot.pa": "个人免税额",
  "playbook.snapshot.pa.note": "调整后净收入超过 £100k 后逐步递减。",
  "playbook.snapshot.isa": "ISA 额度",
  "playbook.snapshot.isa.note": "一个合法的税务外壳，不是魔法漏洞。",
  "playbook.snapshot.cgt": "资本利得税（CGT）年度免税额",
  "playbook.snapshot.cgt.note": "和整个资产游戏相比很小。",
  "playbook.sameMoney.body":
    "核心规律：劳动按收入征税，财富可以按增值变现。同样的钱，不同的赛道。这个简化引擎忽略 NI（国民保险）、学生贷款、苏格兰税率和特殊减免 — 它是教学透镜，不是报税建议。",
  "playbook.trap.title": "£100k 陷阱",
  "playbook.threshold.example.children": "£70k + 2 个孩子",
  "playbook.threshold.example.income": "£112k 收入",
  "playbook.plays.title": "招式",
  "playbook.how": "怎么运作",
  "playbook.who": "谁能玩得起",
  "playbook.counter": "你的应对",
  "playbook.sources": "来源台账",
  "playbook.sources.blurb": "每个大胆说法都有凭据和边界。",
  "playbook.supports": "支持",
  "playbook.notProve": "不能证明",
  "playbook.receipt": "凭据",

  "common.back": "TaxSorted",
  "common.notAdvice":
    "仅供学习 — 不构成税务、法律或理财建议。请以 GOV.UK 或合资格顾问为准。",
};

const pl: Dict = {
  "nav.home": "Start",
  "nav.learn": "Nauka",
  "nav.tools": "Rozlicz podatek",
  "nav.money": "Śledź pieniądze",
  "nav.about": "O nas",
  "nav.account": "Konto",
  "nav.tagline": "Podatki zrozumiane. Potem uporządkowane.",
  "nav.menu": "Menu",
  "nav.menu.open": "Otwórz menu",
  "nav.menu.close": "Zamknij menu",
  "lang.label": "Język",

  "home.title.line1": "Podatki zrozumiane.",
  "home.title.line2": "Potem uporządkowane.",
  "home.intro": "Podatki wyjaśnione prostymi słowami. Nigdy nie przepisujesz liczb.",
  "home.mtd.title": "Making Tax Digital (MTD) już działa — czy Cię dotyczy?",
  "home.mtd.body":
    "MTD to nowy sposób zgłaszania podatku dochodowego do HM Revenue & Customs (HMRC, brytyjskiego urzędu podatkowego). Obowiązkowy od {date} dla osób samozatrudnionych i wynajmujących z dochodem powyżej {amount}.",
  "home.mtd.check": "Sprawdź, czy Cię dotyczy — 60 sekund",
  "home.mtd.truth": "Co jest naprawdę prawdą",
  "home.mtd.smallprint":
    "Darmowe i open source. Pracujemy nad uznaniem przez HMRC. Bez konta — Twoje dane zostają w Twojej przeglądarce.",
  "home.pillar.learn.name": "Nauka",
  "home.pillar.learn.status": "w trakcie pisania",
  "home.pillar.learn.heading": "Zacznij od zrozumienia.",
  "home.pillar.learn.body":
    "Każda reguła prostymi słowami — co znaczy, co robić, jak legalnie oszczędzić.",
  "home.pillar.file.name": "Rozliczenie",
  "home.pillar.file.status": "otwarte jako podgląd",
  "home.pillar.file.heading": "Zapisy wchodzą. Zeznanie wychodzi.",
  "home.pillar.file.body":
    "Nigdy nie przepisujesz liczb. Każda kwota jest wyliczona i pokazuje swoje źródło.",
  "home.pillar.connect.name": "Połączenie",
  "home.pillar.connect.status": "w budowie",
  "home.pillar.connect.heading": "Prosto do urzędu podatkowego.",
  "home.pillar.connect.body":
    "Bezpośrednia linia do HMRC — zatwierdzone zeznanie naprawdę dociera, z potwierdzeniem.",
  "home.doors": "Dokąd teraz?",
  "home.door.learn": "Przewodniki wyjaśniające podatki prostymi słowami.",
  "home.door.tools": "Sprawdź, zapisuj i buduj swoje zeznania.",
  "home.door.money": "Kto rządzi podatkami i gdzie idą publiczne pieniądze.",
  "home.door.about": "Czym to jest, kto to buduje, nasza obietnica.",
  "home.playground.teaser": "Pobaw się liczbami",
  "home.world": "Dziś Wielka Brytania — Irlandia, Niemcy i USA są w przygotowaniu.",
  "home.honest": "Uczciwie: to, co działa dziś, to podgląd.",
  "home.lastline": "Wielka Brytania to nasz pierwszy kraj, nie ostatni.",

  "politics.kicker": "Polityka UK · kto pisze zasady",
  "politics.title": "Głęboko w politykę podatkową UK",
  "politics.blurb":
    "Podatki to nie fizyka — piszą je ludzie, publicznie, z wygranymi i przegranymi. Tu widać, kto decyduje, jak reguła staje się prawem i jakie spory ruszają prawdziwe pieniądze. Edukacyjnie i bezpartyjnie: wyjaśniamy maszynę, nie mówimy, na kogo głosować.",
  "politics.who.title": "Kto naprawdę decyduje",
  "politics.how.title": "Jak reguła podatkowa staje się prawem",
  "politics.debates.title": "Spory, które ruszają pieniądze",
  "politics.forWhom": "Kogo dotyka",
  "politics.forWatch": "Na co patrzeć",
  "politics.sources": "Źródła",
  "politics.neutral": "Nota bezpartyjna",
  "politics.neutral.body":
    "Ta strona wyjaśnia mechanikę brytyjskiej polityki podatkowej. Nie mówi, na kogo głosować, i nazywa stanowiska, nie wrogów.",
  "politics.power": "Władza",
  "politics.checkedBy": "Kontrolowana przez",

  "playbook.kicker": "Podatki UK · gra, której można się nauczyć",
  "playbook.title":
    "Naucz się grać w brytyjską grę podatkową — legalnie, prosto, z dowodami.",
  "playbook.blurb":
    "Bogaci nie używają magii — używają zasad, opakowań podatkowych, wyczucia czasu, rezydencji i ulg. Tłumaczymy ten podręcznik na prosty język: czym jest ruch, dlaczego działa, kto naprawdę może go użyć i gdzie kończy się optymalizacja, a zaczyna uchylanie się.",
  "playbook.legalLine": "Granica",
  "playbook.snapshot.pa": "Kwota wolna (Personal Allowance)",
  "playbook.snapshot.pa.note":
    "Potem maleje po £100k skorygowanego dochodu netto.",
  "playbook.snapshot.isa": "Limit ISA",
  "playbook.snapshot.isa.note": "Legalne opakowanie, nie magiczna luka.",
  "playbook.snapshot.cgt": "Roczne zwolnienie z CGT",
  "playbook.snapshot.cgt.note": "Malutkie w porównaniu z grą majątkową.",
  "playbook.sameMoney.body":
    "To jest kluczowy wzór: praca jest opodatkowana jako dochód, majątek można zrealizować jako zysk. Te same funty, inny tor. Ten uproszczony silnik pomija NI, kredyty studenckie, szkockie stawki i specjalne ulgi — to soczewka do nauki, nie porada rozliczeniowa.",
  "playbook.trap.title": "Pułapka £100k",
  "playbook.threshold.example.children": "£70k + 2 dzieci",
  "playbook.threshold.example.income": "£112k dochodu",
  "playbook.plays.title": "Zagrania",
  "playbook.how": "Jak to działa",
  "playbook.who": "Kto może grać ostro",
  "playbook.counter": "Twój kontr-ruch",
  "playbook.sources": "Rejestr źródeł",
  "playbook.sources.blurb": "Każde śmiałe twierdzenie ma dowód i granicę.",
  "playbook.supports": "Potwierdza",
  "playbook.notProve": "Nie dowodzi",
  "playbook.receipt": "dowód",

  "common.back": "TaxSorted",
  "common.notAdvice":
    "Tylko edukacyjnie — to nie porada podatkowa, prawna ani finansowa. Sprawdź na GOV.UK lub u wykwalifikowanego doradcy.",
};

const hi: Dict = {
  "nav.home": "होम",
  "nav.learn": "सीखें",
  "nav.tools": "मेरा टैक्स निपटाएँ",
  "nav.money": "पैसा कहाँ जाता है",
  "nav.about": "परिचय",
  "nav.account": "खाता",
  "nav.tagline": "टैक्स समझ आया। फिर निपट गया।",
  "nav.menu": "मेन्यू",
  "nav.menu.open": "मेन्यू खोलें",
  "nav.menu.close": "मेन्यू बंद करें",
  "lang.label": "भाषा",

  "home.title.line1": "टैक्स समझ आया।",
  "home.title.line2": "फिर निपट गया।",
  "home.intro": "टैक्स की बात आसान शब्दों में। कोई संख्या आपको दोबारा नहीं लिखनी पड़ती।",
  "home.mtd.title": "Making Tax Digital (MTD) आ गया है — क्या आप इसके दायरे में हैं?",
  "home.mtd.body":
    "MTD ब्रिटेन के टैक्स विभाग HMRC (HM Revenue & Customs) को इनकम टैक्स बताने का नया तरीक़ा है। {date} से यह उन स्वरोज़गार लोगों और मकान-मालिकों के लिए अनिवार्य है जिनकी आमदनी {amount} से ज़्यादा है।",
  "home.mtd.check": "60 सेकंड में जाँचें — क्या मैं दायरे में हूँ",
  "home.mtd.truth": "असल सच क्या है",
  "home.mtd.smallprint":
    "मुफ़्त और ओपन-सोर्स। HMRC की मान्यता के लिए काम जारी है। खाता नहीं चाहिए — आपके रिकॉर्ड आपके ब्राउज़र में ही रहते हैं।",
  "home.pillar.learn.name": "सीखें",
  "home.pillar.learn.status": "लिखा जा रहा है",
  "home.pillar.learn.heading": "पहले समझें।",
  "home.pillar.learn.body":
    "हर नियम आसान शब्दों में — मतलब क्या है, करना क्या है, बचत कैसे करें।",
  "home.pillar.file.name": "फ़ाइल करें",
  "home.pillar.file.status": "पूर्वावलोकन के रूप में खुला",
  "home.pillar.file.heading": "रिकॉर्ड अंदर, रिटर्न बाहर।",
  "home.pillar.file.body":
    "कोई संख्या दोबारा नहीं लिखनी पड़ती। हर आँकड़ा खुद निकलता है और अपना स्रोत दिखाता है।",
  "home.pillar.connect.name": "जोड़ें",
  "home.pillar.connect.status": "बन रहा है",
  "home.pillar.connect.heading": "सीधे टैक्स दफ़्तर तक।",
  "home.pillar.connect.body":
    "HMRC से सीधी लाइन — आपकी मंज़ूरी वाला रिटर्न सचमुच पहुँचता है, रसीद के साथ।",
  "home.doors": "अब कहाँ चलें?",
  "home.door.learn": "आसान शब्दों में टैक्स समझाने वाली गाइडें।",
  "home.door.tools": "जाँचें, रिकॉर्ड रखें, अपना रिटर्न बनाएँ।",
  "home.door.money": "टैक्स कौन चलाता है, जनता का पैसा कहाँ जाता है।",
  "home.door.about": "यह क्या है, कौन बनाता है, हमारा वादा।",
  "home.playground.teaser": "संख्याओं से खेलें",
  "home.world": "आज यूके — आयरलैंड, जर्मनी और अमेरिका का नक्शा बन रहा है।",
  "home.honest": "ईमानदारी पहले: अभी जो चल रहा है वह पूर्वावलोकन है।",
  "home.lastline": "यूके हमारा पहला देश है, आख़िरी नहीं।",

  "politics.kicker": "यूके राजनीति · नियम कौन लिखता है",
  "politics.title": "यूके टैक्स राजनीति की गहराई में",
  "politics.blurb":
    "टैक्स भौतिकी नहीं है — इसे लोग लिखते हैं, सबके सामने, जिसमें कोई जीतता है और कोई हारता है। यहाँ बताया गया है कि फ़ैसला कौन करता है, नियम क़ानून कैसे बनता है, और कौन-सी बहसें असली पैसा हिलाती हैं। शैक्षिक और निष्पक्ष: हम मशीन समझाते हैं, वोट किसे दें यह नहीं।",
  "politics.who.title": "फ़ैसला असल में कौन करता है",
  "politics.how.title": "टैक्स का नियम क़ानून कैसे बनता है",
  "politics.debates.title": "पैसा हिलाने वाली चालू बहसें",
  "politics.forWhom": "किस पर असर",
  "politics.forWatch": "क्या देखें",
  "politics.sources": "स्रोत",
  "politics.neutral": "निष्पक्षता नोट",
  "politics.neutral.body":
    "यह पेज यूके टैक्स राजनीति का तंत्र समझाता है। यह नहीं बताता कि वोट किसे दें, और यह पक्ष गिनाता है, खलनायक नहीं।",
  "politics.power": "सत्ता",
  "politics.checkedBy": "निगरानी कौन करता है",

  "playbook.kicker": "यूके टैक्स · एक खेल जो सीखा जा सकता है",
  "playbook.title":
    "यूके टैक्स का खेल खेलना सीखें — क़ानूनी, साफ़ शब्दों में, सबूत के साथ।",
  "playbook.blurb":
    "अमीर लोग जादू नहीं, नियम, रैपर (टैक्स के क़ानूनी खोल), समय, निवास और छूट इस्तेमाल करते हैं। हम उस किताब को आसान भाषा में खोलते हैं: चाल क्या है, क्यों काम करती है, असल में कौन खेल सकता है, और बचत कहाँ ख़त्म होती है और टैक्स-चोरी कहाँ शुरू।",
  "playbook.legalLine": "सीमा-रेखा",
  "playbook.snapshot.pa": "पर्सनल अलाउंस (कर-मुक्त आय)",
  "playbook.snapshot.pa.note":
    "फिर £100k समायोजित शुद्ध आय के बाद घटता है।",
  "playbook.snapshot.isa": "ISA सीमा",
  "playbook.snapshot.isa.note": "एक क़ानूनी खोल, कोई जादुई सुराख़ नहीं।",
  "playbook.snapshot.cgt": "CGT सालाना छूट",
  "playbook.snapshot.cgt.note": "संपत्ति के खेल के आगे बहुत छोटी।",
  "playbook.sameMoney.body":
    "मूल पैटर्न यही है: मेहनत पर आय की तरह टैक्स लगता है, संपत्ति मुनाफ़े की तरह भुनाई जा सकती है। वही पाउंड, अलग लेन। यह सरल इंजन NI (नेशनल इंश्योरेंस), स्टूडेंट लोन, स्कॉटिश दरें और विशेष छूटें छोड़ देता है — यह सिखाने का लेंस है, फ़ाइलिंग की सलाह नहीं।",
  "playbook.trap.title": "£100k का जाल",
  "playbook.threshold.example.children": "£70k + 2 बच्चे",
  "playbook.threshold.example.income": "£112k आमदनी",
  "playbook.plays.title": "चालें",
  "playbook.how": "कैसे काम करती है",
  "playbook.who": "कौन ज़ोर से खेल सकता है",
  "playbook.counter": "आपकी जवाबी चाल",
  "playbook.sources": "स्रोत बही",
  "playbook.sources.blurb": "हर बड़े दावे के पीछे रसीद और सीमा है।",
  "playbook.supports": "समर्थन करता है",
  "playbook.notProve": "साबित नहीं करता",
  "playbook.receipt": "रसीद",

  "common.back": "TaxSorted",
  "common.notAdvice":
    "केवल शिक्षा के लिए — यह टैक्स, क़ानूनी या वित्तीय सलाह नहीं है। GOV.UK या योग्य सलाहकार से पुष्टि करें।",
};

const ur: Dict = {
  "nav.home": "ہوم",
  "nav.learn": "سیکھیں",
  "nav.tools": "میرا ٹیکس نمٹائیں",
  "nav.money": "پیسہ کہاں جاتا ہے",
  "nav.about": "تعارف",
  "nav.account": "اکاؤنٹ",
  "nav.tagline": "ٹیکس سمجھ آ گیا۔ پھر نمٹ گیا۔",
  "nav.menu": "مینو",
  "nav.menu.open": "مینو کھولیں",
  "nav.menu.close": "مینو بند کریں",
  "lang.label": "زبان",

  "home.title.line1": "ٹیکس سمجھ آ گیا۔",
  "home.title.line2": "پھر نمٹ گیا۔",
  "home.intro": "ٹیکس کی بات آسان لفظوں میں۔ کوئی عدد آپ کو دوبارہ نہیں لکھنا پڑتا۔",
  "home.mtd.title": "Making Tax Digital (MTD) آ گیا ہے — کیا آپ اس کے دائرے میں ہیں؟",
  "home.mtd.body":
    "MTD برطانیہ کے ٹیکس ادارے HMRC (HM Revenue & Customs) کو انکم ٹیکس بتانے کا نیا طریقہ ہے۔ {date} سے یہ ان خود روزگار لوگوں اور مکان مالکان کے لیے لازمی ہے جن کی آمدنی {amount} سے زیادہ ہے۔",
  "home.mtd.check": "60 سیکنڈ میں دیکھیں — کیا میں دائرے میں ہوں",
  "home.mtd.truth": "اصل سچ کیا ہے",
  "home.mtd.smallprint":
    "مفت اور اوپن سورس۔ HMRC کی منظوری کے لیے کام جاری ہے۔ اکاؤنٹ کی ضرورت نہیں — آپ کا ریکارڈ آپ کے براؤزر میں ہی رہتا ہے۔",
  "home.pillar.learn.name": "سیکھیں",
  "home.pillar.learn.status": "لکھا جا رہا ہے",
  "home.pillar.learn.heading": "پہلے سمجھیں۔",
  "home.pillar.learn.body":
    "ہر قاعدہ آسان لفظوں میں — مطلب کیا ہے، کرنا کیا ہے، بچت کیسے ہو۔",
  "home.pillar.file.name": "فائل کریں",
  "home.pillar.file.status": "پیش نظارہ کھلا ہے",
  "home.pillar.file.heading": "ریکارڈ اندر، ریٹرن باہر۔",
  "home.pillar.file.body":
    "کوئی عدد دوبارہ نہیں لکھنا پڑتا۔ ہر رقم خود نکلتی ہے اور اپنا ماخذ دکھاتی ہے۔",
  "home.pillar.connect.name": "جوڑیں",
  "home.pillar.connect.status": "بن رہا ہے",
  "home.pillar.connect.heading": "سیدھا ٹیکس دفتر تک۔",
  "home.pillar.connect.body":
    "HMRC سے سیدھی لائن — آپ کی منظور کردہ ریٹرن واقعی پہنچتی ہے، رسید کے ساتھ۔",
  "home.doors": "اب کہاں چلیں؟",
  "home.door.learn": "آسان لفظوں میں ٹیکس سمجھانے والی گائیڈیں۔",
  "home.door.tools": "جانچیں، ریکارڈ رکھیں، اپنی ریٹرن بنائیں۔",
  "home.door.money": "ٹیکس کون چلاتا ہے، عوامی پیسہ کہاں جاتا ہے۔",
  "home.door.about": "یہ کیا ہے، کون بناتا ہے، ہمارا وعدہ۔",
  "home.playground.teaser": "عددوں سے کھیلیں",
  "home.world": "آج یوکے — آئرلینڈ، جرمنی اور امریکہ کا نقشہ بن رہا ہے۔",
  "home.honest": "ایمانداری پہلے: ابھی جو چل رہا ہے وہ پیش نظارہ ہے۔",
  "home.lastline": "یوکے ہمارا پہلا ملک ہے، آخری نہیں۔",

  "politics.kicker": "یوکے سیاست · قاعدے کون لکھتا ہے",
  "politics.title": "یوکے ٹیکس سیاست کی گہرائی میں",
  "politics.blurb":
    "ٹیکس طبیعیات نہیں — اسے لوگ لکھتے ہیں، سب کے سامنے، جس میں کوئی جیتتا ہے اور کوئی ہارتا ہے۔ یہاں بتایا گیا ہے کہ فیصلہ کون کرتا ہے، قاعدہ قانون کیسے بنتا ہے، اور کون سی بحثیں اصل پیسہ ہلاتی ہیں۔ تعلیمی اور غیر جانب دار: ہم مشین سمجھاتے ہیں، ووٹ کسے دیں یہ نہیں۔",
  "politics.who.title": "فیصلہ اصل میں کون کرتا ہے",
  "politics.how.title": "ٹیکس کا قاعدہ قانون کیسے بنتا ہے",
  "politics.debates.title": "اصل پیسہ ہلانے والی جاری بحثیں",
  "politics.forWhom": "اثر کس پر",
  "politics.forWatch": "کیا دیکھیں",
  "politics.sources": "ماخذ",
  "politics.neutral": "غیر جانب داری کا نوٹ",
  "politics.neutral.body":
    "یہ صفحہ یوکے ٹیکس سیاست کا نظام سمجھاتا ہے۔ یہ نہیں بتاتا کہ ووٹ کسے دیں، اور یہ موقف گنواتا ہے، ولن نہیں۔",
  "politics.power": "اختیار",
  "politics.checkedBy": "نگرانی کون کرتا ہے",

  "playbook.kicker": "یوکے ٹیکس · ایک کھیل جو سیکھا جا سکتا ہے",
  "playbook.title":
    "یوکے ٹیکس کا کھیل کھیلنا سیکھیں — قانونی، صاف لفظوں میں، ثبوت کے ساتھ۔",
  "playbook.blurb":
    "امیر لوگ جادو نہیں، قاعدے، ریپر (ٹیکس کے قانونی خول)، وقت، رہائش اور رعایتیں استعمال کرتے ہیں۔ ہم اس کتاب کو آسان زبان میں کھولتے ہیں: چال کیا ہے، کیوں کام کرتی ہے، اصل میں کون کھیل سکتا ہے، اور بچت کہاں ختم ہوتی ہے اور ٹیکس چوری کہاں شروع۔",
  "playbook.legalLine": "حد",
  "playbook.snapshot.pa": "پرسنل الاؤنس (ٹیکس فری آمدنی)",
  "playbook.snapshot.pa.note":
    "پھر £100k ایڈجسٹڈ نیٹ انکم کے بعد گھٹتا ہے۔",
  "playbook.snapshot.isa": "ISA کی حد",
  "playbook.snapshot.isa.note": "ایک قانونی خول، کوئی جادوئی سوراخ نہیں۔",
  "playbook.snapshot.cgt": "CGT سالانہ چھوٹ",
  "playbook.snapshot.cgt.note": "اثاثوں کے کھیل کے آگے بہت چھوٹی۔",
  "playbook.sameMoney.body":
    "بنیادی نمونہ یہی ہے: محنت پر آمدنی کی طرح ٹیکس لگتا ہے، دولت منافع کی صورت میں بھنائی جا سکتی ہے۔ وہی پاؤنڈ، الگ لین۔ یہ سادہ انجن NI (نیشنل انشورنس)، اسٹوڈنٹ لون، اسکاٹش شرحیں اور خاص رعایتیں چھوڑ دیتا ہے — یہ سکھانے کا عدسہ ہے، فائلنگ کا مشورہ نہیں۔",
  "playbook.trap.title": "£100k کا جال",
  "playbook.threshold.example.children": "£70k + 2 بچے",
  "playbook.threshold.example.income": "£112k آمدنی",
  "playbook.plays.title": "چالیں",
  "playbook.how": "کیسے کام کرتی ہے",
  "playbook.who": "کون زور سے کھیل سکتا ہے",
  "playbook.counter": "آپ کی جوابی چال",
  "playbook.sources": "ماخذ کھاتہ",
  "playbook.sources.blurb": "ہر بڑے دعوے کے پیچھے رسید اور حد ہے۔",
  "playbook.supports": "تائید کرتا ہے",
  "playbook.notProve": "ثابت نہیں کرتا",
  "playbook.receipt": "رسید",

  "common.back": "TaxSorted",
  "common.notAdvice":
    "صرف تعلیم کے لیے — یہ ٹیکس، قانونی یا مالی مشورہ نہیں۔ GOV.UK یا مستند مشیر سے تصدیق کریں۔",
};

export const dictionaries: Record<Locale, Dict> = {
  en,
  "zh-Hant": zhHant,
  "zh-Hans": zhHans,
  pl,
  hi,
  ur,
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
