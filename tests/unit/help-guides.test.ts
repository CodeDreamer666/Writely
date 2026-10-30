import {
    existsSync,
    readdirSync,
    readFileSync,
} from "node:fs";
import {
    describe,
    expect,
    it,
} from "vitest";
import {
    GUIDES,
    guideBySlug,
    stepCount,
} from "../../src/app/help/guides";
import shots from "../../src/app/help/shots.json";

const used = GUIDES.flatMap((guide) =>
    guide.sections.flatMap((section) =>
        section.steps.flatMap((step) => (step.shot ? [step.shot] : [])),
    ),
);

describe("help guides", () => {
    it("have unique slugs and section titles", () => {
        const slugs = GUIDES.map((guide) => guide.slug);
        expect(new Set(slugs).size).toBe(slugs.length);
        for (const guide of GUIDES) {
            const titles = guide.sections.map((section) => section.title);
            expect(new Set(titles).size).toBe(titles.length);
        }
    });

    it("count steps from their sections", () => {
        const guide = guideBySlug("focus-mode")!;
        expect(stepCount(guide)).toBe(
            guide.sections.reduce((n, s) => n + s.steps.length, 0),
        );
    });

    it("show only screenshots that were captured, in both themes, with alt text", () => {
        for (const guide of GUIDES)
            for (const section of guide.sections)
                for (const step of section.steps)
                    if (step.shot) expect(step.alt).toBeTruthy();
        for (const id of used) {
            expect(Object.keys(shots)).toContain(id);
            for (const theme of ["light", "dark"])
                expect(existsSync(`public/help/${id}-${theme}.jpg`)).toBe(true);
        }
    });

    it("leave no unused screenshots behind", () => {
        const files = readdirSync("public/help").map((file) =>
            file.replace(/-(light|dark)\.jpg$/, ""),
        );
        expect([...new Set(files)].sort()).toEqual([...new Set(used)].sort());
        expect(Object.keys(shots).sort()).toEqual([...new Set(used)].sort());
    });

    it("link only to guides that exist, including old links that redirect", () => {
        const sources = [
            readFileSync("src/app/help/guides.tsx", "utf8"),
            readFileSync("next.config.js", "utf8"),
        ].join("\n");
        const targets = [...sources.matchAll(/"\/help\/([a-z-]+)/g)]
            .map((match) => match[1]!)
            .filter(
                (slug) => !["linking", "export", "settings"].includes(slug),
            );
        for (const slug of targets) expect(guideBySlug(slug)).toBeDefined();
        // Redirects land on a section heading's anchor.
        for (const [, slug, hash] of sources.matchAll(
            /"\/help\/([a-z-]+)#([a-z-]+)"/g,
        ))
            expect(
                guideBySlug(slug!)!.sections.map((section) =>
                    section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                ),
            ).toContain(hash);
    });
});
