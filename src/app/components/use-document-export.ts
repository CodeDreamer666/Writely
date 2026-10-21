"use client";
import { useState } from "react";
import type { ExportFormat } from "~/lib/writely/export";
import type { ExportOptions } from "~/lib/writely/preferences";
import { api } from "~/trpc/react";

/**
 * Exports one of the user's documents as Word or PDF. It always reads a fresh, saved copy from the
 * server (never a cached one), so `beforeExport` can first save pending edits; if that fails the
 * export stops rather than produce an outdated file.
 */
export function useDocumentExport() {
    const utils = api.useUtils();
    const [exporting, setExporting] = useState<ExportFormat | null>(null);
    const [error, setError] = useState("");
    const run = async (
        id: string,
        format: ExportFormat,
        options: ExportOptions,
        beforeExport?: () => Promise<boolean>,
    ) => {
        if (exporting) return false;
        setExporting(format);
        setError("");
        try {
            if (beforeExport && !(await beforeExport())) {
                setError(
                    "Your latest changes aren’t saved yet, so the export would be out of date. Check your connection and try again.",
                );
                return false;
            }
            const source = await utils.client.documents.exportSource.query({
                id,
            });
            const { downloadDocument } = await import("~/lib/writely/export");
            await downloadDocument(source, format, options);
            return true;
        } catch {
            setError(
                `Couldn’t export this document as ${format === "docx" ? "Word" : "PDF"}. Please try again.`,
            );
            return false;
        } finally {
            setExporting(null);
        }
    };
    return { exporting, error, setError, run };
}
