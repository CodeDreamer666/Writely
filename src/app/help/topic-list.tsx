import { ChevronRight } from "lucide-react";
import Link from "next/link";
import {
    GUIDES,
    stepCount,
} from "./guides";

/** Every help topic as a row that opens its guide: the Help home's list, also shown in Settings. */
export function TopicList() {
    return (
        <ul className="border-line bg-surface m-0 list-none overflow-hidden rounded-2xl border p-0">
            {GUIDES.map((guide) => {
                const { slug, title, icon: Icon, summary } = guide;
                const steps = stepCount(guide);
                return (
                    <li
                        key={slug}
                        className="border-line border-b last:border-b-0"
                    >
                        <Link
                            href={`/help/${slug}`}
                            className="text-ink flex items-center gap-4 px-5 py-4 no-underline transition-colors hover:bg-[var(--control-hover)] focus-visible:[box-shadow:inset_0_0_0_2px_var(--control-focus)] focus-visible:outline-none max-sm:gap-3 max-sm:px-4"
                        >
                            <span className="bg-tint text-accent flex size-10 shrink-0 items-center justify-center rounded-xl">
                                <Icon
                                    size={19}
                                    strokeWidth={1.6}
                                    aria-hidden="true"
                                />
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="text-[15px] font-semibold">
                                    {title}
                                </span>
                                <span className="text-muted text-[13px] leading-snug">
                                    {summary}
                                </span>
                            </span>
                            <span className="text-muted shrink-0 text-[12px] tabular-nums max-sm:hidden">
                                {steps} {steps === 1 ? "step" : "steps"}
                            </span>
                            <ChevronRight
                                size={17}
                                strokeWidth={1.6}
                                aria-hidden="true"
                                className="text-muted shrink-0"
                            />
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}
