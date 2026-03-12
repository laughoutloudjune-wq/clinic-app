"use client";

import { useMemo, useState } from "react";

type ReportActionsProps = {
  scanId: string;
};

export default function ReportActions({ scanId }: ReportActionsProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const reportPdfViewUrl = useMemo(() => `/report/${scanId}?pdf=1`, [scanId]);
  const reportPdfPrintUrl = useMemo(() => `/report/${scanId}?pdf=1&autoprint=1`, [scanId]);
  const pdfApiUrl = useMemo(() => `/api/generate-pdf?scanId=${scanId}`, [scanId]);

  async function handleDownloadPdf() {
    try {
      setIsDownloading(true);
      const response = await fetch(pdfApiUrl);
      if (!response.ok) {
        throw new Error("Failed to generate PDF.");
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `body-composition-${scanId}.pdf`;
      anchor.click();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      alert(message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={reportPdfViewUrl}
        target="_blank"
        rel="noreferrer"
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Print Preview
      </a>
      <button
        type="button"
        onClick={() => window.open(reportPdfPrintUrl, "_blank", "noopener,noreferrer")}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Print
      </button>
      <button
        type="button"
        onClick={handleDownloadPdf}
        disabled={isDownloading}
        className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isDownloading ? "Generating..." : "Download PDF"}
      </button>
    </div>
  );
}
