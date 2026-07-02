export const locales = ["en", "zh-HK", "zh-CN", "pl", "hi", "ur"] as const;
export type TaxSortedLocale = (typeof locales)[number];

export const localeLabels: Record<TaxSortedLocale, { native: string; english: string; dir?: "rtl" }> = {
  en: { native: "English", english: "English" },
  "zh-HK": { native: "廣東話", english: "Cantonese" },
  "zh-CN": { native: "简体中文", english: "Mandarin Chinese" },
  pl: { native: "Polski", english: "Polish" },
  hi: { native: "हिन्दी", english: "Hindi" },
  ur: { native: "اردو", english: "Urdu", dir: "rtl" },
};

export type LocalisedText = Record<TaxSortedLocale, string>;

export interface FunTaxCard {
  id: string;
  emoji: string;
  title: LocalisedText;
  body: LocalisedText;
  play: LocalisedText;
  legalBoundary: LocalisedText;
  sourceIds: string[];
}

export interface PoliticsCard {
  id: string;
  title: LocalisedText;
  plain: LocalisedText;
  whyItMatters: LocalisedText;
  action: LocalisedText;
  sourceIds: string[];
}

export interface TaxSource {
  id: string;
  name: string;
  url: string;
  kind: "official" | "parliament" | "fiscal-watchdog";
}

export const playgroundCopy = {
  eyebrow: {
    en: "TaxSorted playground",
    "zh-HK": "TaxSorted 遊樂場",
    "zh-CN": "TaxSorted 税务游乐场",
    pl: "Plac zabaw TaxSorted",
    hi: "TaxSorted खेलघर",
    ur: "TaxSorted کھیل کا میدان",
  },
  headline: {
    en: "Make UK tax fun — and still keep it clean.",
    "zh-HK": "英國稅可以好玩，但要乾淨合法。",
    "zh-CN": "英国税也可以好玩，但要清楚合法。",
    pl: "Podatki w UK mogą być zabawne — i nadal czyste.",
    hi: "UK टैक्स मज़ेदार हो सकता है — और फिर भी साफ़।",
    ur: "UK ٹیکس مزے کا بھی ہو سکتا ہے — اور صاف بھی۔",
  },
  subhead: {
    en: "Learn the allowances, traps and political moves that shape your payslip. Play hard with the rules; never fake the facts.",
    "zh-HK": "學 allowances、陷阱同政治玩法。規則可以玩盡；事實唔可以作假。",
    "zh-CN": "学懂免税额、陷阱和政治规则。规则可以用尽；事实不能造假。",
    pl: "Poznaj ulgi, pułapki i politykę stojącą za Twoją wypłatą. Graj zasadami; nigdy nie fałszuj faktów.",
    hi: "अपनी payslip को चलाने वाली allowances, traps और राजनीति समझो। नियमों से खेलो; तथ्यों को कभी मत गढ़ो।",
    ur: "اپنی payslip کے پیچھے allowances، traps اور سیاست سمجھو۔ قانون کے اندر کھیلیں؛ حقائق کبھی نہ بنائیں۔",
  },
  boundary: {
    en: "No evasion. No fake invoices. No hidden income. This is lawful clarity, not grey-scheme cosplay.",
    "zh-HK": "唔逃稅、唔假單、唔匿收入。呢度係合法清晰，唔係灰色 cosplay。",
    "zh-CN": "不逃税、不假发票、不隐瞒收入。这里是合法清晰，不是灰色方案。",
    pl: "Bez uchylania się, fałszywych faktur i ukrywania dochodu. To legalna jasność, nie szara strefa.",
    hi: "न टैक्स चोरी, न नकली invoice, न income छुपाना। यह कानूनी clarity है, grey scheme नहीं।",
    ur: "نہ ٹیکس چوری، نہ جعلی invoice، نہ آمدنی چھپانا۔ یہ قانونی clarity ہے، grey scheme نہیں۔",
  },
  languageLabel: {
    en: "Language",
    "zh-HK": "語言",
    "zh-CN": "语言",
    pl: "Język",
    hi: "भाषा",
    ur: "زبان",
  },
  funHeading: {
    en: "Learn to play — legally",
    "zh-HK": "教你玩 — 合法版",
    "zh-CN": "教你玩 — 合法版",
    pl: "Naucz się grać — legalnie",
    hi: "खेलना सीखो — कानूनी तरीके से",
    ur: "کھیلنا سیکھیں — قانونی طریقے سے",
  },
  politicsHeading: {
    en: "Deep into UK tax politics",
    "zh-HK": "深入英國稅務政治",
    "zh-CN": "深入英国税务政治",
    pl: "Głęboko w politykę podatkową UK",
    hi: "UK tax politics की गहराई",
    ur: "UK tax politics کی گہرائی",
  },
  receiptsHeading: {
    en: "Receipts, not vibes",
    "zh-HK": "講 receipts，唔講 vibes",
    "zh-CN": "讲证据，不靠感觉",
    pl: "Dowody, nie vibe'y",
    hi: "सबूत, vibes नहीं",
    ur: "ثبوت، vibes نہیں",
  },
} satisfies Record<string, LocalisedText>;

