"use client";
import type { Editor } from "@tiptap/core";
import {
    ChevronDown,
    Link2,
    Pencil,
    X,
} from "lucide-react";
import {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type CSSProperties,
    type KeyboardEvent as ReactKeyboardEvent,
    type PointerEvent as ReactPointerEvent,
    type RefObject,
} from "react";
import {
    cardArrowAnchor,
    cardArrowPoint,
    anchorPoint,
    selectionTarget,
    type Rect,
    type SelectionSnapshot,
    type XY,
} from "~/lib/writely/annotation-model";
import {
    cardContentWidth,
    layoutCard,
    type CardLayout,
} from "~/lib/writely/card-layout";
import {
    CARD_MAX_WIDTH,
    CARD_MIN_ROOM,
} from "~/config/cards";
import {
    FOLDED_THOUGHT_PATH,
    cardAccentVariant,
    cardMaxWidth,
    collapsedCardRect,
    constrainFreeCard,
    constrainSideCard,
    expandedPosition,
    placeSideCards,
    type Geometry,
} from "~/lib/writely/card-presentation";
import { setCardHighlights } from "~/lib/writely/editor/card-highlights";
import { textConnectionPoint } from "~/lib/writely/text-connection-point";
import {
    measureTextObstacles,
    clearCardPorts,
    routeConnector,
    roundedConnectorPath,
    type TextObstacle,
} from "~/lib/writely/connector-routing";
import type {
    Anchor,
    Card,
    ConnectorTarget,
    Point,
} from "~/lib/writely/types";
import InlineThoughtText from "./inline-thought-text";

type CardStyle = CSSProperties & Record<`--${string}`, string | number>;
type Gesture = {
    type: "card";
    cardId: string;
    collapsed: boolean;
    rect: Rect;
    startX: number;
    startY: number;
    moved: boolean;
};

// The outline is drawn at the card's real size, so its corners are never stretched.
export function CardShape({ layout }: { layout: CardLayout }) {
    return (
        <svg
            className={
                "cloud-shape pointer-events-none absolute [inset:0] [z-index:-1] [height:100%] [width:100%] overflow-visible [fill:var(--cloud-fill)] [opacity:var(--cloud-opacity)] [&_>_path]:[stroke:color-mix(in_srgb,_currentColor_14%,_transparent)] [&_>_path]:[stroke-width:0.75] [&_>_path]:[vector-effect:non-scaling-stroke]"
            }
            width={layout.width}
            height={layout.height}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            aria-hidden="true"
            focusable="false"
        >
            <path d={layout.path} />
        </svg>
    );
}
// Stored card colours are light pastels; the theme decides how strongly they show (see globals.css).
const cardFill = (bg: string) =>
    `color-mix(in srgb, ${bg} var(--card-strength), var(--card-base))`;
const cardText = (fg: string) => `var(--card-text-override, ${fg})`;

