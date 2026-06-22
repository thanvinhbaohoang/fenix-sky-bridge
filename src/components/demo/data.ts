export type Transaction = { code: string; description: string; date: string };
export type Citation = {
  reference: string;
  type: "US Patent" | "US Pub." | "Foreign" | "NPL";
  source: "IDS" | "892" | "Manual";
  pages: string;
  crossCite?: boolean;
  needsTranslation?: boolean;
};

export type AppData = {
  appNumber: string;
  matter: string;
  title: string;
  assignee: string;
  inventors: string;
  artUnit: string;
  examiner: string;
  filingDate: string;
  transactions: Transaction[];
  citations: Citation[];
};

export const DOCKETABLE = [
  "CTAV","CTNF","CTFR","CTRS","ABN","NOA","ISSUE.NTF","NTC.PUB","APP.FILE.REC","RCEX",
];

export const EVENT_LABELS: Record<string, string> = {
  RCEX: "Request for Continued Examination",
  CTNF: "Non-Final Rejection",
  CTFR: "Final Rejection",
  CTAV: "Advisory Action",
  CTRS: "Restriction Requirement",
  ABN: "Abandonment",
  NOA: "Notice of Allowance",
  "ISSUE.NTF": "Issue Notification",
  "NTC.PUB": "Notice of Publication",
  "APP.FILE.REC": "Filing Receipt",
};

export const TRANSACTION_DESCRIPTIONS: Record<string, string> = {
  RCEX: "Request for Continued Examination",
  CTNF: "Non-Final Rejection",
  CTFR: "Final Rejection",
  CTAV: "Advisory Action (PTOL-303)",
  CTRS: "Restriction Requirement",
  ABN: "Abandonment",
  ABN9: "Disposal for RCE",
  NOA: "Notice of Allowance",
  "ISSUE.NTF": "Issue Notification",
  "NTC.PUB": "Notice of Publication",
  "APP.FILE.REC": "Filing Receipt",
  WIDS: "IDS Filed",
};

export function eventColor(code: string): {
  bg: string;
  text: string;
  border: string;
  ring: string;
  tint: string;
  chip: string;
} {
  if (["CTNF", "CTRS", "CTAV"].includes(code))
    return {
      bg: "bg-amber-900/60",
      text: "text-amber-300",
      border: "border-amber-700/60",
      ring: "ring-amber-500/30",
      tint: "bg-amber-950/40",
      chip: "bg-amber-500/20 text-amber-200 border-amber-500/40",
    };
  if (["CTFR", "ABN"].includes(code))
    return {
      bg: "bg-red-900/60",
      text: "text-red-300",
      border: "border-red-700/60",
      ring: "ring-red-500/30",
      tint: "bg-red-950/40",
      chip: "bg-red-500/20 text-red-200 border-red-500/40",
    };
  if (["NOA", "ISSUE.NTF"].includes(code))
    return {
      bg: "bg-emerald-900/60",
      text: "text-emerald-300",
      border: "border-emerald-700/60",
      ring: "ring-emerald-500/30",
      tint: "bg-emerald-950/40",
      chip: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
    };
  if (["RCEX", "NTC.PUB", "APP.FILE.REC"].includes(code))
    return {
      bg: "bg-blue-900/60",
      text: "text-blue-300",
      border: "border-blue-700/60",
      ring: "ring-blue-500/30",
      tint: "bg-blue-950/40",
      chip: "bg-blue-500/20 text-blue-200 border-blue-500/40",
    };
  if (["CTRS"].includes(code))
    return {
      bg: "bg-teal-900/60",
      text: "text-teal-300",
      border: "border-teal-700/60",
      ring: "ring-teal-500/30",
      tint: "bg-teal-950/40",
      chip: "bg-teal-500/20 text-teal-200 border-teal-500/40",
    };
  return {
    bg: "bg-zinc-800/70",
    text: "text-zinc-300",
    border: "border-zinc-700",
    ring: "ring-zinc-500/30",
    tint: "bg-zinc-900/40",
    chip: "bg-zinc-700/40 text-zinc-300 border-zinc-600",
  };
}