export const taxSources: TaxSource[] = [
  {
    id: "govuk-income-tax",
    name: "GOV.UK Income Tax rates and Personal Allowances",
    url: "https://www.gov.uk/income-tax-rates",
    kind: "official",
  },
  {
    id: "govuk-cgt",
    name: "GOV.UK Capital Gains Tax rates",
    url: "https://www.gov.uk/capital-gains-tax/rates",
    kind: "official",
  },
  {
    id: "govuk-isa",
    name: "GOV.UK Individual Savings Accounts",
    url: "https://www.gov.uk/individual-savings-accounts",
    kind: "official",
  },
  {
    id: "govuk-hicbc",
    name: "GOV.UK High Income Child Benefit Charge",
    url: "https://www.gov.uk/child-benefit-tax-charge",
    kind: "official",
  },
  {
    id: "commons-fiscal-drag",
    name: "House of Commons Library: Fiscal drag",
    url: "https://commonslibrary.parliament.uk/research-briefings/cbp-9687/",
    kind: "parliament",
  },
  {
    id: "commons-tax-statistics",
    name: "House of Commons Library: Tax statistics overview",
    url: "https://commonslibrary.parliament.uk/research-briefings/cbp-8513/",
    kind: "parliament",
  },
  {
    id: "hmrc-receipts",
    name: "HMRC tax receipts and NICs annual bulletin",
    url: "https://www.gov.uk/government/statistics/hmrc-tax-and-nics-receipts-for-the-uk/hmrc-tax-receipts-and-national-insurance-contributions-for-the-uk-new-annual-bulletin",
    kind: "official",
  },
  {
    id: "commons-finance-bill",
    name: "House of Commons Library: Budget 2025 and Finance Bill",
    url: "https://commonslibrary.parliament.uk/research-briefings/cbp-10420/",
    kind: "parliament",
  },
  {
    id: "obr-receipts",
    name: "OBR Economic and fiscal outlook March 2026",
    url: "https://obr.uk/efo/economic-and-fiscal-outlook-march-2026/",
    kind: "fiscal-watchdog",
  },
];

