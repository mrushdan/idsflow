// Mock bibliographic data for IDS references.
// In production this would be fetched from EPO Espacenet OPS API.

export type RefKind = "patent" | "npl";
export type ProsecutionStage = "pre-FAOM" | "post-FAOM" | "post-Notice" | "post-Issue";
export type FilingStatus = "draft" | "validated" | "filed" | "needs-review";

export interface Reference {
  id: string;
  number: string;            // e.g. US-2019/123456-A1
  country: string;           // ISO country code
  kind: RefKind;
  title: string;
  applicants: string[];
  inventors: string[];
  pubDate: string;           // YYYY-MM-DD
  filingDate?: string;
  language: string;          // 'en' | 'ja' | 'zh' | 'de' | 'fr' …
  family?: string;           // simple family ID
  pdfPages: number;
  pdfBytes: number;
  compliance: {
    pdfA: boolean;
    fontsEmbedded: boolean;
    sizeOk: boolean;          // ≤ 25 MB
    legibleScan: boolean;
    autoFixed: boolean;
  };
  englishFamilyMember?: string; // e.g. "US-9,876,543-B2 (family member)"
  source: "Espacenet" | "USPTO" | "Manual";
}

export interface Filing {
  id: string;
  matter: string;             // e.g. "WLP-29387-US"
  applicationNumber: string;  // e.g. "17/845,221"
  client: string;
  inventor: string;
  title: string;
  stage: ProsecutionStage;
  status: FilingStatus;
  references: Reference[];
  createdAt: string;
  dueDate: string;
  attorney: string;
  paralegal: string;
}

const today = (offset = 0) => {
  const d = new Date(2026, 3, 30 + offset);
  return d.toISOString().slice(0, 10);
};

export const sampleReferences: Reference[] = [
  {
    id: "r1",
    number: "JP-2018-145672-A",
    country: "JP",
    kind: "patent",
    title: "半導体装置およびその製造方法 / Semiconductor Device and Method of Manufacturing the Same",
    applicants: ["Tokyo Electron Limited"],
    inventors: ["TANAKA, Hiroshi", "SUZUKI, Akira"],
    pubDate: "2018-09-20",
    filingDate: "2017-03-08",
    language: "ja",
    family: "F-44021",
    pdfPages: 38,
    pdfBytes: 4_120_000,
    compliance: { pdfA: true, fontsEmbedded: true, sizeOk: true, legibleScan: true, autoFixed: false },
    englishFamilyMember: "US-2020/0091283-A1",
    source: "Espacenet",
  },
  {
    id: "r2",
    number: "US-2019/0231405-A1",
    country: "US",
    kind: "patent",
    title: "Atomic Layer Deposition Apparatus With Multi-Zone Showerhead",
    applicants: ["Applied Materials, Inc."],
    inventors: ["KIM, J.", "PATEL, R.", "OKONKWO, C."],
    pubDate: "2019-07-25",
    filingDate: "2018-01-19",
    language: "en",
    family: "F-44021",
    pdfPages: 52,
    pdfBytes: 7_840_000,
    compliance: { pdfA: true, fontsEmbedded: true, sizeOk: true, legibleScan: true, autoFixed: false },
    source: "Espacenet",
  },
  {
    id: "r3",
    number: "CN-110234567-A",
    country: "CN",
    kind: "patent",
    title: "一种用于晶圆处理的等离子体反应室 / Plasma Reaction Chamber for Wafer Processing",
    applicants: ["SMIC International"],
    inventors: ["WANG, Lei", "ZHOU, Min"],
    pubDate: "2019-09-13",
    language: "zh",
    family: "F-77834",
    pdfPages: 24,
    pdfBytes: 3_220_000,
    compliance: { pdfA: false, fontsEmbedded: true, sizeOk: true, legibleScan: true, autoFixed: true },
    source: "Espacenet",
  },
  {
    id: "r4",
    number: "EP-3 458 211 B1",
    country: "EP",
    kind: "patent",
    title: "Method for Selective Etching of Silicon Nitride",
    applicants: ["ASML Netherlands B.V."],
    inventors: ["VAN DEN BERG, P."],
    pubDate: "2021-02-17",
    filingDate: "2017-05-22",
    language: "en",
    pdfPages: 31,
    pdfBytes: 4_900_000,
    compliance: { pdfA: true, fontsEmbedded: true, sizeOk: true, legibleScan: true, autoFixed: false },
    source: "Espacenet",
  },
  {
    id: "r5",
    number: "WO-2020/118432-A1",
    country: "WO",
    kind: "patent",
    title: "Cryogenic Etch Process Using Hydrogen Fluoride and Ammonia",
    applicants: ["Lam Research Corporation"],
    inventors: ["NGUYEN, T.", "ROSS, M."],
    pubDate: "2020-06-11",
    language: "en",
    pdfPages: 47,
    pdfBytes: 6_120_000,
    compliance: { pdfA: true, fontsEmbedded: true, sizeOk: true, legibleScan: true, autoFixed: false },
    source: "Espacenet",
  },
  {
    id: "r6",
    number: "JP-2020-007512-A",
    country: "JP",
    kind: "patent",
    title: "プラズマ処理装置 / Plasma Processing Apparatus",
    applicants: ["Hitachi High-Tech Corporation"],
    inventors: ["YAMADA, K.", "ITO, S."],
    pubDate: "2020-01-16",
    language: "ja",
    pdfPages: 29,
    pdfBytes: 3_410_000,
    compliance: { pdfA: true, fontsEmbedded: false, sizeOk: true, legibleScan: true, autoFixed: true },
    englishFamilyMember: "US-2021/0210384-A1",
    source: "Espacenet",
  },
  {
    id: "r7",
    number: "Smith et al., \"Atomic-scale uniformity in cryogenic etch,\" J. Vac. Sci. Technol. A 38, 042602 (2020)",
    country: "—",
    kind: "npl",
    title: "Atomic-scale uniformity in cryogenic etch",
    applicants: ["AVS Publishing"],
    inventors: ["Smith, J.", "Lee, H.", "Park, S."],
    pubDate: "2020-07-01",
    language: "en",
    pdfPages: 9,
    pdfBytes: 1_280_000,
    compliance: { pdfA: true, fontsEmbedded: true, sizeOk: true, legibleScan: true, autoFixed: false },
    source: "Manual",
  },
  {
    id: "r8",
    number: "KR-10-2019-0034521-A",
    country: "KR",
    kind: "patent",
    title: "반도체 공정용 에칭 장치 / Etching Apparatus for Semiconductor Processing",
    applicants: ["Samsung Electronics Co., Ltd."],
    inventors: ["PARK, J.", "CHOI, H."],
    pubDate: "2019-04-02",
    language: "ko",
    pdfPages: 42,
    pdfBytes: 5_330_000,
    compliance: { pdfA: true, fontsEmbedded: true, sizeOk: true, legibleScan: true, autoFixed: false },
    source: "Espacenet",
  },
];

