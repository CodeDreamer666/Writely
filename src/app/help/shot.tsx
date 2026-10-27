import Image from "next/image";
import shots from "./shots.json";

/**
 * The screenshots the guides show, captured from the running app by `npm run help:screenshots`
 * (tests/help/capture.spec.js). Each has a light and a dark image in public/help, and the
 * controls it points at as boxes measured in fractions of the image.
 */
type Mark = {
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    side: "above" | "below" | "left" | "right";
};
type ShotData = { width: number; height: number; marks: Mark[] };

export type ShotId = keyof typeof shots;

/** Where a mark's label sits around its ring, kept inside the image. */
function labelPlace({ x, w, side }: Mark) {
    const right = x + w / 2 > 0.55;
    switch (side) {
        case "above":
            return `bottom-[calc(100%+5px)] ${right ? "right-0" : "left-0"}`;
        case "below":
            return `top-[calc(100%+5px)] ${right ? "right-0" : "left-0"}`;
        case "left":
            return "top-1/2 right-[calc(100%+6px)] -translate-y-1/2";
        case "right":
            return "top-1/2 left-[calc(100%+6px)] -translate-y-1/2";
    }
}

/**
 * One screenshot with orange rings around the controls a step talks about, each labelled.
 * Phone screenshots show narrower, as they would on a phone.
 */
export function Shot({ id, alt }: { id: ShotId; alt: string }) {
    const shot = shots[id] as ShotData;
    const phone = shot.width < 500;
    const image = {
        width: Math.round(shot.width * 1.5),
        height: Math.round(shot.height * 1.5),
        sizes: phone ? "320px" : "(max-width: 800px) 100vw, 720px",
    };
    return (
        <div
            className={`help-shot border-line bg-surface [container-type:inline-size] relative overflow-hidden rounded-xl border ${phone ? "w-full max-w-[320px]" : "w-full"}`}
            style={{ aspectRatio: `${shot.width} / ${shot.height}` }}
        >
            <Image
                {...image}
                src={`/help/${id}-light.jpg`}
                alt={alt}
                className="help-shot-light h-auto w-full"
            />
            <Image
                {...image}
                src={`/help/${id}-dark.jpg`}
                alt={alt}
                className="help-shot-dark h-auto w-full"
            />
            {shot.marks.map((mark) => (
                <span
                    key={mark.label}
                    aria-hidden="true"
                    className="border-callout pointer-events-none absolute rounded-md border-2 shadow-[0_0_0_3px_color-mix(in_srgb,var(--callout)_22%,transparent)]"
                    style={{
                        left: `${mark.x * 100}%`,
                        top: `${mark.y * 100}%`,
                        width: `${mark.w * 100}%`,
                        height: `${mark.h * 100}%`,
                    }}
                >
                    <span
                        className={`bg-callout text-on-callout absolute rounded-full px-2 py-0.5 text-[clamp(9.5px,1.7cqw,12.5px)] leading-[1.35] font-semibold whitespace-nowrap shadow-[0_1px_3px_color-mix(in_srgb,var(--shadow)_25%,transparent)] ${labelPlace(mark)}`}
                    >
                        {mark.label}
                    </span>
                </span>
            ))}
            {!!shot.marks.length && (
                <ul className="sr-only">
                    {shot.marks.map((mark) => (
                        <li key={mark.label}>Marked: {mark.label}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}
