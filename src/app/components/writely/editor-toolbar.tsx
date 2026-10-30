"use client";
import * as Tooltip from "@radix-ui/react-tooltip";
import type { Editor } from "@tiptap/core";
import type {
    SelectionBookmark,
    Transaction,
} from "@tiptap/pm/state";
import { useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
    Bold,
    Check,
    ChevronDown,
    Italic,
    Link2,
    List,
    ListOrdered,
    Quote,
    Minus,
    MoreHorizontal,
    Strikethrough,
    Code,
    SquareCode,
    LayoutGrid,
    ListTodo,
    ExternalLink,
    Type,
    Unlink,
    X,
    type LucideIcon,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    useSyncExternalStore,
    type ButtonHTMLAttributes,
    type KeyboardEvent,
    type ReactNode,
    type Ref,
    type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { TOOLTIP_CLASS } from "~/config/ui";
import {
    LongPressTooltips,
    useLongPress,
} from "./long-press-tooltip";

/** Touch devices up to tablet size get a toolbar docked above the keyboard. */
const MOBILE_TOOLBAR = "(max-width: 1023.98px) and (pointer: coarse)";
const subscribeMobile = (notify: () => void) => {
    const media = window.matchMedia(MOBILE_TOOLBAR);
    media.addEventListener("change", notify);
    return () => media.removeEventListener("change", notify);
};
const mobileSnapshot = () => window.matchMedia(MOBILE_TOOLBAR).matches;
/** True on touch devices up to tablet size, where one toolbar sits above the keyboard. */
export function useMobileToolbar() {
    return useSyncExternalStore(subscribeMobile, mobileSnapshot, () => false);
}

/**
 * What: The look of the formatting buttons (bold, italic, lists and so on)
 * in the toolbar that appears over selected text.
 *
 * Used in:
 * - src/app/components/writely/editor-toolbar.tsx (FormatButton, the "More formatting" button)
 *
 * Effect: Changes the size and pressed colour of every formatting button.
 */
const FORMAT_BUTTON =
    "format-button toolbar-control [.editor-toolbar-shell_&]:inline-flex [.editor-toolbar-shell_&]:[height:32px] [.editor-toolbar-shell_&]:[min-height:32px] [.editor-toolbar-shell_&]:[width:32px] [.editor-toolbar-shell_&]:[min-width:32px] [.editor-toolbar-shell_&]:items-center [.editor-toolbar-shell_&]:justify-center [.editor-toolbar-shell_&]:[border-radius:5px] [.editor-toolbar-shell_&]:[padding:0] [.editor-toolbar-shell_&]:[color:var(--muted)] [.editor-toolbar-shell_&]:[box-shadow:none] [.editor-toolbar-shell_&]:[background:transparent] [.editor-toolbar-shell_&]:[border:0] [.editor-toolbar-shell_&[aria-expanded='true']]:[color:var(--accent)] [.editor-toolbar-shell_&[aria-expanded='true']]:[background:var(--tint)] [.editor-toolbar-shell_&[aria-pressed='true']]:[color:var(--accent)] [.editor-toolbar-shell_&[aria-pressed='true']]:[background:var(--tint)] max-md:[.editor-toolbar-shell_&]:[min-height:36px] max-md:[.editor-toolbar-shell_&]:[width:34px] max-md:[.editor-toolbar-shell_&]:[min-width:34px]";
/**
 * What: The look of the toolbar's drop-down menus (paragraph style and
 * "More formatting").
 *
 * Used in:
 * - src/app/components/writely/editor-toolbar.tsx (EditorToolbar)
 *
 * Effect: Changes the size, shadow and opening animation of both menus.
 */
const MENU =
    "format-popover absolute [top:calc(100%_+_6px)] [z-index:30] grid [min-width:200px] [gap:1px] [border-radius:10px] border border-line bg-surface [padding:4px] text-ink [box-shadow:0_14px_36px_-14px_color-mix(in_srgb,var(--shadow)_30%,transparent)] [font:12.5px/1.5_Inter,_sans-serif] [animation:appear_120ms_ease-out] motion-reduce:animate-none";
/**
 * What: The look of each choice inside a toolbar menu.
 *
 * Used in:
 * - src/app/components/writely/editor-toolbar.tsx (EditorToolbar)
 *
 * Effect: Changes the height, spacing and hover colour of menu choices.
 */
const MENU_ITEM =
    "flex! w-full! min-h-8! items-center! justify-start! gap-2.5! rounded-md! border-0! bg-transparent! px-2.5! py-1.5! text-left! text-ink! shadow-none! hover:bg-[var(--control-hover)]! focus-visible:bg-[var(--control-hover)]! focus-visible:outline-none! aria-checked:text-accent! disabled:opacity-40! [&_svg]:shrink-0";
/**
 * What: The thin line between groups in the "More formatting" menu.
 *
 * Used in:
 * - src/app/components/writely/editor-toolbar.tsx (EditorToolbar)
 *
 * Effect: Changes the thickness, colour and spacing of that line.
 */
const MENU_SEPARATOR = "mx-1.5 my-1 h-px bg-line";
/**
 * What: The paragraph styles in the toolbar's style menu: the heading level
 * (0 means normal text), the label and the size the label is shown at.
 *
 * Used in:
 * - src/app/components/writely/editor-toolbar.tsx (EditorToolbar)
 *
 * Effect: Changes the names and preview sizes in the style menu. Removing an
 * entry removes that choice from the menu.
 */
const PARAGRAPH_STYLES = [
    [0, "Normal text", "text-[13px]"],
    [1, "Heading 1", "text-[17px] font-semibold"],
    [2, "Heading 2", "text-[15px] font-semibold"],
    [3, "Heading 3", "text-[13.5px] font-semibold"],
] as const;

function FormatButton({
    icon: Icon,
    label,
    active,
    shortcut,
    onClick,
    disabled = false,
}: {
    icon: LucideIcon;
    label: string;
    active?: boolean;
    shortcut?: string;
    onClick: () => void;
    disabled?: boolean;
}) {
    const press = useLongPress(label);
    return (
        <Tooltip.Root open={press.enabled ? false : undefined}>
            <Tooltip.Trigger asChild>
                <button
                    type="button"
                    className={FORMAT_BUTTON}
                    aria-label={label}
                    aria-pressed={active}
                    disabled={disabled}
                    onMouseDown={(event) => event.preventDefault()}
                    {...press.props}
                    onClick={press.click(onClick)}
                >
                    <Icon size={16} strokeWidth={1.6} aria-hidden="true" />
                </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Content className={TOOLTIP_CLASS} sideOffset={8}>
                    {label}
                    {shortcut && (
                        <span
                            className={
                                "format-shortcut [margin-left:10px] [opacity:0.65]"
                            }
                        >
                            {shortcut}
                        </span>
                    )}
                    <Tooltip.Arrow />
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip.Root>
    );
}

/** A plain toolbar button that also shows its name when held on a touch screen. */
function PressButton({
    label,
    buttonRef,
    onClick,
    ...props
}: {
    label: string;
    buttonRef?: Ref<HTMLButtonElement>;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
    const press = useLongPress(label);
    return (
        <button
            ref={buttonRef}
            type="button"
            {...props}
            {...press.props}
            onClick={onClick && press.click(onClick)}
        />
    );
}

/** Only browser-safe link protocols may be saved or opened by the link panel. */
function linkURL(value: string) {
    const raw = value.trim();
    if (!raw) return null;
    const candidate = /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`;
    try {
        const url = new URL(candidate);
        return ["https:", "http:", "mailto:", "tel:"].includes(url.protocol)
            ? url.href
            : null;
    } catch {
        return null;
    }
}

export default function EditorToolbar({
    editor,
    onConnect,
    connecting,
    label = "Text formatting",
    containerRef,
    onBlurOutside,
    tools,
    focusMode = false,
}: {
    editor: Editor;
    onConnect?: () => void;
    connecting?: boolean;
    label?: string;
    containerRef?: RefObject<HTMLDivElement | null>;
    onBlurOutside?: () => void;
    /** Mobile: the document tools shown in the toolbar's second mode. */
    tools?: ReactNode;
    /** Mobile: focus mode keeps the toolbar hidden until text is selected. */
    focusMode?: boolean;
}) {
    const state = useEditorState({
        editor,
        selector: ({ editor }) => ({
            heading:
                [1, 2, 3].find((level) =>
                    editor.isActive("heading", { level }),
                ) ?? 0,
            bold: editor.isActive("bold"),
            italic: editor.isActive("italic"),
            link: editor.isActive("link"),
            bullet: editor.isActive("bulletList"),
            ordered: editor.isActive("orderedList"),
            quote: editor.isActive("blockquote"),
            strike: editor.isActive("strike"),
            code: editor.isActive("code"),
            codeBlock: editor.isActive("codeBlock"),
            task: editor.isActive("taskList"),
            canConnect:
                !editor.state.selection.empty &&
                !!editor.state.doc
                    .textBetween(
                        editor.state.selection.from,
                        editor.state.selection.to,
                        " ",
                    )
                    .trim(),
            selecting: !editor.state.selection.empty,
            canMark: editor.can().toggleBold(),
            canLink: editor.can().setLink({ href: "https://example.com" }),
        }),
    });
    const [menu, setMenu] = useState<"paragraph" | "more" | null>(null);
    const [linkOpen, setLinkOpen] = useState(false);
    const [url, setURL] = useState("");
    const [error, setError] = useState("");
    const root = useRef<HTMLDivElement>(null);
    const paragraphTrigger = useRef<HTMLButtonElement>(null);
    const moreTrigger = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const linkInput = useRef<HTMLInputElement>(null);
    const dock = useRef<HTMLDivElement>(null);
    const mobile = useMobileToolbar();
    const [docked, setDocked] = useState(false);
    // Document tools are the resting mode; typing (focusing the editor) brings formatting back.
    const withTools = mobile && !!tools && !focusMode;
    const [mode, setMode] = useState<"format" | "tools">("tools");
    const showTools = withTools && mode === "tools";
    const bookmark = useRef<SelectionBookmark | null>(null);
    // With tools the bar is always there; without, it follows focus. Focus mode only shows
    // formatting while words are selected or a formatting request (link, style menu) is open.
    const visible =
        mobile &&
        !connecting &&
        editor.isEditable &&
        (focusMode
            ? docked && (state.selecting || linkOpen || !!menu)
            : withTools || docked);
    // Mobile: show while the editor or the toolbar holds focus.
    useEffect(() => {
        if (!mobile || editor.isDestroyed) return;
        let frame = 0;
        const update = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                const inside =
                    editor.view.hasFocus() ||
                    !!root.current?.contains(document.activeElement);
                setDocked(inside);
                if (!inside) setMode("tools");
            });
        };
        const resume = () => {
            setMode("format");
            update();
        };
        update();
        editor.on("focus", resume);
        editor.on("blur", update);
        document.addEventListener("focusin", update);
        document.addEventListener("focusout", update);
        return () => {
            cancelAnimationFrame(frame);
            editor.off("focus", resume);
            editor.off("blur", update);
            document.removeEventListener("focusin", update);
            document.removeEventListener("focusout", update);
            setDocked(false);
        };
    }, [editor, mobile]);
    // Mobile: sit just above the keyboard (visual viewport) and keep the caret visible.
    useLayoutEffect(() => {
        if (!visible) return;
        const viewport = window.visualViewport;
        let frame = 0;
        const reveal = () => {
            if (editor.isDestroyed || !editor.view.hasFocus()) return;
            const node = dock.current;
            const bottom = viewport
                ? viewport.offsetTop + viewport.height
                : window.innerHeight;
            const limit = bottom - (node?.offsetHeight ?? 48) - 12;
            let rect;
            try {
                rect = editor.view.coordsAtPos(editor.state.selection.head);
            } catch {
                return;
            }
            if (rect.bottom > limit)
                editor.view.dom
                    .closest<HTMLElement>(".workspace")
                    ?.scrollBy({ top: rect.bottom - limit });
        };
        const sync = () => {
            const node = dock.current;
            if (!node) return;
            // Ignore pinch-zoom: its viewport changes are not the keyboard.
            if (viewport && viewport.scale > 1.01) return;
            const offset = viewport
                ? Math.max(
                      0,
                      Math.round(
                          window.innerHeight -
                              viewport.offsetTop -
                              viewport.height,
                      ),
                  )
                : 0;
            node.style.setProperty("--kb", `${offset}px`);
            // The home-indicator inset only matters when no keyboard covers it.
            node.style.setProperty(
                "--kb-pad",
                offset > 0 ? "0px" : "env(safe-area-inset-bottom, 0px)",
            );
            const root = document.documentElement.style;
            root.setProperty("--tb-bottom", `${offset + node.offsetHeight}px`);
            root.setProperty(
                "--tb-room",
                `${(viewport?.height ?? window.innerHeight) - node.offsetHeight - 24}px`,
            );
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(reveal);
        };
        sync();
        viewport?.addEventListener("resize", sync);
        viewport?.addEventListener("scroll", sync);
        window.addEventListener("resize", sync);
        window.addEventListener("orientationchange", sync);
        editor.on("selectionUpdate", sync);
        return () => {
            cancelAnimationFrame(frame);
            viewport?.removeEventListener("resize", sync);
            viewport?.removeEventListener("scroll", sync);
            window.removeEventListener("resize", sync);
            window.removeEventListener("orientationchange", sync);
            editor.off("selectionUpdate", sync);
            document.documentElement.style.removeProperty("--tb-bottom");
            document.documentElement.style.removeProperty("--tb-room");
        };
    }, [editor, visible]);
    const popover = mobile
        ? MENU.replace(
              "absolute [top:calc(100%_+_6px)]",
              "fixed [bottom:calc(var(--tb-bottom,52px)_+_6px)] [max-height:var(--tb-room,60vh)] overflow-y-auto",
          )
        : MENU;
    const openLink = useCallback(() => {
        if (editor.state.selection.empty && editor.isActive("link"))
            editor.commands.extendMarkRange("link");
        bookmark.current = editor.state.selection.getBookmark();
        const href: unknown = editor.getAttributes("link").href;
        setURL(typeof href === "string" ? href : "");
        setError("");
        setMenu(null);
        setLinkOpen(true);
    }, [editor]);
    const restoreSelection = () => {
        const saved = bookmark.current;
        bookmark.current = null;
        if (saved)
            editor.commands.command(({ tr }) => {
                tr.setSelection(saved.resolve(tr.doc));
                return true;
            });
        editor.commands.focus(undefined, { scrollIntoView: false });
    };
    const closeLink = () => {
        setLinkOpen(false);
        restoreSelection();
    };
    useEffect(() => {
        if (editor.isDestroyed) return;
        const shortcut = (event: globalThis.KeyboardEvent) => {
            if (
                (event.metaKey || event.ctrlKey) &&
                !event.altKey &&
                event.key.toLowerCase() === "k"
            ) {
                event.preventDefault();
                event.stopPropagation();
                openLink();
            }
        };
        const mapSelection = ({
            transaction,
        }: {
            transaction: Transaction;
        }) => {
            if (bookmark.current)
                bookmark.current = bookmark.current.map(transaction.mapping);
        };
        const dom = editor.view.dom;
        dom.addEventListener("keydown", shortcut, true);
        editor.on("transaction", mapSelection);
        return () => {
            dom.removeEventListener("keydown", shortcut, true);
            editor.off("transaction", mapSelection);
        };
    }, [editor, openLink]);
    useEffect(() => {
        if (linkOpen && !editor.isDestroyed) {
            editor.commands.setMeta("writelyFormatting", "show");
            linkInput.current?.focus();
            linkInput.current?.select();
        }
    }, [editor, linkOpen]);
    useEffect(() => {
        if (!menu && !linkOpen) return;
        const dismiss = (event: PointerEvent) => {
            if (!root.current?.contains(event.target as Node)) {
                setMenu(null);
                setLinkOpen(false);
                bookmark.current = null;
            }
        };
        document.addEventListener("pointerdown", dismiss);
        return () => document.removeEventListener("pointerdown", dismiss);
    }, [menu, linkOpen]);

    // Fading edges hint that the row scrolls when more controls sit off-screen.
    const [fade, setFade] = useState({ start: false, end: false });
    useLayoutEffect(() => {
        const el = root.current;
        if (!mobile || !visible || !el) return;
        const measure = () => {
            const start = el.scrollLeft > 2;
            const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
            setFade((prev) =>
                prev.start === start && prev.end === end
                    ? prev
                    : { start, end },
            );
        };
        measure();
        el.addEventListener("scroll", measure, { passive: true });
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        if (el.firstElementChild) observer.observe(el.firstElementChild);
        return () => {
            el.removeEventListener("scroll", measure);
            observer.disconnect();
        };
    }, [mobile, visible, showTools]);
    const switchMode = () => {
        if (linkOpen) closeLink();
        setMenu(null);
        setMode(showTools ? "format" : "tools");
    };

    const menuItems = () =>
        Array.from(
            menuRef.current?.querySelectorAll<HTMLButtonElement>(
                "[role^='menuitem']:not(:disabled)",
            ) ?? [],
        );
    const focusMenu = (name: "paragraph" | "more", last = false) =>
        requestAnimationFrame(() => {
            const items = menuItems();
            const current = items.find((item) => item.ariaChecked === "true");
            (name === "paragraph" && current
                ? current
                : items[last ? items.length - 1 : 0]
            )?.focus();
        });
    const closeMenu = () => {
        const trigger =
            menu === "paragraph"
                ? paragraphTrigger.current
                : moreTrigger.current;
        setMenu(null);
        trigger?.focus();
    };
    const toggleMenu = (name: "paragraph" | "more") => {
        setLinkOpen(false);
        bookmark.current = null;
        setMenu(menu === name ? null : name);
        if (menu !== name) focusMenu(name);
    };
    const triggerKeys = (
        name: "paragraph" | "more",
        event: KeyboardEvent<HTMLButtonElement>,
    ) => {
        if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
        event.preventDefault();
        setLinkOpen(false);
        setMenu(name);
        focusMenu(name, event.key === "ArrowUp");
    };
    const menuKeys = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            closeMenu();
            return;
        }
        if (event.key === "Tab") {
            setMenu(null);
            return;
        }
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
            return;
        event.preventDefault();
        const items = menuItems();
        const index = items.indexOf(
            document.activeElement as HTMLButtonElement,
        );
        const next =
            event.key === "Home"
                ? 0
                : event.key === "End"
                  ? items.length - 1
                  : (index +
                        (event.key === "ArrowDown" ? 1 : -1) +
                        items.length) %
                    items.length;
        items[next]?.focus();
    };
    const toolbarKeys = (event: KeyboardEvent<HTMLDivElement>) => {
        if (
            !(event.target instanceof HTMLButtonElement) ||
            !event.target.classList.contains("toolbar-control")
        )
            return;
        if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key))
            return;
        event.preventDefault();
        const controls = Array.from(
            root.current?.querySelectorAll<HTMLElement>(
                ".toolbar-control:not(:disabled)",
            ) ?? [],
        );
        const index = controls.indexOf(event.target);
        controls[
            event.key === "Home"
                ? 0
                : event.key === "End"
                  ? controls.length - 1
                  : (index +
                        (event.key === "ArrowRight" ? 1 : -1) +
                        controls.length) %
                    controls.length
        ]?.focus();
    };
    if (editor.isDestroyed) return null;
    const body = (
        <div
            className={
                mobile
                    ? "editor-toolbar-shell relative [z-index:13] flex h-12 w-full [touch-action:pan-x] [scrollbar-width:none] flex-nowrap items-center justify-start [gap:4px_8px] [overflow-x:auto] [overscroll-behavior-x:contain] [padding:0_0_0_6px] [color:var(--muted)] select-none [-webkit-touch-callout:none] [&::-webkit-scrollbar]:hidden"
                    : "editor-toolbar-shell relative [z-index:13] flex [max-width:calc(100vw_-_18px)] [flex:0_0_auto] flex-wrap items-center justify-center [gap:4px_8px] [padding:4px_6px] [color:var(--muted)] max-md:[z-index:12]"
            }
            ref={(node) => {
                root.current = node;
                if (containerRef) containerRef.current = node;
            }}
            onKeyDown={toolbarKeys}
            onPointerDown={(event) => event.stopPropagation()}
            onBlur={(event) => {
                if (
                    !root.current?.contains(event.relatedTarget) &&
                    !editor.view.dom.contains(event.relatedTarget)
                )
                    onBlurOutside?.();
            }}
        >
            {showTools ? (
                <div
                    className="flex w-max items-center gap-0.5 [padding-right:6px]"
                    role="toolbar"
                    aria-label="Writing tools"
                >
                    {tools}
                </div>
            ) : (
                <div
                    className={`editor-formatting-toolbar flex items-center [gap:4px] max-md:[gap:4px_2px] ${mobile ? "[width:max-content] flex-nowrap [padding-right:6px] [&>*]:shrink-0" : "[max-width:100%] flex-wrap justify-center"}`}
                    role="toolbar"
                    aria-label={label}
                >
                    <div className="format-menu relative">
                        <PressButton
                            label="Text style"
                            buttonRef={paragraphTrigger}
                            className="paragraph-select toolbar-control text-muted! hover:text-ink! aria-expanded:bg-tint! aria-expanded:text-accent! inline-flex! h-8! min-h-8! w-[124px]! items-center! justify-between! gap-1.5! rounded-[5px]! border-0! bg-transparent! px-2! text-[12px]! shadow-none! hover:bg-[var(--control-hover)]! max-md:w-[112px]!"
                            aria-label="Text style"
                            aria-haspopup="menu"
                            aria-expanded={menu === "paragraph"}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => toggleMenu("paragraph")}
                            onKeyDown={(event) =>
                                triggerKeys("paragraph", event)
                            }
                        >
                            <span className="truncate">
                                {PARAGRAPH_STYLES[state.heading]?.[1]}
                            </span>
                            <ChevronDown
                                size={14}
                                strokeWidth={1.8}
                                aria-hidden="true"
                                className="shrink-0 transition-transform duration-150 [[aria-expanded='true']>&]:rotate-180"
                            />
                        </PressButton>
                        {menu === "paragraph" && (
                            <div
                                ref={menuRef}
                                className={`${popover} ${mobile ? "left-2" : "left-0"}`}
                                role="menu"
                                aria-label="Text style"
                                onKeyDown={menuKeys}
                            >
                                {PARAGRAPH_STYLES.map(([level, name, size]) => (
                                    <button
                                        type="button"
                                        key={level}
                                        role="menuitemradio"
                                        aria-checked={state.heading === level}
                                        className={MENU_ITEM}
                                        onMouseDown={(event) =>
                                            event.preventDefault()
                                        }
                                        onClick={() => {
                                            setMenu(null);
                                            const chain = editor
                                                .chain()
                                                .focus(undefined, {
                                                    scrollIntoView: false,
                                                });
                                            if (level)
                                                chain
                                                    .setHeading({ level })
                                                    .run();
                                            else chain.setParagraph().run();
                                        }}
                                    >
                                        <span className={`flex-1 ${size}`}>
                                            {name}
                                        </span>
                                        {state.heading === level && (
                                            <Check
                                                size={14}
                                                strokeWidth={2}
                                                aria-hidden="true"
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <span
                        className={
                            "format-separator [margin:0_2px] [height:16px] [width:1px] [background:var(--border)] max-md:[margin:0]"
                        }
                        role="separator"
                        aria-orientation="vertical"
                    />
                    <div className={"format-group flex items-center [gap:2px]"}>
                        <FormatButton
                            icon={Bold}
                            label="Bold"
                            shortcut="Ctrl+B"
                            active={state.bold}
                            disabled={!state.canMark}
                            onClick={() =>
                                editor.chain().focus().toggleBold().run()
                            }
                        />
                        <FormatButton
                            icon={Italic}
                            label="Italic"
                            shortcut="Ctrl+I"
                            active={state.italic}
                            disabled={!state.canMark}
                            onClick={() =>
                                editor.chain().focus().toggleItalic().run()
                            }
                        />
                        <FormatButton
                            icon={Link2}
                            label="Insert/Edit Link"
                            shortcut="Ctrl+K"
                            active={state.link}
                            disabled={!state.canLink}
                            onClick={openLink}
                        />
                    </div>
                    <span
                        className={
                            "format-separator [margin:0_2px] [height:16px] [width:1px] [background:var(--border)] max-md:[margin:0]"
                        }
                        role="separator"
                        aria-orientation="vertical"
                    />
                    <div className={"format-group flex items-center [gap:2px]"}>
                        <FormatButton
                            icon={List}
                            label="Bullet List"
                            active={state.bullet}
                            onClick={() =>
                                editor.chain().focus().toggleBulletList().run()
                            }
                        />
                        <FormatButton
                            icon={ListOrdered}
                            label="Numbered List"
                            active={state.ordered}
                            onClick={() =>
                                editor.chain().focus().toggleOrderedList().run()
                            }
                        />
                        <FormatButton
                            icon={Quote}
                            label="Blockquote"
                            active={state.quote}
                            onClick={() =>
                                editor.chain().focus().toggleBlockquote().run()
                            }
                        />
                    </div>
                    {mobile ? (
                        <>
                            <span
                                className="format-separator [margin:0_2px] [height:16px] [width:1px] [background:var(--border)] max-md:[margin:0]"
                                role="separator"
                                aria-orientation="vertical"
                            />
                            <div className="format-group flex items-center [gap:2px]">
                                {onConnect && (
                                    <FormatButton
                                        icon={Link2}
                                        label="Connect to thought"
                                        disabled={
                                            !state.canConnect || connecting
                                        }
                                        onClick={onConnect}
                                    />
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <span
                                className={
                                    "format-separator [margin:0_2px] [height:16px] [width:1px] [background:var(--border)] max-md:[margin:0]"
                                }
                                role="separator"
                                aria-orientation="vertical"
                            />
                            <div className={"format-menu relative"}>
                                <Tooltip.Root>
                                    <Tooltip.Trigger asChild>
                                        <button
                                            type="button"
                                            ref={moreTrigger}
                                            className={FORMAT_BUTTON}
                                            aria-label="More formatting"
                                            aria-haspopup="menu"
                                            aria-expanded={menu === "more"}
                                            onMouseDown={(event) =>
                                                event.preventDefault()
                                            }
                                            onClick={() => toggleMenu("more")}
                                            onKeyDown={(event) =>
                                                triggerKeys("more", event)
                                            }
                                        >
                                            <MoreHorizontal
                                                size={16}
                                                strokeWidth={1.6}
                                                aria-hidden="true"
                                            />
                                        </button>
                                    </Tooltip.Trigger>
                                    <Tooltip.Portal>
                                        <Tooltip.Content
                                            className={TOOLTIP_CLASS}
                                            sideOffset={8}
                                        >
                                            More formatting
                                            <Tooltip.Arrow />
                                        </Tooltip.Content>
                                    </Tooltip.Portal>
                                </Tooltip.Root>
                                {menu === "more" && (
                                    <div
                                        ref={menuRef}
                                        className={`${popover} format-more-menu ${mobile ? "right-2" : "right-0"} w-[216px]`}
                                        role="menu"
                                        aria-label="More formatting"
                                        onKeyDown={menuKeys}
                                    >
                                        {/* Formats toggle in place and the menu stays open, so several can be stacked. */}
                                        {(
                                            [
                                                [
                                                    Strikethrough,
                                                    "Strikethrough",
                                                    state.strike,
                                                    () =>
                                                        editor
                                                            .chain()
                                                            .toggleStrike()
                                                            .run(),
                                                ],
                                                [
                                                    Code,
                                                    "Inline Code",
                                                    state.code,
                                                    () =>
                                                        editor
                                                            .chain()
                                                            .toggleCode()
                                                            .run(),
                                                ],
                                                [
                                                    SquareCode,
                                                    "Code Block",
                                                    state.codeBlock,
                                                    () =>
                                                        editor
                                                            .chain()
                                                            .toggleCodeBlock()
                                                            .run(),
                                                ],
                                                [
                                                    ListTodo,
                                                    "Checklist",
                                                    state.task,
                                                    () =>
                                                        editor
                                                            .chain()
                                                            .toggleTaskList()
                                                            .run(),
                                                ],
                                            ] as [
                                                LucideIcon,
                                                string,
                                                boolean,
                                                () => void,
                                            ][]
                                        ).map(
                                            ([Icon, name, active, action]) => (
                                                <button
                                                    type="button"
                                                    key={name}
                                                    role="menuitemcheckbox"
                                                    aria-checked={active}
                                                    className={MENU_ITEM}
                                                    onMouseDown={(event) =>
                                                        event.preventDefault()
                                                    }
                                                    onClick={action}
                                                >
                                                    <Icon
                                                        size={16}
                                                        strokeWidth={1.6}
                                                        aria-hidden="true"
                                                    />
                                                    <span className="flex-1">
                                                        {name}
                                                    </span>
                                                    {active && (
                                                        <Check
                                                            size={14}
                                                            strokeWidth={2}
                                                            aria-hidden="true"
                                                        />
                                                    )}
                                                </button>
                                            ),
                                        )}
                                        <div
                                            className={MENU_SEPARATOR}
                                            role="separator"
                                        />
                                        <button
                                            type="button"
                                            role="menuitem"
                                            className={MENU_ITEM}
                                            onMouseDown={(event) =>
                                                event.preventDefault()
                                            }
                                            onClick={() => {
                                                setMenu(null);
                                                editor
                                                    .chain()
                                                    .focus()
                                                    .setHorizontalRule()
                                                    .run();
                                            }}
                                        >
                                            <Minus
                                                size={16}
                                                strokeWidth={1.6}
                                                aria-hidden="true"
                                            />
                                            Horizontal Divider
                                        </button>
                                        {onConnect && (
                                            <button
                                                type="button"
                                                role="menuitem"
                                                className={`${MENU_ITEM} toolbar-connect`}
                                                disabled={
                                                    !state.canConnect ||
                                                    connecting
                                                }
                                                onMouseDown={(event) =>
                                                    event.preventDefault()
                                                }
                                                onClick={() => {
                                                    setMenu(null);
                                                    onConnect();
                                                }}
                                            >
                                                <Link2
                                                    size={16}
                                                    strokeWidth={1.6}
                                                    aria-hidden="true"
                                                />
                                                Connect to thought
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
            {linkOpen && !showTools && (
                <form
                    className={
                        (mobile
                            ? "format-popover link-editor fixed [right:8px] [bottom:calc(var(--tb-bottom,52px)_+_6px)] [left:8px] [z-index:30] [border-radius:8px]"
                            : "format-popover link-editor absolute [top:calc(100%_+_6px)] [right:0] [z-index:30] [border-radius:8px]") +
                        " [border-radius:8px] [border-width:1px] [border-style:solid] [border-top-color:var(--border)] [border-right-color:var(--border)] [border-bottom-color:var(--border)] [border-left-color:var(--border)] [padding:6px] [color:var(--text)] [background:var(--surface)] [border-image:none] [font:12px/1.5_Inter,_sans-serif] [&_input]:[width:100%] [&_input]:[min-width:0] [&_input]:[font:inherit] [&_label]:[margin-bottom:4px] [&_label]:block [&_label]:[color:var(--muted)] [&_p[role='alert']]:[margin-top:6px] [&_p[role='alert']]:[color:var(--danger)] [&.link-editor]:[right:max(12px,_calc((100%_-_680px)_/_2))] [&.link-editor]:[width:min(340px,_calc(100%_-_24px))] [&.link-editor]:[padding:14px]"
                    }
                    role="dialog"
                    aria-label="Edit link"
                    onSubmit={(event) => {
                        event.preventDefault();
                        const href = linkURL(url);
                        if (!href) {
                            setError(
                                "Enter a valid web address, email link, or phone link.",
                            );
                            return;
                        }
                        restoreSelection();
                        if (
                            editor.state.selection.empty &&
                            !editor.isActive("link")
                        )
                            editor.commands.insertContent({
                                type: "text",
                                text: href,
                                marks: [{ type: "link", attrs: { href } }],
                            });
                        else editor.chain().setLink({ href }).run();
                        setLinkOpen(false);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") {
                            event.preventDefault();
                            event.stopPropagation();
                            closeLink();
                        }
                    }}
                >
                    <div
                        className={
                            "link-editor-heading [margin-bottom:8px] flex items-center justify-between [gap:8px] [font-weight:500] [&_button]:[min-height:28px] [&_button]:[min-width:28px] [&_button]:[padding:4px] [&_button]:[background:transparent] [&_button]:[border:0]"
                        }
                    >
                        <span>Link</span>
                        <button
                            type="button"
                            aria-label="Close link editor"
                            onClick={closeLink}
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <label htmlFor="manuscript-link-url">URL</label>
                    <input
                        id="manuscript-link-url"
                        ref={linkInput}
                        value={url}
                        placeholder="https://example.com"
                        onChange={(event) => {
                            setURL(event.target.value);
                            setError("");
                        }}
                        aria-invalid={!!error}
                        aria-describedby={error ? "link-error" : undefined}
                    />
                    {error && (
                        <p id="link-error" role="alert">
                            {error}
                        </p>
                    )}
                    <div
                        className={
                            "link-editor-actions [margin-top:12px] flex flex-wrap items-center [gap:8px] [&_a]:inline-flex [&_a]:items-center [&_a]:[gap:5px] [&_a]:[padding:5px_6px] [&_a]:[color:var(--muted)] [&_a]:[background:transparent] [&_a]:[border:0] [&_a]:[font:inherit] [&_a]:[text-decoration:none] [&_button]:inline-flex [&_button]:items-center [&_button]:[gap:5px] [&_button]:[padding:5px_6px] [&_button]:[color:var(--muted)] [&_button]:[background:transparent] [&_button]:[border:0] [&_button]:[font:inherit] [&_button]:[text-decoration:none]"
                        }
                    >
                        {state.link && (
                            <button
                                type="button"
                                onClick={() => {
                                    restoreSelection();
                                    editor.commands.unsetLink();
                                    setLinkOpen(false);
                                }}
                            >
                                <Unlink size={14} />
                                Remove link
                            </button>
                        )}
                        {linkURL(url) && (
                            <a
                                href={linkURL(url)!}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <ExternalLink size={14} />
                                Open link
                            </a>
                        )}
                        <button
                            type="submit"
                            className={
                                "link-apply [.link-editor-actions_&]:[margin-left:auto] [.link-editor-actions_&]:[color:var(--accent)] [.link-editor-actions_&]:[background:var(--tint)]"
                            }
                        >
                            Apply
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
    if (mobile) {
        // One bar docked above the keyboard: a fixed mode switch, then a scrolling row of controls.
        if (!visible) return null;
        const fadeEdge =
            "pointer-events-none absolute inset-y-0 w-6 from-[var(--surface)] to-transparent";
        const switchLabel = showTools
            ? "Show formatting"
            : "Show document tools";
        return createPortal(
            <LongPressTooltips>
                <div
                    ref={dock}
                    className="mobile-formatting-toolbar border-line bg-surface fixed inset-x-0 [bottom:var(--kb,0px)] z-[19] flex items-stretch border-t"
                    style={{
                        paddingBottom:
                            "var(--kb-pad, env(safe-area-inset-bottom, 0px))",
                        paddingLeft: "env(safe-area-inset-left, 0px)",
                        paddingRight: "env(safe-area-inset-right, 0px)",
                    }}
                >
                    {withTools && (
                        <PressButton
                            label={switchLabel}
                            aria-label={switchLabel}
                            className="mode-switch border-line! text-muted! hover:text-ink! inline-flex! h-12! min-h-12! w-11! shrink-0 items-center! justify-center! rounded-none! border-0! border-r! bg-transparent! p-0! shadow-none!"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={switchMode}
                        >
                            {showTools ? (
                                <Type
                                    size={17}
                                    strokeWidth={1.6}
                                    aria-hidden="true"
                                />
                            ) : (
                                <LayoutGrid
                                    size={17}
                                    strokeWidth={1.6}
                                    aria-hidden="true"
                                />
                            )}
                        </PressButton>
                    )}
                    <div className="relative min-w-0 flex-1">
                        {body}
                        {fade.start && (
                            <span
                                aria-hidden="true"
                                className={`${fadeEdge} left-0 bg-linear-to-r`}
                            />
                        )}
                        {fade.end && (
                            <span
                                aria-hidden="true"
                                className={`${fadeEdge} right-0 bg-linear-to-l`}
                            />
                        )}
                    </div>
                </div>
            </LongPressTooltips>,
            document.body,
        );
    }
    return (
        <BubbleMenu
            editor={editor}
            pluginKey="writelyFormatting"
            updateDelay={100}
            appendTo={() => document.body}
            options={{
                placement: "top",
                strategy: "fixed",
                offset: 8,
                flip: { padding: 8 },
                shift: { padding: 8 },
                scrollTarget:
                    editor.view.dom.closest<HTMLElement>(".workspace") ??
                    undefined,
            }}
            shouldShow={({ from, to }) =>
                !connecting &&
                editor.isEditable &&
                (linkOpen ||
                    !!menu ||
                    (from !== to &&
                        !!editor.state.doc.textBetween(from, to, " ").trim() &&
                        (editor.isFocused ||
                            !!root.current?.contains(document.activeElement))))
            }
            className={
                "floating-formatting-toolbar [z-index:24] [width:max-content] [max-width:calc(100vw_-_16px)] [border-radius:8px] [border-width:1px] [border-style:solid] [border-top-color:var(--border)] [border-right-color:var(--border)] [border-bottom-color:var(--border)] [border-left-color:var(--border)] [background:var(--surface)] [border-image:none]"
            }
        >
            {body}
        </BubbleMenu>
    );
}
