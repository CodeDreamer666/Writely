export function getWritingStatistics(html: string) {
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const blocks = [...parsed.body.querySelectorAll("p,h1,h2,h3,h4,h5,h6,pre")]
        .map((node) => (node.textContent ?? "").replace(/ /g, " ").trim())
        .filter(Boolean);
    const text = blocks.join("\n\n");
    const words = text.split(/\s+/).filter(Boolean).length;
    const segmenter =
        typeof Intl.Segmenter === "function"
            ? new Intl.Segmenter(undefined, { granularity: "sentence" })
            : null;
    const sentences = blocks.reduce(
        (total, block) =>
            total +
            (segmenter
                ? [...segmenter.segment(block)].filter((part) =>
                      /[\p{L}\p{N}]/u.test(part.segment),
                  ).length
                : block
                      .split(/[.!?]+/)
                      .filter((part) => /[\p{L}\p{N}]/u.test(part)).length),
        0,
    );
    const paragraphs = [...parsed.body.querySelectorAll("p")].filter((node) =>
        node.textContent?.trim(),
    ).length;
    return {
        words,
        characters: Array.from(text).length,
        sentences,
        paragraphs,
        readingTime: Math.ceil(words / 200),
        averageSentenceLength: sentences
            ? Math.round((words / sentences) * 10) / 10
            : 0,
    };
}