export const funTaxCards: FunTaxCard[] = [
  {
    id: "allowance-shield",
    emoji: "🛡️",
    title: {
      en: "Personal Allowance shield",
      "zh-HK": "Personal Allowance 護盾",
      "zh-CN": "个人免税额护盾",
      pl: "Tarcza Personal Allowance",
      hi: "Personal Allowance shield",
      ur: "Personal Allowance شیلڈ",
    },
    body: {
      en: "The first slice of income can be tax-free — but the shield melts after £100k adjusted net income.",
      "zh-HK": "頭一截收入可以免稅；但 adjusted net income 過 £100k，個 shield 會溶。",
      "zh-CN": "第一段收入可能免税；但 adjusted net income 超过 £100k，护盾会变薄。",
      pl: "Pierwsza część dochodu może być wolna od podatku — ale tarcza topnieje po £100k adjusted net income.",
      hi: "Income का पहला हिस्सा tax-free हो सकता है — पर £100k adjusted net income के बाद shield पिघलता है।",
      ur: "آمدنی کا پہلا حصہ tax-free ہو سکتا ہے — مگر £100k adjusted net income کے بعد shield پگھلتا ہے۔",
    },
    play: {
      en: "Play: model pension/Gift Aid before the cliff, not after payroll has already swallowed the bonus.",
      "zh-HK": "玩法：bonus 入袋前先 model pension/Gift Aid，唔好等 payroll 食咗先嚟呻。",
      "zh-CN": "玩法：奖金发放前先模拟 pension/Gift Aid，不要等 payroll 扣完才后悔。",
      pl: "Zagranie: modeluj pension/Gift Aid przed klifem, nie po tym jak payroll połknie bonus.",
      hi: "Play: bonus payroll में जाने से पहले pension/Gift Aid model करो।",
      ur: "Play: bonus payroll میں جانے سے پہلے pension/Gift Aid model کریں۔",
    },
    legalBoundary: {
      en: "Use real contributions and records only.",
      "zh-HK": "只用真實供款同紀錄。",
      "zh-CN": "只用真实供款和记录。",
      pl: "Tylko realne wpłaty i dokumenty.",
      hi: "सिर्फ वास्तविक contributions और records।",
      ur: "صرف حقیقی contributions اور records۔",
    },
    sourceIds: ["govuk-income-tax"],
  },
  {
    id: "isa-forcefield",
    emoji: "✨",
    title: {
      en: "ISA forcefield",
      "zh-HK": "ISA 防護罩",
      "zh-CN": "ISA 防护罩",
      pl: "Pole ochronne ISA",
      hi: "ISA forcefield",
      ur: "ISA forcefield",
    },
    body: {
      en: "A boring wrapper that can make future interest, dividends and gains much less annoying.",
      "zh-HK": "悶悶哋嘅 wrapper，但可以令未來 interest/dividends/gains 少好多麻煩。",
      "zh-CN": "一个看似无聊的 wrapper，但能让未来利息、股息和 gains 少很多麻烦。",
      pl: "Nudne opakowanie, które może mocno uspokoić przyszłe odsetki, dywidendy i zyski.",
      hi: "एक boring wrapper जो future interest, dividends और gains को कम परेशान कर सकता है।",
      ur: "ایک boring wrapper جو future interest, dividends اور gains کو کم پریشان کر سکتا ہے۔",
    },
    play: {
      en: "Play: shelter before compounding gets spicy.",
      "zh-HK": "玩法：compound 爆之前先入 shelter。",
      "zh-CN": "玩法：复利变大之前先放进 shelter。",
      pl: "Zagranie: schowaj zanim procent składany zrobi się pikantny.",
      hi: "Play: compounding spicy होने से पहले shelter करो।",
      ur: "Play: compounding spicy ہونے سے پہلے shelter کریں۔",
    },
    legalBoundary: {
      en: "Stay within ISA rules and annual limits.",
      "zh-HK": "跟足 ISA 規則同年度限額。",
      "zh-CN": "遵守 ISA 规则和年度限额。",
      pl: "Trzymaj się zasad i rocznego limitu ISA.",
      hi: "ISA rules और annual limits के अंदर रहें।",
      ur: "ISA rules اور annual limits کے اندر رہیں۔",
    },
    sourceIds: ["govuk-isa"],
  },
  {
    id: "child-benefit-trapdoor",
    emoji: "🪤",
    title: {
      en: "Child Benefit trapdoor",
      "zh-HK": "Child Benefit 暗格",
      "zh-CN": "Child Benefit 暗门",
      pl: "Pułapka Child Benefit",
      hi: "Child Benefit trapdoor",
      ur: "Child Benefit trapdoor",
    },
    body: {
      en: "The charge is based on adjusted net income — not vibes, not household fairness, the rules.",
      "zh-HK": "個 charge 睇 adjusted net income — 唔係感覺，唔係屋企公平感，係規則。",
      "zh-CN": "charge 看 adjusted net income — 不是感觉，也不是家庭公平感，是规则。",
      pl: "Opłata zależy od adjusted net income — nie od emocji, tylko od zasad.",
      hi: "Charge adjusted net income पर है — vibes पर नहीं, rules पर।",
      ur: "Charge adjusted net income پر ہے — vibes نہیں، rules۔",
    },
    play: {
      en: "Play: check who has the higher adjusted net income before making claim/repayment choices.",
      "zh-HK": "玩法：claim/repay 前，先睇邊個 adjusted net income 高。",
      "zh-CN": "玩法：claim/repay 前先看谁的 adjusted net income 更高。",
      pl: "Zagranie: przed decyzją sprawdź, kto ma wyższy adjusted net income.",
      hi: "Play: claim/repay से पहले देखें किसका adjusted net income ज़्यादा है।",
      ur: "Play: claim/repay سے پہلے دیکھیں کس کا adjusted net income زیادہ ہے۔",
    },
    legalBoundary: {
      en: "Do not stop claims blindly; National Insurance credits can matter.",
      "zh-HK": "唔好盲停 claim；NI credits 可能好重要。",
      "zh-CN": "不要盲目停止 claim；NI credits 可能很重要。",
      pl: "Nie zatrzymuj świadczenia w ciemno; NI credits mogą mieć znaczenie.",
      hi: "Claim blindly बंद न करें; NI credits matter कर सकते हैं।",
      ur: "Claim اندھا دھند بند نہ کریں؛ NI credits اہم ہو سکتے ہیں۔",
    },
    sourceIds: ["govuk-hicbc"],
  },
];

