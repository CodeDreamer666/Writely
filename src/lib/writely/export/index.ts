import type { ExportOptions } from "../preferences";
import {
    exportFileName,
    parseDocument,
} from "./blocks";

export type ExportFormat = "docx" | "pdf";

/**
 * What: The file formats a document can be exported to, with the name,
 * file extension and description shown in Settings → Export.
 *
 * Used in:
 * - src/app/components/writely/export-settings.tsx (ExportSettings)
 *
 * Effect: Changes the names and descriptions shown. A new format also needs a
 * renderer in downloadDocument and an icon in FORMAT_ICONS.
 */
export const EXPORT_FORMATS = {
    docx: {
        label: "Microsoft Word",
        extension: ".docx",
        description:
            "Export an editable document for Microsoft Word and Google Docs.",
    },
    pdf: {
        label: "PDF",
        extension: ".pdf",
        description:
            "Export a document with consistent formatting for reading, printing, or sharing.",
    },
} as const;

/**
 * Builds the file in the browser from a saved copy of the document and downloads it. The
 * renderers load on first use, so the editor doesn't carry them. Nothing is written back.
 */
export async function downloadDocument(
    source: { title: string; html: string },
    format: ExportFormat,
    options: ExportOptions,
) {
    const blocks = parseDocument(source.html);
    const title = source.title.trim() || "Untitled document";
    const blob =
        format === "docx"
            ? await (await import("./docx")).toDocx(title, blocks, options)
            : await (await import("./pdf")).toPdf(title, blocks, options);
    const typed = new Blob([blob], {
        type:
            format === "docx"
                ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                : "application/pdf",
    });
    const url = URL.createObjectURL(typed);
    const link = document.createElement("a");
    link.href = url;
    link.download = exportFileName(title, format);
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
