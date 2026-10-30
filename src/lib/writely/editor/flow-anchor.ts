import type { Editor } from "@tiptap/core";
import type { EditorView } from "@tiptap/pm/view";
import {
    useEffect,
    type RefObject,
} from "react";

/** "gentle" follows the line once it nears the bottom; "centred" is typewriter scrolling. */
type FlowMode = "gentle" | "centred";

type ScrollHandler = (view: EditorView) => boolean;

// Client coordinates and scroll distances use the actual manuscript viewport. Gentle only scrolls
// down once the caret passes the band; centred moves either way to hold the caret mid-window.
export function flowAdjustment(
    caretY: number,
    top: number,
    height: number,
    scrollTop: number,
    maxScroll: number,
    mode: FlowMode = "gentle",
) {
    if (height <= 0) return 0;
    if (mode === "centred") {
        const delta = caretY - (top + height * 0.5);
        if (Math.abs(delta) < height * 0.04) return 0;
        return Math.max(-scrollTop, Math.min(maxScroll - scrollTop, delta));
    }
    if (caretY <= top + height * 0.58) return 0;
    return Math.max(
        0,
        Math.min(maxScroll - scrollTop, caretY - (top + height * 0.47)),
    );
}

/** Keeps continuous writing inside a comfortable focus band, while respecting deliberate navigation. */
function installFlowAnchor(
    editor: Editor,
    workspace: HTMLElement,
    mode: FlowMode = "gentle",
) {
    const dom = editor.view.dom,
        media = matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout> | undefined,
        frame = 0,
        active = false,
        suspended = false,
        streak = 0,
        lastInput = 0,
        lastIntent = 0,
        expectedScroll: number | null = null,
        composing = false,
        disposed = false;
    const stop = () => {
        clearTimeout(timer);
        cancelAnimationFrame(frame);
        timer = undefined;
        frame = 0;
    };
    const suspend = () => {
        stop();
        active = false;
        suspended = true;
        streak = 0;
    };
    const valid = () =>
        !disposed &&
        !editor.isDestroyed &&
        editor.isFocused &&
        editor.state.selection.empty &&
        !composing;
    const bounds = () => {
        const rect = workspace.getBoundingClientRect(),
            vv = window.visualViewport;
        const top = Math.max(rect.top, vv?.offsetTop ?? 0);
        let bottom = Math.min(
            rect.bottom,
            (vv?.offsetTop ?? 0) + (vv?.height || innerHeight),
        );
        const tools = document
            .querySelector(".workspace-tools.tools-open")
            ?.getBoundingClientRect();
        if (
            tools &&
            tools.width > tools.height &&
            tools.top > top &&
            tools.top < bottom
        )
            bottom = tools.top - 12;
        return { top, height: Math.max(0, bottom - top) };
    };
    const settle = () => {
        timer = undefined;
        if (!active || !valid()) return;
        const { top, height } = bounds();
        const caret = editor.view.coordsAtPos(editor.state.selection.head);
        const delta = flowAdjustment(
            (caret.top + caret.bottom) / 2,
            top,
            height,
            workspace.scrollTop,
            workspace.scrollHeight - workspace.clientHeight,
            mode,
        );
        if (Math.abs(delta) < 2) return;
        stop();
        const from = workspace.scrollTop,
            target = from + delta;
        const write = (value: number) => {
            expectedScroll = value;
            workspace.scrollTop = value;
            expectedScroll = workspace.scrollTop;
        };
        if (media.matches) {
            write(target);
            return;
        }
        const start = performance.now();
        const tick = (now: number) => {
            if (!active || !valid()) return;
            const t = Math.min(1, (now - start) / 340);
            write(from + (target - from) * (1 - Math.pow(1 - t, 3)));
            if (t < 1) frame = requestAnimationFrame(tick);
            else frame = 0;
        };
        frame = requestAnimationFrame(tick);
    };
    const beforeInput = (e: InputEvent) => {
        if (e.inputType?.startsWith("insert")) {
            lastIntent = performance.now();
        }
    };
    const input = (e: Pick<InputEvent, "inputType" | "data">) => {
        if (!e.inputType?.startsWith("insert") || !valid()) return;
        const now = performance.now();
        streak = now - lastInput < 1500 ? streak + 1 : 1;
        lastInput = now;
        lastIntent = now;
        const paste =
            e.inputType === "insertFromPaste" ||
            e.inputType === "insertFromDrop";
        if (paste || streak >= (suspended ? 3 : 2)) {
            active = true;
            suspended = false;
        }
        clearTimeout(timer);
        if (active)
            timer = setTimeout(
                settle,
                paste
                    ? 300
                    : e.inputType === "insertParagraph" ||
                        /[.!?;,:\n]$/.test(e.data ?? "")
                      ? 220
                      : 300,
            );
    };
    const onInput = (e: Event) => input(e as InputEvent);
    const paste = () => {
        if (!valid()) return;
        active = true;
        suspended = false;
        streak = 0;
        lastIntent = performance.now();
        clearTimeout(timer);
        timer = setTimeout(settle, 300);
    };
    const key = (e: KeyboardEvent) => {
        if (
            [
                "ArrowUp",
                "ArrowDown",
                "ArrowLeft",
                "ArrowRight",
                "PageUp",
                "PageDown",
                "Home",
                "End",
                "Escape",
                "Tab",
            ].includes(e.key) ||
            ((e.ctrlKey || e.metaKey) &&
                ["f", "g", "k", "z", "a"].includes(e.key.toLowerCase()))
        )
            suspend();
    };
    const scroll = () => {
        if (
            expectedScroll !== null &&
            Math.abs(workspace.scrollTop - expectedScroll) < 2
        )
            return;
        if (performance.now() - lastIntent < 100 && !frame) return;
        suspend();
        expectedScroll = null;
    };
    const selection = () => {
        if (!editor.state.selection.empty) suspend();
    };
    const startComposition = () => {
        composing = true;
        stop();
    };
    const endComposition = () => {
        composing = false;
        input({ inputType: "insertText", data: "" });
    };
    const resize = () => {
        workspace.style.setProperty(
            "--flow-bottom-space",
            Math.round(bounds().height * 0.55) + "px",
        );
    };
    const observer = new ResizeObserver(resize);
    observer.observe(workspace);
    resize();
    const previous = editor.options.editorProps.handleScrollToSelection;
    const handleScroll: ScrollHandler = (view) =>
        (active && valid()) || previous?.(view) || false;
    editor.setOptions({
        editorProps: {
            ...editor.options.editorProps,
            handleScrollToSelection: handleScroll,
        },
    });
    dom.addEventListener("paste", paste, true);
    dom.addEventListener("drop", paste, true);
    dom.addEventListener("beforeinput", beforeInput);
    dom.addEventListener("input", onInput);
    dom.addEventListener("compositionstart", startComposition);
    dom.addEventListener("compositionend", endComposition);
    document.addEventListener("keydown", key, true);
    document.addEventListener("pointerdown", suspend, true);
    document.addEventListener("wheel", suspend, {
        passive: true,
        capture: true,
    });
    document.addEventListener("touchmove", suspend, {
        passive: true,
        capture: true,
    });
    dom.addEventListener("blur", suspend);
    workspace.addEventListener("scroll", scroll, { passive: true });
    editor.on("selectionUpdate", selection);
    window.visualViewport?.addEventListener("resize", resize);
    return () => {
        disposed = true;
        stop();
        observer.disconnect();
        workspace.style.removeProperty("--flow-bottom-space");
        dom.removeEventListener("paste", paste, true);
        dom.removeEventListener("drop", paste, true);
        dom.removeEventListener("beforeinput", beforeInput);
        dom.removeEventListener("input", onInput);
        dom.removeEventListener("compositionstart", startComposition);
        dom.removeEventListener("compositionend", endComposition);
        document.removeEventListener("keydown", key, true);
        document.removeEventListener("pointerdown", suspend, true);
        document.removeEventListener("wheel", suspend, true);
        document.removeEventListener("touchmove", suspend, true);
        dom.removeEventListener("blur", suspend);
        workspace.removeEventListener("scroll", scroll);
        editor.off("selectionUpdate", selection);
        window.visualViewport?.removeEventListener("resize", resize);
        if (!editor.isDestroyed)
            editor.setOptions({
                editorProps: {
                    ...editor.options.editorProps,
                    handleScrollToSelection: previous,
                },
            });
    };
}

export function useFlowAnchor(
    editor: Editor | null,
    workspace: RefObject<HTMLElement | null>,
    enabled: boolean,
    mode: FlowMode = "gentle",
) {
    useEffect(() => {
        if (!editor || !enabled) return;
        let cleanup: (() => void) | undefined;
        const stop = () => {
            cleanup?.();
            cleanup = undefined;
        };
        const mount = () => {
            stop();
            if (workspace.current && !editor.isDestroyed)
                cleanup = installFlowAnchor(editor, workspace.current, mode);
        };
        editor.on("mount", mount);
        editor.on("unmount", stop);
        mount();
        return () => {
            editor.off("mount", mount);
            editor.off("unmount", stop);
            stop();
        };
    }, [editor, workspace, enabled, mode]);
}
