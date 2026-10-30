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
};
type ShotData = { width: number; height: number; marks: Mark[] };

export type ShotId = keyof typeof shots;

/**
 * What: The numbered disc that ties a ring on a screenshot to its line in the key below it.
 *
 * Used in:
 * - src/app/help/shot.tsx (Shot, on the image and in the key)
 *
 * Effect: Changes the size and colour of every number on the help screenshots.
 */
const BADGE =
    "bg-callout text-on-callout flex size-[18px] shrink-0 items-center justify-center rounded-full text-[11px] leading-none font-semibold tabular-nums shadow-[0_1px_3px_color-mix(in_srgb,var(--shadow)_25%,transparent)]";

/** The narrowest a screenshot is shown, in pixels: badges must stay apart even at this size. */
const NARROWEST = 280;

/**
 * Where each mark's number sits: the first corner of its ring that keeps clear of the numbers
 * already placed, so two rings side by side never stack their numbers.
 */
function badgeCorners({ width, height, marks }: ShotData) {
    const shown = Math.min(width, NARROWEST);
    const gapX = 20 / shown,
        gapY = 20 / ((shown * height) / width);
    const placed: { x: number; y: number }[] = [];
    return marks.map(({ x, y, w, h }) => {
        const corners = [
            { x, y },
            { x: x + w, y },
            { x, y: y + h },
            { x: x + w, y: y + h },
        ];
        const corner =
            corners.find((c) =>
                placed.every(
                    (p) =>
                        Math.abs(p.x - c.x) >= gapX ||
                        Math.abs(p.y - c.y) >= gapY,
                ),
            ) ?? corners[0]!;
        placed.push(corner);
        return corner;
    });
}

/**
 * One screenshot with orange rings around the controls a step talks about. Each ring carries a
 * number, and the key under the image names it, so no label is ever cut off or covers the
 * picture, however narrow the screen. Phone screenshots show narrower, as they would on a phone.
 */
export function Shot({ id, alt }: { id: ShotId; alt: string }) {
    const shot: ShotData = shots[id];
    const phone = shot.width < 500;
    const badges = badgeCorners(shot);
    const image = {
        width: Math.round(shot.width * 1.5),
        height: Math.round(shot.height * 1.5),
        sizes: phone ? "320px" : "(max-width: 800px) 100vw, 720px",
    };
    return (
        <>
            <div
                className={`help-shot border-line bg-surface relative overflow-hidden rounded-xl border ${phone ? "w-full max-w-[320px]" : "w-full"}`}
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
                    />
                ))}
                {/* On a corner of the ring, but never past the image's edge. */}
                {shot.marks.map((mark, i) => (
                    <span
                        key={mark.label}
                        aria-hidden="true"
                        className={`${BADGE} pointer-events-none absolute -translate-x-1/2 -translate-y-1/2`}
                        style={{
                            left: `clamp(10px, ${badges[i]!.x * 100}%, calc(100% - 10px))`,
                            top: `clamp(10px, ${badges[i]!.y * 100}%, calc(100% - 10px))`,
                        }}
                    >
                        {i + 1}
                    </span>
                ))}
            </div>
            {!!shot.marks.length && (
                <ol
                    aria-label="Marked on the picture"
                    className="m-0 mt-2.5 flex list-none flex-wrap gap-x-4 gap-y-1.5 p-0"
                >
                    {shot.marks.map((mark, i) => (
                        <li
                            key={mark.label}
                            className="text-ink flex items-center gap-1.5 text-[13px] leading-snug"
                        >
                            <span aria-hidden="true" className={BADGE}>
                                {i + 1}
                            </span>
                            {mark.label}
                        </li>
                    ))}
                </ol>
            )}
        </>
    );
}