export const EVENT_ICONS: Record<string, string> = {
  RCEX: "🔄",
  CTNF: "⚠️",
  CTFR: "⛔",
  CTAV: "⚠️",
  CTRS: "🔀",
  ABN: "❌",
  NOA: "✅",
  "ISSUE.NTF": "📜",
  "NTC.PUB": "📰",
  "APP.FILE.REC": "📥",
};

export function detectEvent(txs: Transaction[]): Transaction | undefined {
  const sorted = [...txs].sort((a, b) => (a.date < b.date ? 1 : -1));
  return sorted.find((t) => DOCKETABLE.includes(t.code));
}

export const APPS: Record<string, AppData> = {
  "17/758,325": {
    appNumber: "17/758,325",
    matter: "17402-076001",
    title: "Terminal and Communication Method",
    assignee: "NTT DOCOMO, INC.",
    inventors: "Harada, Nagata, Wang",
    artUnit: "2468",
    examiner: "Jason A. Harley",
    filingDate: "2022-03-04",
    transactions: [
      { code: "ABN9", description: "Disposal for RCE", date: "2026-06-01" },
      { code: "RCEX", description: "Request for Continued Examination", date: "2026-05-21" },
      { code: "CTAV", description: "Advisory Action (PTOL-303)", date: "2026-04-24" },
      { code: "CTFR", description: "Final Rejection", date: "2026-02-10" },
      { code: "WIDS", description: "IDS Filed", date: "2026-01-14" },
      { code: "APP.FILE.REC", description: "Filing Receipt", date: "2022-03-10" },
    ],
    citations: [
      { reference: "JP 2018-502847", type: "Foreign", source: "IDS", pages: "32", crossCite: true, needsTranslation: true },
      { reference: "EP 3,412,008", type: "Foreign", source: "892", pages: "18", needsTranslation: true },
      { reference: "US 10,482,901", type: "US Patent", source: "892", pages: "24" },
      { reference: "US 2019/0312045", type: "US Pub.", source: "IDS", pages: "15" },
      { reference: "US 9,876,543", type: "US Patent", source: "IDS", pages: "22" },
    ],
  },
  "17/123,456": {
    appNumber: "17/123,456",
    matter: "NTS-2021-007A",
    title: "Neural Interface for Adaptive Signal Processing",
    assignee: "NeuraTech Systems Inc.",
    inventors: "Chen, Wei",
    artUnit: "2641",
    examiner: "Chen, Wei",
    filingDate: "2021-06-18",
    transactions: [
      { code: "CTNF", description: "Non-Final Rejection", date: "2024-11-02" },
      { code: "CTRS", description: "Restriction Requirement", date: "2024-07-15" },
      { code: "CTFR", description: "Final Rejection", date: "2024-03-09" },
      { code: "APP.FILE.REC", description: "Filing Receipt", date: "2021-06-22" },
    ],
    citations: [
      { reference: "US 10,482,901", type: "US Patent", source: "892", pages: "24", crossCite: true },
      { reference: "US 2019/0312045", type: "US Pub.", source: "892", pages: "15" },
      { reference: "US 8,234,101", type: "US Patent", source: "IDS", pages: "30" },
    ],
  },
  "16/987,654": {
    appNumber: "16/987,654",
    matter: "ADC-2020-112B",
    title: "Autonomous Vehicle Collision Avoidance System",
    assignee: "AutoDrive Corp.",
    inventors: "Kim, Patel",
    artUnit: "3668",
    examiner: "Patel, Arjun",
    filingDate: "2020-08-04",
    transactions: [
      { code: "NOA", description: "Notice of Allowance", date: "2025-01-15" },
      { code: "CTFR", description: "Final Rejection", date: "2024-08-20" },
      { code: "CTNF", description: "Non-Final Rejection", date: "2024-02-12" },
      { code: "APP.FILE.REC", description: "Filing Receipt", date: "2020-08-10" },
    ],
    citations: [
      { reference: "US 9,000,241", type: "US Patent", source: "892", pages: "20" },
      { reference: "US 2018/0056987", type: "US Pub.", source: "IDS", pages: "12" },
      { reference: "EP 2,987,654", type: "Foreign", source: "IDS", pages: "28", crossCite: true, needsTranslation: true },
    ],
  },
};