export const sampleFilings: Filing[] = [
  {
    id: "WLP-29387",
    matter: "WLP-29387-US",
    applicationNumber: "17/845,221",
    client: "Tokyo Electron Limited",
    inventor: "TANAKA, Hiroshi et al.",
    title: "Semiconductor Device and Method of Manufacturing the Same",
    stage: "pre-FAOM",
    status: "needs-review",
    references: sampleReferences,
    createdAt: today(-3),
    dueDate: today(2),
    attorney: "M. Halloran",
    paralegal: "You",
  },
  {
    id: "WLP-30112",
    matter: "WLP-30112-US",
    applicationNumber: "18/220,447",
    client: "Hitachi High-Tech Corporation",
    inventor: "YAMADA, K.",
    title: "Plasma Processing Apparatus With Real-Time Endpoint Detection",
    stage: "post-FAOM",
    status: "validated",
    references: sampleReferences.slice(0, 4),
    createdAt: today(-7),
    dueDate: today(5),
    attorney: "R. Lind",
    paralegal: "You",
  },
  {
    id: "WLP-28954",
    matter: "WLP-28954-US",
    applicationNumber: "17/611,902",
    client: "SMIC International",
    inventor: "WANG, Lei",
    title: "Plasma Reaction Chamber for Wafer Processing",
    stage: "post-Notice",
    status: "filed",
    references: sampleReferences.slice(2, 7),
    createdAt: today(-21),
    dueDate: today(-14),
    attorney: "J. Ponack",
    paralegal: "You",
  },
  {
    id: "WLP-30401",
    matter: "WLP-30401-US",
    applicationNumber: "18/331,008",
    client: "ASML Netherlands B.V.",
    inventor: "VAN DEN BERG, P.",
    title: "Method for Selective Etching of Silicon Nitride",
    stage: "pre-FAOM",
    status: "draft",
    references: sampleReferences.slice(3, 6),
    createdAt: today(-1),
    dueDate: today(11),
    attorney: "M. Halloran",
    paralegal: "You",
  },
];

export const formatBytes = (b: number) => {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
};

export const stageCertification: Record<ProsecutionStage, { code: string; label: string; note: string }> = {
  "pre-FAOM": {
    code: "37 C.F.R. § 1.97(b)",
    label: "Within 3 months of filing or before FAOM",
    note: "No fee, no certification required.",
  },
  "post-FAOM": {
    code: "37 C.F.R. § 1.97(c)",
    label: "After FAOM, before Final Office Action",
    note: "Requires § 1.97(e) certification or fee under § 1.17(p).",
  },
  "post-Notice": {
    code: "37 C.F.R. § 1.97(d)",
    label: "After Final / Notice of Allowance",
    note: "Requires § 1.97(e)(1) certification AND fee under § 1.17(p).",
  },
  "post-Issue": {
    code: "37 C.F.R. § 1.97(i)",
    label: "After issue fee paid",
    note: "Not considered. Recommend QPIDS or RCE pathway.",
  },
};