export const politicsCards: PoliticsCard[] = [
  {
    id: "fiscal-drag",
    title: {
      en: "Fiscal drag: the stealth boss",
      "zh-HK": "Fiscal drag：隱形大佬",
      "zh-CN": "Fiscal drag：隐形 boss",
      pl: "Fiscal drag: ukryty boss",
      hi: "Fiscal drag: stealth boss",
      ur: "Fiscal drag: stealth boss",
    },
    plain: {
      en: "When thresholds freeze while wages/prices rise, more income gets pulled into tax without a headline rate rise.",
      "zh-HK": "threshold 唔郁，但人工/物價升，就算 headline tax rate 冇升，你都可能交多咗。",
      "zh-CN": "threshold 冻结而工资/物价上涨，即使 headline tax rate 不变，你也可能交更多。",
      pl: "Gdy progi stoją w miejscu, a płace/ceny rosną, więcej dochodu wpada do podatku bez zmiany stawki.",
      hi: "Thresholds freeze हों और wages/prices बढ़ें, तो headline rate बदले बिना ज़्यादा income taxed होती है।",
      ur: "Thresholds freeze ہوں اور wages/prices بڑھیں تو headline rate بدلے بغیر زیادہ income taxed ہوتی ہے۔",
    },
    whyItMatters: {
      en: "This is politics in spreadsheet form: a tax rise that often feels like gravity.",
      "zh-HK": "呢個就係 spreadsheet 形態嘅政治：似地心吸力咁慢慢加稅。",
      "zh-CN": "这就是 spreadsheet 形态的政治：像重力一样慢慢增税。",
      pl: "To polityka w arkuszu kalkulacyjnym: podwyżka, która wygląda jak grawitacja.",
      hi: "यह spreadsheet वाली politics है: tax rise जो gravity जैसा लगता है।",
      ur: "یہ spreadsheet والی politics ہے: tax rise جو gravity جیسا لگتا ہے۔",
    },
    action: {
      en: "Action: know your marginal band before bonuses, pay rises and pension decisions.",
      "zh-HK": "行動：bonus、加人工、pension 決定前，先知自己 marginal band。",
      "zh-CN": "行动：奖金、加薪、pension 决定前先知道自己的 marginal band。",
      pl: "Akcja: poznaj swój marginal band przed premią, podwyżką i pension decyzją.",
      hi: "Action: bonus, raise और pension decision से पहले marginal band जानो।",
      ur: "Action: bonus، raise اور pension decision سے پہلے marginal band جانیں۔",
    },
    sourceIds: ["commons-fiscal-drag"],
  },
  {
    id: "big-three-receipts",
    title: {
      en: "The big three pay for the state",
      "zh-HK": "三大稅種撐住國家部機",
      "zh-CN": "三大税种支撑国家机器",
      pl: "Wielka trójka finansuje państwo",
      hi: "Big three state को fund करते हैं",
      ur: "Big three ریاست کو fund کرتے ہیں",
    },
    plain: {
      en: "Income Tax, National Insurance and VAT are the giant receipts machines. That is why tiny threshold changes matter.",
      "zh-HK": "Income Tax、NI、VAT 係超大收錢機；所以細細個 threshold 改動都好大件事。",
      "zh-CN": "Income Tax、NI、VAT 是巨大的收款机器；所以小小 threshold 变动都很重要。",
      pl: "Income Tax, NI i VAT to wielkie maszyny wpływów. Dlatego małe progi mają duży efekt.",
      hi: "Income Tax, NI और VAT बड़े receipt machines हैं। इसलिए छोटे thresholds भी matter करते हैं।",
      ur: "Income Tax, NI اور VAT بڑے receipt machines ہیں۔ اسی لیے چھوٹے thresholds بھی اہم ہیں۔",
    },
    whyItMatters: {
      en: "Tax politics is not only rates; it is what base gets squeezed and who notices.",
      "zh-HK": "稅務政治唔只係 rate；係邊個 base 被 squeeze，同邊個有感。",
      "zh-CN": "税务政治不只是 rate；还看哪个 base 被挤压、谁感觉到。",
      pl: "Polityka podatkowa to nie tylko stawki; to baza, którą się ściska.",
      hi: "Tax politics सिर्फ rates नहीं; किस base को squeeze किया जाता है।",
      ur: "Tax politics صرف rates نہیں؛ کس base کو squeeze کیا جاتا ہے۔",
    },
    action: {
      en: "Action: read policy through receipts: who pays, who collects, who can move?",
      "zh-HK": "行動：用 receipts 睇政策：邊個俾、邊個收、邊個走得郁？",
      "zh-CN": "行动：用 receipts 看政策：谁付、谁收、谁能移动？",
      pl: "Akcja: czytaj politykę przez wpływy: kto płaci, kto zbiera, kto może się ruszyć?",
      hi: "Action: receipts से policy पढ़ो: कौन pays, कौन collects, कौन move कर सकता है?",
      ur: "Action: receipts سے policy پڑھیں: کون pays، کون collects، کون move کر سکتا ہے؟",
    },
    sourceIds: ["commons-tax-statistics", "hmrc-receipts"],
  },
  {
    id: "finance-bill-game",
    title: {
      en: "Budget speech is not the final boss",
      "zh-HK": "Budget speech 唔係 final boss",
      "zh-CN": "Budget speech 不是 final boss",
      pl: "Budget speech to nie final boss",
      hi: "Budget speech final boss नहीं",
      ur: "Budget speech final boss نہیں",
    },
    plain: {
      en: "Announcements become law through resolutions, Finance Bills, amendments and HMRC guidance.",
      "zh-HK": "announcement 要經 resolutions、Finance Bill、amendments、HMRC guidance 先落地。",
      "zh-CN": "announcement 要经过 resolutions、Finance Bill、amendments、HMRC guidance 才落地。",
      pl: "Zapowiedzi stają się prawem przez resolutions, Finance Bills, poprawki i guidance HMRC.",
      hi: "Announcements resolutions, Finance Bills, amendments और HMRC guidance से law बनते हैं।",
      ur: "Announcements resolutions، Finance Bills، amendments اور HMRC guidance سے law بنتے ہیں۔",
    },
    whyItMatters: {
      en: "Between speech and law, detail moves. That is where politics, lobbying and drafting matter.",
      "zh-HK": "speech 同 law 中間，detail 會郁。政治、lobbying、drafting 就喺呢度發生。",
      "zh-CN": "speech 和 law 之间，detail 会变。政治、lobbying、drafting 就在这里发生。",
      pl: "Między przemową a ustawą detale się ruszają. Tam żyje polityka i lobbying.",
      hi: "Speech और law के बीच details बदलते हैं। वहीं politics और lobbying matter करते हैं।",
      ur: "Speech اور law کے بیچ details بدلتی ہیں۔ وہیں politics اور lobbying matter کرتے ہیں۔",
    },
    action: {
      en: "Action: treat Budget day as a weather alert; wait for legislation before filing strategy.",
      "zh-HK": "行動：Budget day 當天氣警報；報稅策略要等 legislation。",
      "zh-CN": "行动：Budget day 像天气预警；报税策略要等 legislation。",
      pl: "Akcja: Budget day traktuj jak alert pogodowy; strategię oprzyj na ustawie.",
      hi: "Action: Budget day को weather alert समझो; filing strategy law पर बनाओ।",
      ur: "Action: Budget day کو weather alert سمجھیں؛ filing strategy law پر بنائیں۔",
    },
    sourceIds: ["commons-finance-bill"],
  },
];

export function getSources(ids: string[]) {
  const sourceById = new Map(taxSources.map((source) => [source.id, source]));
  return ids.map((id) => sourceById.get(id)).filter((source): source is TaxSource => Boolean(source));
}