export type Task = {
  id: string;
  title: string;
  description: string;
  tag: "urgent" | "action" | "optional";
  assignee: string | null;
  tools: string[];
  done?: boolean;
};

export const TASKS_BY_EVENT: Record<string, Task[]> = {
  RCEX: [
    { id: "r1", title: "Confirm RCE was properly filed", description: "Verify RCE transmittal acknowledgment and fee receipt in IFW.", tag: "action", assignee: "S. Reyes", tools: [] },
    { id: "r2", title: "File any pending IDS", description: "Submit references found since last submission before next OA.", tag: "urgent", assignee: "S. Reyes", tools: ["Generate IDS", "Citation tool", "Email client"] },
    { id: "r3", title: "Update client and docket", description: "Reset OA deadline to ~14 months from RCE filing.", tag: "action", assignee: null, tools: ["Email client", "Set OA alert"] },
    { id: "r4", title: "Prepare for next Non-Final OA", description: "Pre-emptive prior art search and interview options.", tag: "optional", assignee: "M. Kim", tools: ["Prior art search", "Request interview"] },
  ],
  CTNF: [
    { id: "n1", title: "Docket all response deadlines", description: "3-month statutory + 3-month extension dates.", tag: "urgent", assignee: "S. Reyes", tools: ["Set deadline alert", "Email client"] },
    { id: "n2", title: "Send OA summary letter to client", description: "Plain-language summary of rejections and strategy.", tag: "urgent", assignee: "S. Reyes", tools: ["Email client", "Generate letter"] },
    { id: "n3", title: "Analyze prior art cited by Examiner", description: "Pull 892 references, claim charts, distinctions.", tag: "action", assignee: "M. Kim", tools: ["Citation tool", "Prior art search"] },
    { id: "n4", title: "Draft response + claim amendments", description: "Argue and amend; prepare arguments addressing each rejection.", tag: "action", assignee: "S. Reyes", tools: ["Office action tool", "Email client"] },
    { id: "n5", title: "File response + confirm IFW receipt", description: "EFS-Web filing, fee payment, confirmation.", tag: "urgent", assignee: "S. Reyes", tools: ["Generate IDS"] },
  ],
  CTFR: [
    { id: "f1", title: "Docket Final response deadlines", description: "2-month After Final window + 6-month statutory bar.", tag: "urgent", assignee: "S. Reyes", tools: ["Set deadline alert"] },
    { id: "f2", title: "Strategy call with client", description: "Discuss After Final vs RCE vs Appeal.", tag: "urgent", assignee: "J. Lee", tools: ["Email client"] },
    { id: "f3", title: "Analyze cited art and rejections", description: "Identify strongest path forward.", tag: "action", assignee: "M. Kim", tools: ["Citation tool", "Prior art search"] },
    { id: "f4", title: "Prepare After Final or RCE", description: "Draft amendments / RCE transmittal.", tag: "action", assignee: "S. Reyes", tools: ["Office action tool"] },
  ],
  CTAV: [
    { id: "a1", title: "Confirm Advisory Action deadlines", description: "Deadline still runs from Final Rejection date.", tag: "urgent", assignee: "S. Reyes", tools: ["Set deadline alert"] },
    { id: "a2", title: "Notify client — RCE or Appeal decision needed", description: "Explain After Final failed; need election in 5 business days.", tag: "urgent", assignee: "J. Lee", tools: ["Email client"] },
    { id: "a3", title: "Prepare RCE / Notice of Appeal", description: "Draft appropriate transmittal forms.", tag: "action", assignee: "S. Reyes", tools: ["Generate IDS"] },
  ],
  CTRS: [
    { id: "rs1", title: "Analyze restriction groupings", description: "Identify elected vs withdrawn claims.", tag: "action", assignee: "M. Kim", tools: ["Claim analysis"] },
    { id: "rs2", title: "Discuss election + divisional strategy", description: "Confirm client's elected group and downstream filings.", tag: "urgent", assignee: "J. Lee", tools: ["Email client"] },
    { id: "rs3", title: "File election (with or without traverse)", description: "Submit response within statutory period.", tag: "urgent", assignee: "S. Reyes", tools: ["Office action tool"] },
  ],
  ABN: [
    { id: "ab1", title: "Notify client immediately", description: "Application abandoned — revival options discussed.", tag: "urgent", assignee: "J. Lee", tools: ["Email client"] },
    { id: "ab2", title: "Evaluate Petition to Revive", description: "Confirm unintentional delay basis and timeline.", tag: "urgent", assignee: "S. Reyes", tools: ["Generate letter"] },
    { id: "ab3", title: "File Petition + revival fee", description: "Submit PTO/SB/64 and required statement.", tag: "urgent", assignee: "S. Reyes", tools: ["Generate IDS"] },
  ],
  NOA: [
    { id: "no1", title: "Docket issue fee deadline — HARD STOP", description: "3 months from NOA mailing date. No extensions.", tag: "urgent", assignee: "S. Reyes", tools: ["Set deadline alert"] },
    { id: "no2", title: "Send congratulatory notice to client", description: "Plain-language note, next steps, issue fee invoice.", tag: "action", assignee: "J. Lee", tools: ["Email client"] },
    { id: "no3", title: "Review allowed claims one final time", description: "Confirm scope and any examiner amendments.", tag: "action", assignee: "M. Kim", tools: [] },
    { id: "no4", title: "File Issue Fee Transmittal (PTO/SB/56)", description: "Pay issue fee, confirm publication fee.", tag: "urgent", assignee: "S. Reyes", tools: ["Generate IDS"] },
    { id: "no5", title: "Advise on continuation strategy", description: "Continuation/divisional window closes at issue.", tag: "optional", assignee: "J. Lee", tools: ["Email client"] },
  ],
  "ISSUE.NTF": [
    { id: "i1", title: "Record patent number + issue date", description: "Update docketing and client portal.", tag: "action", assignee: "S. Reyes", tools: ["Set deadline alert"] },
    { id: "i2", title: "Pre-docket maintenance fees", description: "3.5, 7.5, 11.5-year deadlines.", tag: "action", assignee: "S. Reyes", tools: ["Set deadline alert"] },
    { id: "i3", title: "Continuation window check", description: "Confirm any continuation filed before issue.", tag: "urgent", assignee: "J. Lee", tools: ["Email client"] },
  ],
  "NTC.PUB": [
    { id: "p1", title: "Notify client of publication", description: "Application now public; provisional rights apply.", tag: "action", assignee: "J. Lee", tools: ["Email client"] },
    { id: "p2", title: "Update marketing/PR clearance", description: "Patent Pending references can now reference pub. number.", tag: "optional", assignee: null, tools: [] },
  ],
  "APP.FILE.REC": [
    { id: "fr1", title: "Confirm filing details with client", description: "Number, filing date, priority claim.", tag: "action", assignee: "S. Reyes", tools: ["Email client"] },
    { id: "fr2", title: "Docket expected first OA", description: "Typically 12-18 months from filing.", tag: "action", assignee: "S. Reyes", tools: ["Set OA alert"] },
    { id: "fr3", title: "Verify priority claim & missing parts", description: "Confirm all formal requirements satisfied.", tag: "optional", assignee: "M. Kim", tools: [] },
  ],
};

