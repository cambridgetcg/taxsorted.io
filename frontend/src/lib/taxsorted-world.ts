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
    en: "Learn how UK tax really works — always inside the law.",
    "zh-HK": "學識英國稅點樣運作 — 一切都喺法律之內。",
    "zh-CN": "学懂英国税如何运作 — 一切都在法律之内。",
    pl: "Zrozum, jak naprawdę działa podatek w UK — zawsze w granicach prawa.",
    hi: "समझें UK टैक्स असल में कैसे काम करता है — हमेशा कानून के अंदर।",
    ur: "سمجھیں UK ٹیکس اصل میں کیسے کام کرتا ہے — ہمیشہ قانون کے اندر۔",
  },
  subhead: {
    en: "Learn the allowances, traps and political moves that shape your payslip. Use the rules fully; never fake the facts.",
    "zh-HK": "學識影響你份糧嘅免稅額、陷阱同政治決定。規則可以用盡；事實唔可以作假。",
    "zh-CN": "学懂影响你工资的免税额、陷阱和政治决定。规则可以用尽；事实不能造假。",
    pl: "Poznaj ulgi, pułapki i decyzje polityczne stojące za Twoją wypłatą. Korzystaj z zasad w pełni; nigdy nie fałszuj faktów.",
    hi: "अपनी तनख्वाह को आकार देने वाली छूटें, जाल और राजनीतिक फ़ैसले समझें। नियमों का पूरा उपयोग करें; तथ्य कभी न गढ़ें।",
    ur: "اپنی تنخواہ پر اثر ڈالنے والی چھوٹیں، جال اور سیاسی فیصلے سمجھیں۔ قواعد کا پورا استعمال کریں؛ حقائق کبھی نہ بنائیں۔",
  },
  boundary: {
    en: "No tax evasion. No fake invoices. No hidden income. Everything here is legal and explained in plain words.",
    "zh-HK": "唔逃稅、唔開假單、唔匿收入。呢度樣樣都合法，用平白話講清楚。",
    "zh-CN": "不逃税、不开假发票、不隐瞒收入。这里的一切都合法，并用平实的话讲清楚。",
    pl: "Bez uchylania się od podatku, fałszywych faktur i ukrywania dochodu. Wszystko tutaj jest legalne i wyjaśnione prostymi słowami.",
    hi: "न टैक्स चोरी, न नकली चालान, न आमदनी छिपाना। यहाँ सब कुछ कानूनी है और सरल शब्दों में समझाया गया है।",
    ur: "نہ ٹیکس چوری، نہ جعلی رسیدیں، نہ آمدنی چھپانا۔ یہاں سب کچھ قانونی ہے اور سادہ الفاظ میں سمجھایا گیا ہے۔",
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
    en: "Every claim has an official source",
    "zh-HK": "每個講法都有官方出處",
    "zh-CN": "每个说法都有官方来源",
    pl: "Każde twierdzenie ma oficjalne źródło",
    hi: "हर बात का आधिकारिक स्रोत है",
    ur: "ہر بات کا سرکاری حوالہ موجود ہے",
  },
  playLabel: {
    en: "Play",
    "zh-HK": "玩法",
    "zh-CN": "玩法",
    pl: "Zagranie",
    hi: "खेल",
    ur: "کھیل",
  },
  cleanLineLabel: {
    en: "Clean line",
    "zh-HK": "合法界線",
    "zh-CN": "合法边界",
    pl: "Granica legalności",
    hi: "कानूनी सीमा",
    ur: "قانونی حد",
  },
  whyPoliticsLabel: {
    en: "Why politics matters",
    "zh-HK": "點解政治關事",
    "zh-CN": "为什么政治重要",
    pl: "Dlaczego polityka ma znaczenie",
    hi: "राजनीति क्यों मायने रखती है",
    ur: "سیاست کیوں اہم ہے",
  },
  moveLabel: {
    en: "Move",
    "zh-HK": "行動",
    "zh-CN": "行动",
    pl: "Ruch",
    hi: "कदम",
    ur: "قدم",
  },
  switcherHint: {
    en: "Use the globe switcher above to change the whole site.",
    "zh-HK": "用上面個地球掣，就可以轉成成個網站嘅語言。",
    "zh-CN": "用上面的地球按钮，即可切换整个网站的语言。",
    pl: "Użyj przełącznika z globusem powyżej, aby zmienić język całej strony.",
    hi: "पूरी साइट की भाषा बदलने के लिए ऊपर globe switcher का उपयोग करें।",
    ur: "پوری سائٹ کی زبان بدلنے کے لیے اوپر globe switcher استعمال کریں۔",
  },
} satisfies Record<string, LocalisedText>;

