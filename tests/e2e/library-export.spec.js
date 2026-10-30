import {
    test,
    expect,
    openSample,
} from "./fixtures.js";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";

test("exports the selected document from its library menu", async ({
    page,
}) => {
    await openSample(page);
    await page.goto("/");
    const trigger = page.getByRole("button", {
        name: /Document actions: The things we carry/i,
    });
    for (const [label, extension] of [
        ["Word (.docx)", "docx"],
        ["PDF (.pdf)", "pdf"],
    ]) {
        await trigger.click();
        await page
            .getByRole("menuitem", { name: "Export", exact: true })
            .click();
        const downloadPromise = page.waitForEvent("download");
        await page.getByRole("menuitem", { name: label, exact: true }).click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(
            new RegExp(`\\.${extension}$`),
        );
        const bytes = await readFile(await download.path());
        if (extension === "docx") {
            const zip = await JSZip.loadAsync(bytes);
            const text = await zip.file("word/document.xml").async("string");
            expect(text).toContain("The bus was almost empty");
        } else {
            expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
        }
    }
});