export const FORMS_BY_EVENT: Record<string, { name: string; ref: string }[]> = {
  CTNF: [
    { name: "Response/Amendment", ref: "37 CFR 1.111" },
    { name: "Extension of Time", ref: "PTO/SB/22" },
    { name: "IDS", ref: "PTO/SB/08A" },
  ],
  CTFR: [
    { name: "After Final Response", ref: "37 CFR 1.116" },
    { name: "RCE Transmittal", ref: "PTO/SB/30" },
    { name: "Notice of Appeal", ref: "PTO/SB/31" },
  ],
  CTAV: [
    { name: "RCE Transmittal", ref: "PTO/SB/30" },
    { name: "Notice of Appeal", ref: "PTO/SB/31" },
  ],
  CTRS: [
    { name: "Election of Species", ref: "37 CFR 1.142" },
    { name: "Traverse Response", ref: "37 CFR 1.111" },
  ],
  ABN: [
    { name: "Petition to Revive", ref: "37 CFR 1.137a" },
    { name: "Revival Fee", ref: "PTO/SB/64" },
  ],
  NOA: [
    { name: "Issue Fee Transmittal", ref: "PTO/SB/56" },
    { name: "Post-Allowance Amendment", ref: "37 CFR 1.312" },
  ],
  RCEX: [
    { name: "IDS new art", ref: "PTO/SB/08A" },
    { name: "Docket Update", ref: "Internal" },
  ],
  "ISSUE.NTF": [
    { name: "Maintenance Fee Schedule", ref: "Internal" },
    { name: "Continuation", ref: "37 CFR 1.53" },
  ],
  "NTC.PUB": [{ name: "Provisional Rights Notice", ref: "35 USC 154d" }],
  "APP.FILE.REC": [
    { name: "Priority Claim Check", ref: "37 CFR 1.78" },
    { name: "Missing Parts", ref: "37 CFR 1.53" },
  ],
};

