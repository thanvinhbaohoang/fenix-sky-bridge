import type { AppData, Transaction } from "@/components/demo/data";
import {
  DOCKETABLE,
  TRANSACTION_DESCRIPTIONS,
  detectEvent,
} from "@/components/demo/data";

type Bag = {
  eventCode?: string;
  eventDescriptionText?: string;
  eventDate?: string;
  recordedDate?: string;
};

function mapTransactions(txData: any): Transaction[] {
  const bag: Bag[] =
    txData?.eventDataBag ||
    txData?.patentFileWrapperDataBag?.[0]?.eventDataBag ||
    txData?.transactionsBag ||
    [];

  return bag
    .map((t) => {
      const code = (t.eventCode ?? "").trim();
      const dateRaw = t.eventDate || t.recordedDate || "";
      const date = dateRaw ? dateRaw.slice(0, 10) : "";
      return {
        code,
        date,
        description:
          t.eventDescriptionText ||
          TRANSACTION_DESCRIPTIONS[code] ||
          code ||
          "—",
      };
    })
    .filter((t) => t.code && t.date)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function toAppData(
  apiData: any,
  txData: any,
  appNumber: string,
  templateHint?: string,
): AppData {
  const wrapper = apiData?.patentFileWrapperDataBag?.[0];
  const meta = wrapper?.applicationMetaData ?? {};

  const inventors: string =
    (Array.isArray(meta.inventorBag)
      ? meta.inventorBag
          .map((i: any) =>
            [i.firstName, i.middleName, i.lastName]
              .filter(Boolean)
              .join(" ")
              .trim(),
          )
          .filter(Boolean)
          .join(", ")
      : "") ||
    meta.firstInventorName ||
    "—";

  let transactions = mapTransactions(txData);

  // Template hint fallback: if no docketable event detected, synthesize one
  // dated today so the Workspace detection surfaces the correct template.
  if (templateHint && DOCKETABLE.includes(templateHint)) {
    const detected = detectEvent(transactions);
    if (!detected) {
      const today = new Date().toISOString().slice(0, 10);
      transactions = [
        {
          code: templateHint,
          date: today,
          description:
            TRANSACTION_DESCRIPTIONS[templateHint] ||
            `${templateHint} (template)`,
        },
        ...transactions,
      ];
    }
  }

  const displayAppNo =
    wrapper?.applicationNumberText || appNumber || "—";

  return {
    appNumber: displayAppNo,
    matter: meta.docketNumber || "—",
    title: meta.inventionTitle || "Untitled Application",
    assignee: meta.firstApplicantName || "—",
    inventors,
    artUnit: meta.groupArtUnitNumber || "—",
    examiner: meta.examinerNameText || "—",
    filingDate: (meta.filingDate || "").slice(0, 10),
    transactions,
    citations: [],
  };
}