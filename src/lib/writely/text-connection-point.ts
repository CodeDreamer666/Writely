import type { EditorView } from "@tiptap/pm/view";
import type { XY } from "./annotation-model";
import type {
    ConnectorTarget,
    Side,
} from "./types";
import { wordLineFromRects } from "./word-connections";
import { TEXT_ANCHOR_GAP } from "../../config/cards";

type Edges = Pick<DOMRect, "left" | "right" | "top" | "bottom">;

// Resolve saved logical ranges against live DOM fragments, including wrapped text.
export function textConnectionPoint(
    view: EditorView,
    workspace: HTMLElement,
    target: ConnectorTarget | null | undefined,
    _side: Side,
): XY | null {
    if (!target || target.orphaned) return null;
    try {
        let rect: Edges | undefined;
        if (target.kind === "essay") {
            const r = view.dom.getBoundingClientRect();
            rect = {
                left: r.left,
                right: r.right,
                top: r.top,
                bottom: r.top + Math.min(32, r.height),
            };
        } else {
            const { from, to } = target;
            if (
                !Number.isInteger(from) ||
                !Number.isInteger(to) ||
                from! < 0 ||
                to! > view.state.doc.content.size ||
                to! <= from!
            )
                return null;
            const start = view.domAtPos(from!, 1),
                end = view.domAtPos(to!, -1),
                range = view.dom.ownerDocument.createRange();
            range.setStart(start.node, start.offset);
            range.setEnd(end.node, end.offset);
            const rects = Array.from(range.getClientRects()).filter(
                (r) => r.width > 0 && r.height > 0,
            );
            const fragments = rects.filter(
                (r) =>
                    !rects.some(
                        (other) =>
                            other !== r &&
                            r.height > other.height + 1 &&
                            other.top >= r.top &&
                            other.bottom <= r.bottom &&
                            other.left >= r.left &&
                            other.right <= r.right,
                    ),
            );
            const line = wordLineFromRects(fragments, workspace);
            return line
                ? { x: line.point.x, y: line.y + TEXT_ANCHOR_GAP }
                : null;
        }
        const bounds = workspace.getBoundingClientRect(),
            sx = bounds.width / workspace.offsetWidth || 1,
            sy = bounds.height / workspace.offsetHeight || 1;
        return {
            x:
                ((rect.left + rect.right) / 2 - bounds.left) / sx +
                workspace.scrollLeft,
            y:
                (rect.bottom - bounds.top) / sy +
                workspace.scrollTop +
                TEXT_ANCHOR_GAP,
        };
    } catch {
        return null;
    }
}