export function emailTemplate(code: string, app: AppData): { subject: string; body: string } {
  const client = app.assignee;
  switch (code) {
    case "RCEX":
      return {
        subject: `RCE filed in ${app.appNumber} — prosecution reset`,
        body: `Dear ${client} IP Team,\n\nWe have confirmed that the Request for Continued Examination (RCE) in U.S. Application No. ${app.appNumber} ("${app.title}") was properly filed and acknowledged by the USPTO.\n\nThis resets prosecution. The Examiner will issue a new Non-Final Office Action, typically within 12–14 months. No action is required from you at this time.\n\nWe will keep you updated as soon as the next Office Action is received.\n\nBest regards,\nIP Team`,
      };
    case "CTNF":
      return {
        subject: `Non-Final Office Action received in ${app.appNumber}`,
        body: `Dear ${client} IP Team,\n\nThe USPTO has issued a Non-Final Office Action in U.S. Application No. ${app.appNumber} ("${app.title}"). The Examiner has questioned — not denied — the pending claims.\n\nOur team is preparing a response with claim amendments and arguments distinguishing the cited art. We will share a draft for your approval before filing. No immediate action is needed from you.\n\nResponse deadline: 3 months statutory (extendable to 6).\n\nBest regards,\nIP Team`,
      };
    case "CTFR":
      return {
        subject: `URGENT — Final Rejection issued in ${app.appNumber}`,
        body: `Dear ${client} IP Team,\n\nThe USPTO has issued a Final Rejection in U.S. Application No. ${app.appNumber} ("${app.title}"). This is more serious than a Non-Final Rejection and we should schedule a strategy call within the next 5 business days.\n\nYour options are:\n  1. After-Final response (37 CFR 1.116) — narrow amendments only\n  2. Request for Continued Examination (RCE) — reset prosecution\n  3. Notice of Appeal to the PTAB\n\nWe will send a recommendation memo shortly. Please let us know your availability.\n\nBest regards,\nIP Team`,
      };
    case "CTAV":
      return {
        subject: `Advisory Action in ${app.appNumber} — election required`,
        body: `Dear ${client} IP Team,\n\nThe Examiner has issued an Advisory Action in U.S. Application No. ${app.appNumber}, meaning our After-Final response was not entered. We must now choose between filing an RCE or a Notice of Appeal.\n\nThe statutory deadline continues to run from the Final Rejection date. Please contact us within 5 business days so we can proceed.\n\nBest regards,\nIP Team`,
      };
    case "ABN":
      return {
        subject: `URGENT — Application ${app.appNumber} abandoned`,
        body: `Dear ${client} IP Team,\n\nWe are writing to inform you that U.S. Application No. ${app.appNumber} ("${app.title}") has gone abandoned. Revival may be possible via a Petition to Revive (37 CFR 1.137(a)) if the delay was unintentional.\n\nWe sincerely apologize for any inconvenience and request that you contact us immediately so we can begin the revival process without delay.\n\nBest regards,\nIP Team`,
      };
    case "NOA":
      return {
        subject: `🎉 Notice of Allowance — ${app.appNumber}`,
        body: `Dear ${client} IP Team,\n\nCongratulations! The USPTO has issued a Notice of Allowance in U.S. Application No. ${app.appNumber} ("${app.title}"). All pending claims have been allowed.\n\nThe issue fee is due within 3 months of the NOA mailing date — this deadline is NOT extendable. You may also now mark applicable products with "Patent Pending" referencing this allowance.\n\nWe will prepare the Issue Fee Transmittal (PTO/SB/56) for filing and follow up with the invoice.\n\nWith congratulations,\nIP Team`,
      };
    case "ISSUE.NTF":
      return {
        subject: `Patent issuing — ${app.appNumber}`,
        body: `Dear ${client} IP Team,\n\nWe have received the Issue Notification for U.S. Application No. ${app.appNumber}. The patent number has been assigned and maintenance fees (3.5, 7.5, 11.5 years) have been pre-docketed.\n\nIf you intend to file any continuations or divisionals, the window closes at issue. Please confirm if any further filings are desired.\n\nBest regards,\nIP Team`,
      };
    case "CTRS":
      return {
        subject: `Restriction Requirement in ${app.appNumber}`,
        body: `Dear ${client} IP Team,\n\nThe Examiner has issued a Restriction Requirement in U.S. Application No. ${app.appNumber}. We must elect one group of claims for examination; the remaining groups may be pursued in divisional applications later.\n\nWe will send our recommended election shortly for your approval.\n\nBest regards,\nIP Team`,
      };
    case "NTC.PUB":
      return {
        subject: `Application ${app.appNumber} published`,
        body: `Dear ${client} IP Team,\n\nU.S. Application No. ${app.appNumber} has been published and is now public. Provisional rights under 35 USC 154(d) may attach to anyone with notice of the publication. No action is required at this time.\n\nBest regards,\nIP Team`,
      };
    case "APP.FILE.REC":
      return {
        subject: `Filing confirmed — ${app.appNumber}`,
        body: `Dear ${client} IP Team,\n\nWe have received the Filing Receipt for U.S. Application No. ${app.appNumber} ("${app.title}"). Filing date and priority claims have been confirmed.\n\nA first Office Action is typically issued 12–18 months from filing. We will monitor and keep you updated.\n\nBest regards,\nIP Team`,
      };
    default:
      return {
        subject: `Update on ${app.appNumber}`,
        body: `Dear ${client} IP Team,\n\nThis is an update regarding U.S. Application No. ${app.appNumber}.\n\nBest regards,\nIP Team`,
      };
  }
}

