import { Keyboard } from "lucide-react";
import { type Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "../components/app-header";
import { TopicList } from "./topic-list";

export const metadata: Metadata = { title: "Help · Writely" };

/** The Help home: every topic, each opening a short guide. */
export default function HelpHome() {
    return (
        <div className="bg-paper text-ink min-h-dvh">
            <AppHeader />
            <main className="mx-auto w-full max-w-[760px] px-6 pt-8 pb-24 max-sm:px-4 max-sm:pt-4">
                <h1 className="m-0 font-serif text-[44px] leading-[1.05] font-normal tracking-[-0.03em] max-sm:text-[36px]">
                    Help
                </h1>
                <p className="text-muted mt-3 mb-8 max-w-[560px] text-[15.5px] leading-relaxed">
                    Short guides to the parts of Writely that aren’t obvious at
                    first glance, on a computer and on a phone.
                </p>
                <h2 className="text-muted mb-3 text-[13px] font-medium">
                    Topics
                </h2>
                <TopicList />
                <h2 className="text-muted mt-10 mb-3 text-[13px] font-medium">
                    More ways to learn
                </h2>
                <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                    {(
                        [
                            [
                                "/settings#shortcuts",
                                Keyboard,
                                "Keyboard shortcuts",
                                "Every shortcut in one list, in Settings.",
                            ],
                        ] as const
                    ).map(([href, Icon, title, body]) => (
                        <Link
                            key={href}
                            href={href}
                            className="border-line bg-surface text-ink flex gap-3 rounded-2xl border px-5 py-4 no-underline transition-colors hover:border-[var(--control-focus)]"
                        >
                            <Icon
                                size={18}
                                strokeWidth={1.6}
                                aria-hidden="true"
                                className="text-accent mt-0.5 shrink-0"
                            />
                            <span className="flex flex-col gap-1">
                                <span className="text-[14px] font-medium">
                                    {title}
                                </span>
                                <span className="text-muted text-[13px] leading-snug">
                                    {body}
                                </span>
                            </span>
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    );
}
