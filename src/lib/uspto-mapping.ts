import type { AppData, Transaction, UsptoDocument } from "@/components/demo/data";
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
  docsData?: any,
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

  const documents: UsptoDocument[] = (() => {
    const bag: any[] =
      docsData?.documentBag ||
      docsData?.patentFileWrapperDataBag?.[0]?.documentBag ||
      [];
    return bag
      .map((d: any) => {
        const opts: any[] = d.downloadOptionBag || [];
        const pdf =
          opts.find((o) => (o.mimeTypeIdentifier ?? "").toLowerCase().includes("pdf")) ||
          opts[0];
        return {
          documentIdentifier: d.documentIdentifier ?? d.documentIdentifierText ?? "",
          documentCode: d.documentCode ?? "",
          description: d.documentCodeDescriptionText ?? d.description ?? d.documentCode ?? "—",
          officialDate: (d.officialDate || d.mailDate || "").slice(0, 10),
          direction: d.directionCategory ?? d.directionText ?? "",
          pageCount: Number(d.pageTotalQuantity ?? d.pageCount ?? 0) || 0,
          downloadUrl: pdf?.downloadUrl,
          mimeType: pdf?.mimeTypeIdentifier,
        };
      })
      .filter((d) => d.documentCode || d.description)
      .sort((a, b) => (a.officialDate < b.officialDate ? 1 : -1));
  })();

  const extraMeta: AppData["meta"] = {
    status: meta.applicationStatusDescriptionText || meta.applicationStatus || "—",
    statusDate: (meta.applicationStatusDate || "").slice(0, 10) || undefined,
    confirmationNumber: meta.applicationConfirmationNumber,
    entityStatus: meta.entityStatusData?.smallEntityStatusIndicator
      ? "Small entity"
      : meta.entityStatusData?.businessEntityStatusCategory || undefined,
    applicationType: meta.applicationTypeCategory || meta.applicationTypeLabelName,
    patentNumber: meta.patentNumber,
    grantDate: (meta.grantDate || "").slice(0, 10) || undefined,
    publicationNumber: meta.earliestPublicationNumber,
    publicationDate: (meta.earliestPublicationDate || "").slice(0, 10) || undefined,
    class: meta.class,
    subclass: meta.subclass,
    groupArtUnit: meta.groupArtUnitNumber,
    invention: meta.inventionTitle,
    customer: meta.customerNumber,
  };

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
    documents,
    meta: extraMeta,
  };
}