export function statusBanner(code: string, app: AppData): { msg: string; sub: string; chip: string; chipUrgent?: boolean } {
  switch (code) {
    case "RCEX":
      return { msg: "RCE filed — awaiting next Non-Final Office Action", sub: "Prosecution reset · Next OA expected within 14 months", chip: "OA due by Jul 2027" };
    case "CTNF":
      return { msg: "Non-Final Rejection — response required", sub: "Claims 1–18 rejected §103", chip: "Response due Sep 18", chipUrgent: true };
    case "CTFR":
      return { msg: "Final Rejection — strategy required", sub: "After Final / RCE / Appeal options open", chip: "Statutory bar in 6mo", chipUrgent: true };
    case "CTAV":
      return { msg: "Advisory Action — election required", sub: "After Final response not entered", chip: "Election in 5 days", chipUrgent: true };
    case "CTRS":
      return { msg: "Restriction Requirement — election required", sub: "Multiple claim groups identified", chip: "Election due in 60 days" };
    case "ABN":
      return { msg: "Application Abandoned — revival possible", sub: "Petition to Revive may be filed", chip: "Petition window open", chipUrgent: true };
    case "NOA":
      return { msg: "Notice of Allowance — issue fee required", sub: "All claims allowed · No extensions", chip: "Issue fee due Apr 15", chipUrgent: true };
    case "ISSUE.NTF":
      return { msg: "Patent issuing — maintenance pre-docketed", sub: "Continuation window closing at issue", chip: "Issue imminent" };
    case "NTC.PUB":
      return { msg: "Application published — public record", sub: "Provisional rights under 35 USC 154(d)", chip: "No action needed" };
    case "APP.FILE.REC":
      return { msg: "Filing confirmed — awaiting first Office Action", sub: "Typical wait 12–18 months", chip: "Monitoring" };
    default:
      return { msg: app.title, sub: "Awaiting next docketable event", chip: "—" };
  }
}