export default function Annotations({
    editor,
    workspace,
    cards,
    selected,
    onSelect,
    onPatch,
    onEdit,
    editingCard,
    onEditEnd,
    connectionSelection,
    onConnectionEnd,
    smartPunctuation,
}: {
    editor: Editor;
    workspace: RefObject<HTMLElement | null>;
    cards: Card[];
    selected: string | null;
    onSelect: (id: string | null) => void;
    onPatch: (id: string, patch: Partial<Card>) => void;
    onEdit: (id: string) => void;
    editingCard: string | null;
    onEditEnd: () => void;
    connectionSelection: SelectionSnapshot | null;
    onConnectionEnd: () => void;
    smartPunctuation: boolean;
}) {
    const [geometry, setGeometry] = useState<Geometry | null>(null),
        [textHeights, setTextHeights] = useState<Record<string, number>>({}),
        [, setRevision] = useState(0),
        [dragging, setDragging] = useState<(Rect & { cardId: string }) | null>(
            null,
        );
    const nodes = useRef(new Map<string, HTMLElement>()),
        gesture = useRef<Gesture | null>(null),
        frame = useRef(0),
        positionsRef = useRef<Record<string, Rect>>({}),
        geometryRef = useRef<Geometry | null>(null);
    const editPoint = useRef<{ x: number; y: number } | null>(null);
    const editSnapshot = useRef<{
        id: string;
        layout: CardLayout;
        rect: Rect;
    } | null>(null);
    const beginEdit = (
        id: string,
        point: { x: number; y: number } | null = null,
    ) => {
        editPoint.current = point;

        gesture.current = null;
        onEdit(id);
    };
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);
    useEffect(() => {
        setCardHighlights(editor, cards, selected, hoveredCard);
    }, [editor, cards, selected, hoveredCard]);
    useEffect(() => () => setCardHighlights(editor), [editor]);
    const lastDrag = useRef<{ id: string; time: number } | null>(null);
    const connectorColor = (card: Card) =>
        `color-mix(in srgb, ${card.bg} 78%, ${card.fg || "#1F1D1A"} 22%)`;
    const measureRef = useRef<() => void>(() => undefined);
    const textObstacles = useRef<TextObstacle[]>([]);
    const targetPoints = useRef(new Map<string, XY | null>());
    const measure = () => {
        const w = workspace.current,
            paper = w?.querySelector(".paper");
        if (!w || !paper || !editor || editor.isDestroyed) return;
        textObstacles.current = measureTextObstacles(editor.view.dom, w);
        targetPoints.current.clear();
        const wr = w.getBoundingClientRect(),
            pr = paper.getBoundingClientRect(),
            sx = wr.width / w.offsetWidth || 1,
            sy = wr.height / w.offsetHeight || 1;
        const next: Geometry = {
            width: w.clientWidth,
            paperLeft: (pr.left - wr.left) / sx + w.scrollLeft,
            paperRight: (pr.right - wr.left) / sx + w.scrollLeft,
            paperBottom: (pr.bottom - wr.top) / sy + w.scrollTop,
            viewportHeight: w.clientHeight,
            scrollTop: w.scrollTop,
        };
        setGeometry((old) =>
            JSON.stringify(old) === JSON.stringify(next) ? old : next,
        );
        // Text is measured at its laid-out column width; scrollHeight keeps the full height once a card scrolls.
        const measured: Record<string, number> = {};
        nodes.current.forEach((el, id) => {
            if (el.dataset.collapsed === "true" || id === editingCard) return;
            const text = el.querySelector(".cloud-text");
            if (text) measured[id] = text.scrollHeight;
        });
        setTextHeights((old) => {
            const next = { ...old, ...measured };
            return JSON.stringify(old) === JSON.stringify(next) ? old : next;
        });
        setRevision((n) => n + 1);
    };
    const collapsedKey = cards
        .map((card) => (card.collapsed ? card.id : ""))
        .join("|");
    measureRef.current = measure;
    // `measure` always reads the latest render; these values decide when to run it again.
    useLayoutEffect(() => {
        measure();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cards, selected, editingCard, !!geometry]);
    useEffect(() => {
        if (!editor || editor.isDestroyed || !workspace.current) return;
        const w = workspace.current,
            app = w.closest(".app")!;
        let alive = true;
        const schedule = () => {
            cancelAnimationFrame(frame.current);
            frame.current = requestAnimationFrame(() => {
                if (alive) measureRef.current();
            });
        };
        const animate = () => {
            const until = performance.now() + 240;
            const tick = () => {
                if (!alive) return;
                measureRef.current();
                if (performance.now() < until)
                    frame.current = requestAnimationFrame(tick);
            };
            cancelAnimationFrame(frame.current);
            frame.current = requestAnimationFrame(tick);
        };
        const paperTransition = (e: Event) => {
            if ((e.target as Element).matches(".paper")) {
                if (e.type === "transitionrun") animate();
                else schedule();
            }
        };
        w.addEventListener("transitionrun", paperTransition);
        w.addEventListener("transitionend", paperTransition);
        w.addEventListener("transitioncancel", paperTransition);
        const observe = new ResizeObserver(schedule);
        observe.observe(w);
        observe.observe(editor.view.dom);
        nodes.current.forEach((el) => {
            observe.observe(el);
            const text = el.querySelector(".cloud-text");
            if (text) observe.observe(text);
        });
        const mutations = new MutationObserver(animate);
        mutations.observe(app, {
            attributes: true,
            attributeFilter: ["class"],
        });
        const textMutations = new MutationObserver(schedule);
        textMutations.observe(editor.view.dom, {
            subtree: true,
            childList: true,
            characterData: true,
            attributes: true,
            attributeFilter: ["class", "style"],
        });
        const fonts = editor.view.dom.ownerDocument.fonts;
        fonts?.addEventListener("loadingdone", schedule);
        void fonts?.ready.then(() => {
            if (alive) schedule();
        });
        window.visualViewport?.addEventListener("resize", schedule);
        window.visualViewport?.addEventListener("scroll", schedule);
        const remember = () => schedule();
        const transaction = () => schedule();
        const escape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setDragging(null);
                gesture.current = null;
            }
        };
        editor.on("selectionUpdate", remember);
        editor.on("transaction", transaction);
        w.addEventListener("scroll", schedule, { passive: true });
        window.addEventListener("keydown", escape);
        window.addEventListener("resize", schedule);
        schedule();
        return () => {
            alive = false;
            cancelAnimationFrame(frame.current);
            observe.disconnect();
            mutations.disconnect();
            textMutations.disconnect();
            w.removeEventListener("transitionrun", paperTransition);
            w.removeEventListener("transitionend", paperTransition);
            w.removeEventListener("transitioncancel", paperTransition);
            fonts?.removeEventListener("loadingdone", schedule);
            window.visualViewport?.removeEventListener("resize", schedule);
            window.visualViewport?.removeEventListener("scroll", schedule);
            editor.off("selectionUpdate", remember);
            editor.off("transaction", transaction);
            w.removeEventListener("scroll", schedule);
            window.removeEventListener("keydown", escape);
            window.removeEventListener("resize", schedule);
            gesture.current = null;
        };
        // Observers are rebuilt only when the observed card elements change, not on every edit.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor, cards.length, collapsedKey, !!geometry]);
    const maxWidth = geometry
        ? Math.min(
              CARD_MAX_WIDTH,
              cardMaxWidth(geometry) >= CARD_MIN_ROOM
                  ? cardMaxWidth(geometry)
                  : geometry.width - 32,
          )
        : CARD_MAX_WIDTH;
    // Each card's size follows from its text, not from where it sits.
    const naturalLayouts = useMemo(
        () =>
            Object.fromEntries(
                cards.map((card) => [
                    card.id,
                    layoutCard({
                        contentWidth: cardContentWidth(card.text, maxWidth),
                        textHeight: textHeights[card.id],
                    }),
                ]),
            ),
        [cards, maxWidth, textHeights],
    );
    if (!editingCard) editSnapshot.current = null;
    const frozenLayout =
        editSnapshot.current?.id === editingCard
            ? editSnapshot.current?.layout
            : undefined;
    const layouts = useMemo(
        () =>
            editingCard && frozenLayout
                ? { ...naturalLayouts, [editingCard]: frozenLayout }
                : naturalLayouts,
        [editingCard, frozenLayout, naturalLayouts],
    );
    const positions = useMemo(
        () =>
            geometry
                ? placeSideCards(cards, geometry, layouts, CARD_MIN_ROOM)
                : {},
        [cards, geometry, layouts],
    );
    if (
        editingCard &&
        editSnapshot.current?.id !== editingCard &&
        layouts[editingCard] &&
        positions[editingCard]
    ) {
        editSnapshot.current = {
            id: editingCard,
            layout: layouts[editingCard],
            rect: positions[editingCard],
        };
    }
    const geometryReady = Boolean(geometry);
    useEffect(() => {
        if (!editingCard) return;
        nodes.current
            .get(editingCard)
            ?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }, [editingCard, geometryReady]);
    positionsRef.current = positions;
    geometryRef.current = geometry;
    const getTargetPoint = (target: ConnectorTarget, start: XY) => {
        const key = JSON.stringify(target);
        if (targetPoints.current.has(key))
            return targetPoints.current.get(key)!;
        const point =
            editor && !editor.isDestroyed && workspace.current && geometry
                ? textConnectionPoint(
                      editor.view,
                      workspace.current,
                      target,
                      start.x < (geometry.paperLeft + geometry.paperRight) / 2
                          ? "left"
                          : "right",
                  )
                : null;
        targetPoints.current.set(key, point);
        return point;
    };
    const attachSelection = (card: Card) => {
        const target = selectionTarget(editor.state.doc, connectionSelection);
        if (target) {
            onPatch(card.id, {
                connectors: [
                    {
                        id: crypto.randomUUID(),
                        anchor: cardArrowAnchor(positionsRef.current[card.id]),
                        target,
                    },
                ],
            });
            onSelect(card.id);
        }
        onConnectionEnd();
    };
    useEffect(() => {
        if (!connectionSelection) return;
        const outside = (event: PointerEvent) => {
            const target = event.target as Element;
            if (!target.closest?.("[data-card-id],.connect-selection-button"))
                onConnectionEnd();
        };
        const first = nodes.current.values().next().value;
        (first?.querySelector<HTMLElement>(".cloud-body") ?? first)?.focus({
            preventScroll: true,
        });
        document.addEventListener("pointerdown", outside, true);
        return () => document.removeEventListener("pointerdown", outside, true);
        // The parent callback only clears the connection state.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [!!connectionSelection]);
    // Leaves stay within their margin; expanded cards move freely, over the page if placed there.
    const moveCard = (g: { collapsed: boolean; rect: Rect }, rect: Rect) =>
        g.collapsed
            ? constrainSideCard(rect, geometryRef.current!, g.rect.side)
            : constrainFreeCard(rect, geometryRef.current!);
    // Leaf and expanded positions are saved separately so each form returns to its own place.
    const savedPosition = (
        collapsed: boolean | undefined,
        rect: Rect,
        g: Geometry,
    ): Partial<Card> =>
        collapsed
            ? {
                  leafPosition: {
                      side: rect.side,
                      x: rect.x / Math.max(1, g.width - rect.width),
                      y: rect.y,
                  },
              }
            : expandedPosition(rect, g);
    const startDrag = (e: ReactPointerEvent<HTMLElement>, c: Card) => {
        const target = e.target as HTMLElement;
        if (connectionSelection) return;
        if (
            e.button !== 0 ||
            (!c.collapsed && target.closest("button")) ||
            c.id === editingCard
        )
            return;
        if (
            e.pointerType === "touch" &&
            target.closest(".cloud-text[data-scroll]")
        )
            return;
        lastDrag.current = null;
        e.preventDefault();
        onSelect(c.id);

        const rect = positionsRef.current[c.id];
        if (!rect) return;
        gesture.current = {
            type: "card",
            cardId: c.id,
            collapsed: !!c.collapsed,
            rect,
            startX: e.clientX,
            startY: e.clientY,
            moved: false,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
    };
    const pointerMove = (e: ReactPointerEvent<HTMLElement>) => {
        const g = gesture.current,
            w = workspace.current;
        if (!g || !w) return;
        const dx = e.clientX - g.startX,
            dy = e.clientY - g.startY;
        if (Math.hypot(dx, dy) < 4 && !g.moved) return;
        g.moved = true;
        const next = moveCard(g, {
            ...g.rect,
            x: g.rect.x + dx,
            y: g.rect.y + dy,
        });
        if (next) setDragging({ cardId: g.cardId, ...next });
    };
    const pointerEnd = (e: ReactPointerEvent<HTMLElement>) => {
        const g = gesture.current,
            w = workspace.current;
        gesture.current = null;
        if (!g || !w) return;
        if (g.type === "card" && g.moved) {
            const rect = moveCard(g, {
                ...g.rect,
                x: g.rect.x + e.clientX - g.startX,
                y: g.rect.y + e.clientY - g.startY,
            });
            if (rect) {
                onPatch(
                    g.cardId,
                    savedPosition(g.collapsed, rect, geometryRef.current!),
                );
                lastDrag.current = { id: g.cardId, time: performance.now() };
            }
            setDragging(null);
        }
    };
    const keyboardMove = (e: ReactKeyboardEvent<HTMLElement>, c: Card) => {
        if (e.target !== e.currentTarget) return;
        if (connectionSelection) {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                attachSelection(c);
            }
            return;
        }
        if (e.key === "Enter") {
            e.preventDefault();
            beginEdit(c.id);
            return;
        }
        const dirs: Record<string, [number, number]> = {
            ArrowLeft: [-8, 0],
            ArrowRight: [8, 0],
            ArrowUp: [0, -8],
            ArrowDown: [0, 8],
        };
        const dir = dirs[e.key];
        if (!dir) return;
        e.preventDefault();
        const r = positionsRef.current[c.id]!,
            [dx, dy] = dir;
        const next = moveCard(
            { collapsed: !!c.collapsed, rect: r },
            { ...r, x: r.x + dx, y: r.y + dy },
        );
        if (next) onPatch(c.id, savedPosition(c.collapsed, next, geometry!));
    };
    const cancelGesture = () => {
        gesture.current = null;
        setDragging(null);
    };
    if (!geometry)
        return (
            <div
                className={
                    "annotation-layer pointer-events-none absolute [top:0] [left:0] [z-index:3] [width:100%] overflow-visible"
                }
                aria-label="Writing annotations"
            />
        );
    const actual: Record<string, Rect> = { ...positions };
    if (editSnapshot.current?.id === editingCard && editingCard)
        actual[editingCard] = editSnapshot.current.rect;
    for (const card of cards.filter((card) => card.collapsed)) {
        const rect = actual[card.id];
        if (!rect) continue;
        const target = (card.connectors ?? [])
            .map((link) =>
                getTargetPoint(link.target, { x: rect.x, y: rect.y }),
            )
            .find(Boolean);
        const markerRect = collapsedCardRect(rect, geometry, target);
        const saved = card.leafPosition;
        const leaf = constrainSideCard(
            {
                ...markerRect,
                x: saved
                    ? saved.x * Math.max(1, geometry.width - markerRect.width)
                    : markerRect.x,
                y: saved
                    ? saved.y
                    : card.placement === "free"
                      ? rect.y
                      : markerRect.y,
            },
            geometry,
            saved?.side ?? rect.side,
        );
        if (leaf) actual[card.id] = leaf;
        else
            actual[card.id] = {
                ...markerRect,
                x: Math.max(8, (geometry.width - markerRect.width) / 2),
                y: rect.y,
            };
    }
    if (dragging && actual[dragging.cardId])
        actual[dragging.cardId] = {
            ...actual[dragging.cardId]!,
            x: dragging.x,
            y: dragging.y,
            side: dragging.side,
        };
    positionsRef.current = actual;
    const height = Math.max(
        geometry.paperBottom + 32,
        ...Object.values(actual).map((r) => r.y + r.height + 40),
    );
    const connectionPoints = (card: Card): Partial<Record<Anchor, Point>> =>
        card.collapsed
            ? { left: [0.18, 0.5], right: [0.81, 0.5] }
            : layouts[card.id]!.anchors;
    const routedPoints = new Map<string, Point>();
    const arrows = cards
        .flatMap((c) =>
            (c.connectors ?? []).slice(0, 1).map((link) => {
                const rect = actual[c.id];
                if (!rect) return null;
                const start = cardArrowPoint(rect, connectionPoints(c)),
                    end = getTargetPoint(link.target, start);
                const obstacles = textObstacles.current;
                let route: XY[] | null = null;
                if (end) {
                    const anchors = [
                        cardArrowAnchor(rect),
                        "top",
                        "bottom",
                        "left",
                        "right",
                    ] as Anchor[];
                    const ports = [...new Set(anchors)]
                        .filter((anchor) => connectionPoints(c)[anchor])
                        .map((anchor) =>
                            anchorPoint(rect, anchor, connectionPoints(c)),
                        );
                    if (!c.collapsed)
                        ports.push(...clearCardPorts(rect, obstacles));
                    for (const port of ports) {
                        route = routeConnector(end, port, obstacles);
                        if (route) {
                            routedPoints.set(c.id, [
                                (port.x - rect.x) / rect.width,
                                (port.y - rect.y) / rect.height,
                            ]);
                            break;
                        }
                    }
                }
                return end && route
                    ? {
                          id: link.id,
                          cardId: c.id,
                          path: roundedConnectorPath(route, obstacles),
                          end,
                          color: connectorColor(c),
                          active: (selected ?? hoveredCard) === c.id,
                      }
                    : null;
            }),
        )
        .filter((arrow) => arrow !== null);
    const register = (id: string) => (el: HTMLElement | null) => {
        if (el) nodes.current.set(id, el);
        else nodes.current.delete(id);
    };
    return (
        <div
            className={`annotation-layer pointer-events-none absolute [top:0] [left:0] [z-index:3] [width:100%] overflow-visible ${connectionSelection ? "is-connecting" : ""}`}
            aria-label="Writing annotations"
            style={{ height }}
        >
            <svg
                className={
                    "annotation-connectors pointer-events-none absolute [top:0] [left:0] overflow-visible [fill:none] [color:color-mix(in_srgb,_var(--accent)_48%,_var(--muted))] [&_circle]:[fill:currentColor] [&_circle]:[stroke:none] [&_circle]:[opacity:0.85] [&_g_>_path]:[stroke:currentColor] [&_g_>_path]:[stroke-width:1.6] [&_g_>_path]:[opacity:0.82]"
                }
                width={geometry.width}
                height={height}
                aria-hidden="true"
                style={{ pointerEvents: "none" }}
            >
                {arrows.map((a) => (
                    <g
                        key={a.id}
                        data-connection-card={a.cardId}
                        className={
                            a.active
                                ? "connector-active [.annotation-connectors_&_circle]:[opacity:1] [.annotation-connectors_&_path]:[stroke-width:1.9] [.annotation-connectors_&_path]:[opacity:1]"
                                : ""
                        }
                        style={{ color: a.color }}
                    >
                        <path d={a.path} />
                        <circle cx={a.end.x} cy={a.end.y} r="2.5" />
                    </g>
                ))}
            </svg>
            {cards.map((c, i) => {
                const r =
                    editSnapshot.current?.id === c.id
                        ? editSnapshot.current.rect
                        : actual[c.id];
                if (!r) return null;
                if (c.collapsed)
                    return (
                        <button
                            key={c.id}
                            ref={register(c.id)}
                            className={`thought-paper-marker pointer-events-auto absolute cursor-grab touch-none [border-radius:0] [padding:0] [opacity:var(--cloud-opacity)] [filter:drop-shadow(0_2px_3px_color-mix(in_srgb,_var(--shadow)_7%,_transparent))] select-none [background:transparent]! [border:0]! [transition:filter_140ms] [&_svg]:[height:100%] [&_svg]:[width:100%] [&_svg]:overflow-visible [&.is-dragging]:cursor-grabbing [&:focus-visible]:[border-radius:12px] [&:focus-visible]:[box-shadow:0_0_0_2px_var(--control-ring)] [&:focus-visible]:[outline:none] [&:hover]:[filter:drop-shadow(0_3px_4px_color-mix(in_srgb,_var(--shadow)_13%,_transparent))] [.is-connecting_&]:cursor-pointer [.is-connecting_&:focus-visible]:[border-radius:10px] [.is-connecting_&:focus-visible]:[outline:1px_solid_var(--control-focus)] [.is-connecting_&:focus-visible]:[outline-offset:4px] [.is-connecting_&:hover]:[border-radius:10px] [.is-connecting_&:hover]:[outline:1px_solid_var(--control-focus)] [.is-connecting_&:hover]:[outline-offset:4px] ${dragging?.cardId === c.id ? "is-dragging" : ""}`}
                            data-card-id={c.id}
                            data-collapsed="true"
                            style={
                                {
                                    left: r.x,
                                    top: r.y,
                                    width: r.width,
                                    height: r.height,
                                    "--cloud-fill": cardFill(c.bg),
                                    "--cloud-opacity": c.opacity,
                                } as CardStyle
                            }
                            aria-label={
                                connectionSelection
                                    ? `Connect selected text to thought ${i + 1}`
                                    : `Expand thought ${i + 1}`
                            }
                            onPointerEnter={() => setHoveredCard(c.id)}
                            onPointerLeave={() => setHoveredCard(null)}
                            onPointerDown={(e) => startDrag(e, c)}
                            onPointerMove={pointerMove}
                            onPointerUp={pointerEnd}
                            onPointerCancel={() => cancelGesture()}
                            onKeyDown={(e) => {
                                if (e.key.startsWith("Arrow"))
                                    keyboardMove(e, c);
                            }}
                            onClick={() => {
                                if (connectionSelection) {
                                    attachSelection(c);
                                    return;
                                }
                                if (
                                    lastDrag.current?.id === c.id &&
                                    performance.now() - lastDrag.current.time <
                                        300
                                )
                                    return;
                                onPatch(c.id, { collapsed: false });
                                onSelect(c.id);
                            }}
                        >
                            <svg
                                viewBox="0 0 44 48"
                                aria-hidden="true"
                                focusable="false"
                            >
                                <path
                                    d={FOLDED_THOUGHT_PATH}
                                    fill={cardFill(c.bg)}
                                />
                                <path
                                    d="M 29 5 Q 28 13 39 14 L 38 6 Z"
                                    fill="white"
                                    opacity=".3"
                                />
                                <path
                                    d="M 29 6 Q 29 13 39 14 M 9 40 L 29 17 M 17 31 L 17 23 M 22 26 L 30 26"
                                    fill="none"
                                    stroke={cardText(c.fg)}
                                    strokeWidth=".8"
                                    opacity=".13"
                                />
                            </svg>
                        </button>
                    );
                const layout = layouts[c.id]!,
                    point =
                        routedPoints.get(c.id) ??
                        layout.anchors[cardArrowAnchor(r)];
                const accent = cardAccentVariant(c.id);
                return (
                    <div
                        key={c.id}
                        ref={register(c.id)}
                        data-card-id={c.id}
                        onPointerEnter={() => setHoveredCard(c.id)}
                        onPointerLeave={() => setHoveredCard(null)}
                        data-max-width={maxWidth}
                        className={`annotation-cloud pointer-events-auto absolute [isolation:isolate] touch-auto [filter:drop-shadow(0_4px_8px_color-mix(in_srgb,_var(--shadow)_2%,_transparent))] [&.is-dragging]:[z-index:5] [&.is-selected:where(:not(.is-dragging))]:[z-index:4] [.is-connecting_&]:cursor-pointer [.is-connecting_&:focus-within]:[border-radius:10px] [.is-connecting_&:focus-within]:[outline:1px_solid_var(--control-focus)] [.is-connecting_&:focus-within]:[outline-offset:4px] [.is-connecting_&:hover]:[border-radius:10px] [.is-connecting_&:hover]:[outline:1px_solid_var(--control-focus)] [.is-connecting_&:hover]:[outline-offset:4px] ${selected === c.id ? "is-selected" : ""} ${dragging?.cardId === c.id ? "is-dragging" : ""}`}
                        style={
                            {
                                left: r.x,
                                top: r.y,
                                width: layout.width,
                                height: layout.height,
                                color: cardText(c.fg),
                                "--cloud-fill": cardFill(c.bg),
                                "--cloud-opacity": c.opacity,
                                "--card-ink": c.bg,
                            } as CardStyle
                        }
                        role="group"
                        aria-label={`Thought ${i + 1}`}
                        onClickCapture={(event) => {
                            if (connectionSelection) {
                                event.preventDefault();
                                event.stopPropagation();
                                attachSelection(c);
                            }
                        }}
                    >
                        <CardShape layout={layout} />
                        <div
                            className={
                                "cloud-body [min-height:104px] cursor-grab touch-auto [border-radius:40%] [padding:28px_24px_26px] [font-family:'Source_Serif_4',_Georgia,_serif] [font-size:15px] [line-height:1.5] [overflow-wrap:anywhere] whitespace-pre-wrap [opacity:var(--cloud-opacity)] [outline:none] select-none [border:0] [&:focus-visible]:[box-shadow:0_0_0_2px_var(--control-ring)] [&:focus-visible]:[outline:none]! [.annotation-cloud_&]:absolute [.annotation-cloud_&]:[inset:0] [.annotation-cloud_&]:[min-height:0] [.annotation-cloud_&]:[border-radius:0] [.annotation-cloud_&]:[padding:0] [.is-connecting_&]:cursor-pointer [.is-dragging_&]:cursor-grabbing"
                            }
                            style={{ padding: 0 }}
                            role={editingCard === c.id ? undefined : "button"}
                            tabIndex={editingCard === c.id ? -1 : 0}
                            aria-label={
                                connectionSelection
                                    ? `Connect selected text to thought ${i + 1}`
                                    : `Thought ${i + 1}: ${c.text || "An unfinished thought"}. Drag to move, Enter to edit.`
                            }
                            onPointerDown={(e) => startDrag(e, c)}
                            onPointerMove={pointerMove}
                            onPointerUp={pointerEnd}
                            onPointerCancel={() => cancelGesture()}
                            onKeyDown={(e) => keyboardMove(e, c)}
                            onClick={() => onSelect(c.id)}
                            onDoubleClick={(event) => {
                                if (!connectionSelection) {
                                    event.preventDefault();
                                    beginEdit(c.id, {
                                        x: event.clientX,
                                        y: event.clientY,
                                    });
                                }
                            }}
                        >
                            <span
                                className={
                                    "cloud-drag-surface absolute [inset:0] touch-none"
                                }
                                aria-hidden="true"
                            />
                            <InlineThoughtText
                                layout={layout}
                                text={c.text}
                                html={c.html}
                                editing={editingCard === c.id}
                                label={`Thought ${i + 1} text`}
                                point={editPoint.current}
                                smartPunctuation={smartPunctuation}
                                onCommit={(text, html) => {
                                    if (text !== c.text || html !== c.html)
                                        onPatch(c.id, { text, html });
                                    onEditEnd();
                                }}
                                onCancel={onEditEnd}
                            />
                        </div>
                        {accent !== 0 && (
                            <svg
                                className={
                                    "card-handdrawn-accents pointer-events-none absolute [inset:0] [height:100%] [width:100%] overflow-visible [fill:none] [stroke:var(--card-ink)] [stroke-width:1.5] [opacity:0.45] [stroke-linecap:round]"
                                }
                                viewBox={`0 0 ${layout.width} ${layout.height}`}
                                aria-hidden="true"
                                focusable="false"
                            >
                                {accent === 1 ? (
                                    <path
                                        d={`M -8 24 l -5 -4 M -7 33 l -7 1 M ${layout.width - 30} -4 q 6 -7 13 -5`}
                                    />
                                ) : (
                                    <path
                                        d={`M -7 ${layout.height * 0.4} q -7 5 -3 13 M ${layout.width - 20} -5 l 3 -6 M ${layout.width - 11} -3 l 6 -4`}
                                    />
                                )}
                            </svg>
                        )}
                        <button
                            className={
                                "cloud-collapse absolute [top:4px] [right:40px] [height:28px] [min-height:28px] [width:24px] [min-width:24px] [border-radius:50%] [padding:6px] [color:var(--muted)] [background:var(--surface)]"
                            }
                            aria-label={`Collapse thought ${i + 1}`}
                            onClick={() => {
                                onPatch(c.id, { collapsed: true });
                                onSelect(null);

                                gesture.current = null;
                            }}
                        >
                            <ChevronDown size={13} />
                        </button>
                        <button
                            className={
                                "cloud-edit absolute [right:12px] [bottom:-8px] [height:28px] [min-height:28px] [width:28px] [min-width:28px] [border-radius:50%] [padding:6px] [color:var(--muted)] [opacity:0] [background:var(--surface)] [transition:opacity_140ms] [.annotation-cloud_&]:[top:4px] [.annotation-cloud_&]:[right:8px] [.annotation-cloud_&]:[bottom:auto] [.annotation-cloud_&]:[opacity:1] [.annotation-cloud.is-selected_&]:[opacity:1] [.annotation-cloud:focus-within_&]:[opacity:1] [.annotation-cloud:hover_&]:[opacity:1] [@media(hover:_none)]:[opacity:1] [@media(pointer:_coarse)]:[.annotation-cloud_&::after]:absolute [@media(pointer:_coarse)]:[.annotation-cloud_&::after]:[inset:-7px] [@media(pointer:_coarse)]:[.annotation-cloud_&::after]:[content:'']"
                            }
                            aria-label={`Edit thought ${i + 1}`}
                            onClick={() => beginEdit(c.id)}
                        >
                            <Pencil size={13} />
                        </button>
                        {selected === c.id &&
                            editingCard !== c.id &&
                            !!c.connectors?.length && (
                                <div
                                    className={
                                        "thought-actions absolute [top:calc(100%_+_4px)] [right:8px] flex [max-width:calc(100%_-_16px)] flex-wrap [gap:4px] [&_button]:inline-flex [&_button]:[height:28px] [&_button]:[min-height:28px] [&_button]:[width:28px] [&_button]:[min-width:28px] [&_button]:items-center [&_button]:justify-center [&_button]:[border-radius:50%] [&_button]:[padding:5px] [&_button]:[color:var(--muted)] [&_button]:[background:var(--surface)] [&_button:hover:where(:not(:active))]:[color:var(--muted)] [@media(pointer:_coarse)]:[&_button]:[height:44px] [@media(pointer:_coarse)]:[&_button]:[width:44px]"
                                    }
                                    aria-label="Thought actions"
                                    onPointerDown={(event) =>
                                        event.stopPropagation()
                                    }
                                >
                                    {(c.connectors ?? []).map((link) => (
                                        <button
                                            key={link.id}
                                            aria-label={`Remove connection: ${link.target.quote || "Whole essay"}`}
                                            title={
                                                link.target.orphaned
                                                    ? "Text removed; reconnect"
                                                    : link.target.quote ||
                                                      "Whole essay"
                                            }
                                            onClick={() =>
                                                onPatch(c.id, {
                                                    connectors:
                                                        c.connectors!.filter(
                                                            (item) =>
                                                                item.id !==
                                                                link.id,
                                                        ),
                                                })
                                            }
                                        >
                                            <Link2 size={12} />
                                            <X size={10} />
                                        </button>
                                    ))}
                                </div>
                            )}
                        <span
                            className={
                                "cloud-anchor absolute [height:12px] [min-height:12px] [width:12px] [min-width:12px] cursor-crosshair touch-none [border-radius:50%] [border-width:1px] [border-style:solid] [border-top-color:var(--control-focus)] [border-right-color:var(--control-focus)] [border-bottom-color:var(--control-focus)] [border-left-color:var(--control-focus)] [padding:0] [opacity:0] [background:var(--surface)] [border-image:none] [&::after]:absolute [&::after]:[inset:-8px] [&::after]:[border-radius:50%] [&::after]:[content:''] [.annotation-cloud.is-selected_&]:[opacity:1] [.annotation-cloud:focus-within_&]:[opacity:1] [.annotation-cloud:hover_&]:[opacity:1] [@media(hover:_none)]:[opacity:1]"
                            }
                            aria-hidden="true"
                            style={{
                                background: connectorColor(c),
                                borderColor: connectorColor(c),
                                left: `${point[0] * 100}%`,
                                top: `${point[1] * 100}%`,
                                transform: "translate(-50%,-50%)",
                                pointerEvents: "none",
                            }}
                        />
                    </div>
                );
            })}
            {connectionSelection && (
                <div
                    className={
                        "connection-hint pointer-events-none fixed [top:20px] [left:50%] [max-width:calc(100vw_-_32px)] [transform:translateX(-50%)] [border-radius:8px] [border-width:1px] [border-style:solid] [border-top-color:var(--control-border)] [border-right-color:var(--control-border)] [border-bottom-color:var(--control-border)] [border-left-color:var(--control-border)] [padding:8px_12px] [color:var(--muted)] [box-shadow:0_2px_8px_color-mix(in_srgb,_var(--shadow)_3%,_transparent)] [background:var(--surface)] [border-image:none] [font:12px/1.5_Inter,_sans-serif]"
                    }
                    role="status"
                >
                    Select a thought card to connect
                </div>
            )}
        </div>
    );
}
