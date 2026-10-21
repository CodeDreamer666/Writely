"use client";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";

/** Keep the timeline card on one line; preview only text that actually overflows. */
export default function DraftTitle({ title }: { title: string }) {
    const element = useRef<HTMLElement>(null);
    const [truncated, setTruncated] = useState(false);
    const [open, setOpen] = useState(false);
    const [touch, setTouch] = useState(false);
    useLayoutEffect(() => {
        const node = element.current!;
        const measure = () =>
            setTruncated(node.scrollWidth > node.clientWidth + 1);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        document.fonts.addEventListener("loadingdone", measure);
        return () => {
            observer.disconnect();
            document.fonts.removeEventListener("loadingdone", measure);
        };
    }, [title]);
    useEffect(() => {
        if (!open) return;
        const dismiss = (event: Event) => {
            if (!element.current?.contains(event.target as Node))
                setOpen(false);
        };
        document.addEventListener("pointerdown", dismiss);
        document.addEventListener("scroll", dismiss, true);
        return () => {
            document.removeEventListener("pointerdown", dismiss);
            document.removeEventListener("scroll", dismiss, true);
        };
    }, [open]);
    return (
        <Tooltip.Root
            open={open && truncated}
            onOpenChange={setOpen}
            delayDuration={350}
        >
            <Tooltip.Trigger asChild>
                <strong
                    ref={element}
                    className={"draft-title [&[role='button']]:cursor-pointer"}
                    tabIndex={truncated ? 0 : undefined}
                    role={truncated ? "button" : undefined}
                    aria-label={title}
                    aria-expanded={truncated && touch ? open : undefined}
                    aria-haspopup={truncated && touch ? "dialog" : undefined}
                    onPointerDown={(event) => {
                        if (event.pointerType === "touch") setTouch(true);
                    }}
                    onPointerEnter={(event) => {
                        if (event.pointerType === "mouse") setTouch(false);
                    }}
                    onPointerLeave={(event) => {
                        if (
                            event.pointerType === "mouse" &&
                            document.activeElement !== element.current
                        )
                            setOpen(false);
                    }}
                    onBlur={() => setOpen(false)}
                    onClick={(event) => {
                        event.preventDefault();
                        if (truncated) setOpen(true);
                    }}
                    onKeyDown={(event) => {
                        if (!truncated) return;
                        if (["Enter", " "].includes(event.key)) {
                            event.preventDefault();
                            setTouch(true);
                            setOpen((value) => !value);
                        }
                        if (event.key === "Escape") {
                            event.preventDefault();
                            event.stopPropagation();
                            setOpen(false);
                        }
                    }}
                >
                    {title}
                </strong>
            </Tooltip.Trigger>
            {truncated && (
                <Tooltip.Portal>
                    <Tooltip.Content
                        className={
                            "draft-title-preview [z-index:60] [max-height:var(--radix-tooltip-content-available-height)] [max-width:min(340px,_calc(100vw_-_24px))] overflow-y-auto [border-radius:7px] [border-width:1px] [border-style:solid] [border-top-color:var(--border)] [border-right-color:var(--border)] [border-bottom-color:var(--border)] [border-left-color:var(--border)] [padding:10px_12px] [overflow-wrap:anywhere] whitespace-normal [color:var(--text)] [background:var(--surface)] [border-image:none] [font:13px/1.55_Inter,_sans-serif]"
                        }
                        side="bottom"
                        align="start"
                        sideOffset={7}
                        collisionPadding={12}
                    >
                        <div
                            role={touch ? "dialog" : undefined}
                            aria-label={touch ? "Full draft title" : undefined}
                        >
                            {title}
                        </div>
                    </Tooltip.Content>
                </Tooltip.Portal>
            )}
        </Tooltip.Root>
    );
}