export const sourceKindLabels: Record<TaxSource["kind"], LocalisedText> = {
  official: {
    en: "official",
    "zh-HK": "官方",
    "zh-CN": "官方",
    pl: "oficjalne",
    hi: "आधिकारिक",
    ur: "سرکاری",
  },
  parliament: {
    en: "parliament",
    "zh-HK": "議會",
    "zh-CN": "议会",
    pl: "parlament",
    hi: "संसद",
    ur: "پارلیمان",
  },
  "fiscal-watchdog": {
    en: "fiscal watchdog",
    "zh-HK": "財政監察",
    "zh-CN": "财政监察",
    pl: "nadzór fiskalny",
    hi: "राजकोषीय निगरानी",
    ur: "مالیاتی نگران",
  },
};

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
      hi: "Personal Allowance की ढाल",
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
      en: "work out pension or Gift Aid payments before a bonus is paid, not after tax has been taken.",
      "zh-HK": "bonus 出糧之前，先計好退休金／Gift Aid，唔好等扣咗稅先算。",
      "zh-CN": "奖金发放之前先算好养老金／Gift Aid，不要等扣完税才算。",
      pl: "policz wpłaty na pension lub Gift Aid zanim premia zostanie wypłacona, nie po pobraniu podatku.",
      hi: "बोनस मिलने से पहले pension या Gift Aid की योजना बनाएं, टैक्स कटने के बाद नहीं।",
      ur: "بونس ملنے سے پہلے pension یا Gift Aid کا حساب کریں، ٹیکس کٹنے کے بعد نہیں۔",
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
      hi: "ISA का सुरक्षा कवच",
      ur: "ISA کی حفاظتی ڈھال",
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
      en: "move savings into the ISA early, before the growth builds up.",
      "zh-HK": "趁早將儲蓄放入 ISA，唔好等增值大咗先郁。",
      "zh-CN": "尽早把储蓄放进 ISA，不要等增值变大才行动。",
      pl: "przenieś oszczędności do ISA wcześnie, zanim zyski urosną.",
      hi: "बचत को जल्दी ISA में डालें, बढ़त बड़ी होने से पहले।",
      ur: "بچت کو جلد ISA میں ڈالیں، بڑھوتری بڑی ہونے سے پہلے۔",
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
      hi: "Child Benefit का छिपा दरवाज़ा",
      ur: "Child Benefit کا خفیہ دروازہ",
    },
    body: {
      en: "The charge follows adjusted net income exactly as the rules define it — not how fair it feels at home.",
      "zh-HK": "個 charge 完全跟 adjusted net income 規則計 — 唔係跟屋企覺得公唔公平。",
      "zh-CN": "这项收费完全按 adjusted net income 的规则计算 — 不看家里觉得公不公平。",
      pl: "Opłata wynika dokładnie z adjusted net income według zasad — nie z poczucia sprawiedliwości w domu.",
      hi: "यह charge नियमों के अनुसार adjusted net income पर ही लगता है — घर में क्या उचित लगता है, उस पर नहीं।",
      ur: "یہ charge قواعد کے مطابق adjusted net income پر ہی لگتا ہے — گھر میں کیا منصفانہ لگتا ہے، اس پر نہیں۔",
    },
    play: {
      en: "check who has the higher adjusted net income before making claim/repayment choices.",
      "zh-HK": "claim/repay 前，先睇邊個 adjusted net income 高。",
      "zh-CN": "claim/repay 前先看谁的 adjusted net income 更高。",
      pl: "przed decyzją sprawdź, kto ma wyższy adjusted net income.",
      hi: "claim/repay से पहले देखें किसका adjusted net income ज़्यादा है।",
      ur: "claim/repay سے پہلے دیکھیں کس کا adjusted net income زیادہ ہے۔",
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
      en: "Fiscal drag: the quiet tax rise",
      "zh-HK": "Fiscal drag：靜靜哋加稅",
      "zh-CN": "Fiscal drag：悄悄加税",
      pl: "Fiscal drag: cicha podwyżka podatku",
      hi: "Fiscal drag: चुपचाप बढ़ता टैक्स",
      ur: "Fiscal drag: خاموشی سے بڑھتا ٹیکس",
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
      en: "It is a tax rise most people never see announced — it arrives slowly, through frozen numbers.",
      "zh-HK": "呢種加稅冇人宣佈 — 靠凍結咗嘅數字，慢慢咁嚟。",
      "zh-CN": "这种加税没有人宣布 — 靠冻结的数字，慢慢到来。",
      pl: "To podwyżka podatku, której nikt nie ogłasza — przychodzi powoli, przez zamrożone progi.",
      hi: "यह ऐसी टैक्स बढ़ोतरी है जिसकी घोषणा नहीं होती — जमे हुए आंकड़ों से धीरे-धीरे आती है।",
      ur: "یہ ایسا ٹیکس اضافہ ہے جس کا اعلان نہیں ہوتا — منجمد اعداد کے ذریعے آہستہ آہستہ آتا ہے۔",
    },
    action: {
      en: "know your marginal band before bonuses, pay rises and pension decisions.",
      "zh-HK": "bonus、加人工、pension 決定前，先知自己 marginal band。",
      "zh-CN": "奖金、加薪、pension 决定前先知道自己的 marginal band。",
      pl: "poznaj swój marginal band przed premią, podwyżką i pension decyzją.",
      hi: "bonus, raise और pension decision से पहले marginal band जानो।",
      ur: "bonus، raise اور pension decision سے پہلے marginal band جانیں۔",
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
      en: "read policy through receipts: who pays, who collects, who can move?",
      "zh-HK": "用 receipts 睇政策：邊個俾、邊個收、邊個走得郁？",
      "zh-CN": "用 receipts 看政策：谁付、谁收、谁能移动？",
      pl: "czytaj politykę przez wpływy: kto płaci, kto zbiera, kto może się ruszyć?",
      hi: "receipts से policy पढ़ो: कौन pays, कौन collects, कौन move कर सकता है?",
      ur: "receipts سے policy پڑھیں: کون pays، کون collects، کون move کر سکتا ہے؟",
    },
    sourceIds: ["commons-tax-statistics", "hmrc-receipts"],
  },
  {
    id: "finance-bill-game",
    title: {
      en: "The Budget speech is not the final word",
      "zh-HK": "Budget speech 唔係最後定案",
      "zh-CN": "Budget speech 不是最终定案",
      pl: "Budget speech to nie ostatnie słowo",
      hi: "Budget speech आख़िरी फ़ैसला नहीं है",
      ur: "Budget speech آخری فیصلہ نہیں ہے",
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
      en: "treat Budget day as a weather alert; wait for legislation before filing strategy.",
      "zh-HK": "Budget day 當天氣警報；報稅策略要等 legislation。",
      "zh-CN": "Budget day 像天气预警；报税策略要等 legislation。",
      pl: "Budget day traktuj jak alert pogodowy; strategię oprzyj na ustawie.",
      hi: "Budget day को weather alert समझो; filing strategy law पर बनाओ।",
      ur: "Budget day کو weather alert سمجھیں؛ filing strategy law پر بنائیں۔",
    },
    sourceIds: ["commons-finance-bill"],
  },
];

export function getSources(ids: string[]) {
  const sourceById = new Map(taxSources.map((source) => [source.id, source]));
  return ids.map((id) => sourceById.get(id)).filter((source): source is TaxSource => Boolean(source));
}
