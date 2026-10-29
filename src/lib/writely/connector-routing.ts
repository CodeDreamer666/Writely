import type {
    Rect,
    XY,
} from "./annotation-model";

export type TextObstacle = {
    left: number;
    right: number;
    top: number;
    bottom: number;
};
/**
 * What: The extra space, in pixels, kept around each word when connector
 * lines are routed past the manuscript text.
 *
 * Used in:
 * - src/lib/writely/connector-routing.ts (measureTextObstacles)
 *
 * Effect: A larger value keeps connector lines further from the text, so they
 * take longer detours. A smaller value lets them pass closer to words.
 */
export const TEXT_CLEARANCE = 2;

// Range rectangles describe ink-bearing runs (including punctuation), rather
// than block boxes, so real inter-line and inter-word whitespace stays usable.
export function measureTextObstacles(
    root: HTMLElement,
    workspace: HTMLElement,
): TextObstacle[] {
    const bounds = workspace.getBoundingClientRect();
    const sx = bounds.width / workspace.offsetWidth || 1;
    const sy = bounds.height / workspace.offsetHeight || 1;
    const walker = root.ownerDocument.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
    );
    const range = root.ownerDocument.createRange();
    const result: TextObstacle[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
        for (const match of (node.textContent ?? "").matchAll(/\S+/gu)) {
            range.setStart(node, match.index);
            range.setEnd(node, match.index + match[0].length);
            for (const r of Array.from(range.getClientRects())) {
                if (!r.width || !r.height) continue;
                result.push({
                    left:
                        (r.left - bounds.left) / sx +
                        workspace.scrollLeft -
                        TEXT_CLEARANCE,
                    right:
                        (r.right - bounds.left) / sx +
                        workspace.scrollLeft +
                        TEXT_CLEARANCE,
                    top:
                        (r.top - bounds.top) / sy +
                        workspace.scrollTop -
                        TEXT_CLEARANCE,
                    bottom:
                        (r.bottom - bounds.top) / sy +
                        workspace.scrollTop +
                        TEXT_CLEARANCE,
                });
            }
        }
    }
    // Images and other atomic editor content must remain unobstructed too.
    for (const el of root.querySelectorAll(
        "img, hr, [contenteditable='false']",
    )) {
        const r = el.getBoundingClientRect();
        result.push({
            left:
                (r.left - bounds.left) / sx +
                workspace.scrollLeft -
                TEXT_CLEARANCE,
            right:
                (r.right - bounds.left) / sx +
                workspace.scrollLeft +
                TEXT_CLEARANCE,
            top:
                (r.top - bounds.top) / sy +
                workspace.scrollTop -
                TEXT_CLEARANCE,
            bottom:
                (r.bottom - bounds.top) / sy +
                workspace.scrollTop +
                TEXT_CLEARANCE,
        });
    }
    return result;
}

// Slab intersection works for diagonals as well as orthogonal segments.
export function segmentIsClear(a: XY, b: XY, obstacles: TextObstacle[]) {
    return !obstacles.some((r) => {
        let lo = 0,
            hi = 1;
        for (const [p, d, min, max] of [
            [a.x, b.x - a.x, r.left, r.right],
            [a.y, b.y - a.y, r.top, r.bottom],
        ] as const) {
            if (Math.abs(d) < 1e-9) {
                if (p <= min || p >= max) return false;
            } else {
                const t1 = (min - p) / d,
                    t2 = (max - p) / d;
                lo = Math.max(lo, Math.min(t1, t2));
                hi = Math.min(hi, Math.max(t1, t2));
                if (lo >= hi - 1e-9) return false;
            }
        }
        return lo < hi;
    });
}

const distance = (a: XY, b: XY) => Math.hypot(a.x - b.x, a.y - b.y);
const clean = (points: XY[]) =>
    points.filter((p, i) => !i || distance(p, points[i - 1]!) > 1e-6);
const length = (points: XY[]) =>
    points.reduce(
        (sum, p, i) => sum + (i ? distance(points[i - 1]!, p) : 0),
        0,
    );

// Find ports in actual whitespace along a freely positioned card's perimeter.
// Fixed midpoints alone can all be buried in the underlying paragraph.
export function clearCardPorts(card: Rect, obstacles: TextObstacle[]): XY[] {
    const ports: XY[] = [];
    for (const vertical of [true, false]) {
        const min = (vertical ? card.y : card.x) + 8;
        const max = (vertical ? card.y + card.height : card.x + card.width) - 8;
        const middle = (min + max) / 2;
        for (const edge of vertical
            ? [card.x, card.x + card.width]
            : [card.y, card.y + card.height]) {
            const blocked = obstacles
                .filter((r) =>
                    vertical
                        ? r.left < edge && r.right > edge
                        : r.top < edge && r.bottom > edge,
                )
                .map((r) => (vertical ? [r.top, r.bottom] : [r.left, r.right]))
                .sort((a, b) => a[0]! - b[0]!);
            const gaps: number[] = [];
            let cursor = min;
            for (const [from, to] of [...blocked, [max + 1, max + 1]]) {
                const stop = Math.min(max, from! - 0.25);
                if (stop >= cursor)
                    gaps.push(Math.max(cursor, Math.min(stop, middle)));
                cursor = Math.max(cursor, to! + 0.25);
                if (cursor > max) break;
            }
            gaps.sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle));
            ports.push(
                ...gaps
                    .slice(0, 4)
                    .map((position) =>
                        vertical
                            ? { x: edge, y: position }
                            : { x: position, y: edge },
                    ),
            );
        }
    }
    return ports;
}

export function routeConnector(
    start: XY,
    end: XY,
    obstacles: TextObstacle[],
): XY[] | null {
    if (
        !segmentIsClear(start, start, obstacles) ||
        !segmentIsClear(end, end, obstacles)
    )
        return null;
    const clear = (points: XY[]) =>
        points.every(
            (p, i) => !i || segmentIsClear(points[i - 1]!, p, obstacles),
        );
    // Always depart horizontally beneath the highlight before turning downward.
    const left = Math.min(start.x, end.x, ...obstacles.map((r) => r.left)) - 12;
    const right =
        Math.max(start.x, end.x, ...obstacles.map((r) => r.right)) + 12;
    const candidates = [
        [start, { x: end.x, y: start.y }, end],
        ...[left, right].map((x) => [
            start,
            { x, y: start.y },
            { x, y: end.y },
            end,
        ]),
    ]
        .map(clean)
        .filter(clear)
        .sort((a, b) => length(a) + a.length * 12 - length(b) - b.length * 12);
    if (candidates.length) return candidates[0]!;

    // A compressed rectilinear visibility grid contains every obstacle boundary.
    // Unlike a pixel grid, it cannot miss a narrow but usable line gap.
    const xs = [
        ...new Set([
            start.x,
            end.x,
            left,
            right,
            ...obstacles.flatMap((r) => [r.left, r.right]),
        ]),
    ].sort((a, b) => a - b);
    const ys = [
        ...new Set([
            start.y,
            end.y,
            ...obstacles.flatMap((r) => [r.top, r.bottom]),
        ]),
    ].sort((a, b) => a - b);
    const width = xs.length;
    const source = ys.indexOf(start.y) * width + xs.indexOf(start.x);
    const target = ys.indexOf(end.y) * width + xs.indexOf(end.x);
    const point = (id: number): XY => ({
        x: xs[id % width]!,
        y: ys[Math.floor(id / width)]!,
    });
    const scores = new Map<number, number>([[source, 0]]);
    const previous = new Map<number, number>();
    const heap: { id: number; cost: number; score: number }[] = [];
    const push = (item: (typeof heap)[number]) => {
        heap.push(item);
        let i = heap.length - 1;
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (heap[parent]!.score <= item.score) break;
            heap[i] = heap[parent]!;
            i = parent;
        }
        heap[i] = item;
    };
    const pop = () => {
        const first = heap[0]!,
            last = heap.pop()!;
        if (heap.length) {
            let i = 0;
            while (i * 2 + 1 < heap.length) {
                let child = i * 2 + 1;
                if (
                    child + 1 < heap.length &&
                    heap[child + 1]!.score < heap[child]!.score
                )
                    child++;
                if (heap[child]!.score >= last.score) break;
                heap[i] = heap[child]!;
                i = child;
            }
            heap[i] = last;
        }
        return first;
    };
    push({ id: source, cost: 0, score: distance(start, end) });
    // Cache the local collision sets instead of scanning every word per edge.
    const rows = ys.map((y) =>
        obstacles.filter((r) => r.top < y && r.bottom > y),
    );
    const columns = xs.map((x) =>
        obstacles.filter((r) => r.left < x && r.right > x),
    );
    while (heap.length) {
        const current = pop();
        if (current.cost !== scores.get(current.id)) continue;
        if (current.id === target) {
            const result = [end];
            let id = target;
            while (id !== source) {
                id = previous.get(id)!;
                result.push(point(id));
            }
            return result
                .reverse()
                .filter(
                    (p, i, all) =>
                        !i ||
                        i === all.length - 1 ||
                        (p.x - all[i - 1]!.x) * (all[i + 1]!.y - p.y) !==
                            (p.y - all[i - 1]!.y) * (all[i + 1]!.x - p.x),
                );
        }
        const x = current.id % width,
            y = Math.floor(current.id / width),
            a = point(current.id);
        for (const [nx, ny] of [
            [x - 1, y],
            [x + 1, y],
            [x, y - 1],
            [x, y + 1],
        ] as [number, number][]) {
            if (nx < 0 || nx >= width || ny < 0 || ny >= ys.length) continue;
            const id = ny * width + nx,
                b = point(id);
            if (!segmentIsClear(a, b, nx === x ? columns[x]! : rows[y]!))
                continue;
            const parent = previous.get(current.id),
                p = parent === undefined ? null : point(parent);
            const bend = p && (p.x === a.x) !== (a.x === b.x) ? 12 : 0;
            const cost = current.cost + distance(a, b) + bend;
            if (cost >= (scores.get(id) ?? Infinity)) continue;
            scores.set(id, cost);
            previous.set(id, current.id);
            push({
                id,
                cost,
                score: cost + Math.abs(b.x - end.x) + Math.abs(b.y - end.y),
            });
        }
    }
    // An endpoint buried in text has no safe route. Never fall back to an unsafe curve.
    return null;
}

export function roundedConnectorPath(points: XY[], obstacles: TextObstacle[]) {
    if (!points.length) return "";
    let path = `M ${points[0]!.x} ${points[0]!.y}`;
    for (let i = 1; i < points.length - 1; i++) {
        const a = points[i - 1]!,
            b = points[i]!,
            c = points[i + 1]!;
        let radius = Math.min(18, distance(a, b) / 2, distance(b, c) / 2);
        let entry = b,
            exit = b;
        while (radius > 0.1) {
            entry = {
                x: b.x + ((a.x - b.x) * radius) / distance(a, b),
                y: b.y + ((a.y - b.y) * radius) / distance(a, b),
            };
            exit = {
                x: b.x + ((c.x - b.x) * radius) / distance(b, c),
                y: b.y + ((c.y - b.y) * radius) / distance(b, c),
            };
            // A quadratic stays in its control triangle. Its bounding box is a
            // conservative clearance test, so rounding never cuts across a word.
            if (
                !obstacles.some(
                    (r) =>
                        r.left < Math.max(entry.x, b.x, exit.x) &&
                        r.right > Math.min(entry.x, b.x, exit.x) &&
                        r.top < Math.max(entry.y, b.y, exit.y) &&
                        r.bottom > Math.min(entry.y, b.y, exit.y),
                )
            )
                break;
            radius /= 2;
        }
        path += ` L ${entry.x} ${entry.y} Q ${b.x} ${b.y} ${exit.x} ${exit.y}`;
    }
    const last = points.at(-1)!;
    return `${path} L ${last.x} ${last.y}`;
}

/** Pick a smooth, outward-facing curve from the visible card edge to its text. */
export function smoothCardConnector(
    card: Rect,
    target: XY,
    obstacles: TextObstacle[],
    collapsed = false,
): string | null {
    type Port = { point: XY; normal: XY };
    const clamp = (n: number, min: number, max: number) =>
        Math.max(min, Math.min(max, n));
    const make = (x: number, y: number, nx: number, ny: number): Port => ({
        point: { x: card.x + x * card.width, y: card.y + y * card.height },
        normal: { x: nx, y: ny },
    });
    // The leaf has an irregular outline, so sample its actual Bézier boundary.
    const leafPorts = (): Port[] => {
        const curves: XY[][] = [
            [
                { x: 8, y: 41 },
                { x: 4, y: 29 },
                { x: 9, y: 12 },
                { x: 23, y: 7 },
            ],
            [
                { x: 23, y: 7 },
                { x: 31, y: 3 },
                { x: 38, y: 6 },
            ],
            [
                { x: 38, y: 6 },
                { x: 42, y: 19 },
                { x: 33, y: 29 },
            ],
            [
                { x: 33, y: 29 },
                { x: 23, y: 39 },
                { x: 8, y: 41 },
            ],
        ];
        const evaluate = (points: XY[], t: number): XY => {
            let row = points;
            while (row.length > 1)
                row = row.slice(1).map((p, i) => ({
                    x: row[i]!.x * (1 - t) + p.x * t,
                    y: row[i]!.y * (1 - t) + p.y * t,
                }));
            return row[0]!;
        };
        return curves.flatMap((curve) =>
            [0.2, 0.5, 0.8].map((t) => {
                const p = evaluate(curve, t),
                    before = evaluate(curve, t - 0.001),
                    after = evaluate(curve, t + 0.001);
                const dx = ((after.x - before.x) * card.width) / 44,
                    dy = ((after.y - before.y) * card.height) / 48;
                const size = Math.hypot(dx, dy) || 1;
                return make(p.x / 44, p.y / 48, dy / size, -dx / size);
            }),
        );
    };
    const ports: Port[] = collapsed
        ? leafPorts()
        : [
              ...[
                  clamp((target.y - card.y) / card.height, 0.12, 0.88),
                  0.25,
                  0.5,
                  0.75,
              ].flatMap((y) => [make(0, y, -1, 0), make(1, y, 1, 0)]),
              ...[
                  clamp((target.x - card.x) / card.width, 0.12, 0.88),
                  0.25,
                  0.5,
                  0.75,
              ].flatMap((x) => [make(x, 0, 0, -1), make(x, 1, 0, 1)]),
          ];
    if (!collapsed) {
        for (const point of clearCardPorts(card, obstacles)) {
            const normal =
                point.x === card.x
                    ? { x: -1, y: 0 }
                    : point.x === card.x + card.width
                      ? { x: 1, y: 0 }
                      : point.y === card.y
                        ? { x: 0, y: -1 }
                        : { x: 0, y: 1 };
            ports.push({ point, normal });
        }
    }
    const candidates = ports
        .map((port) => {
            const dx = target.x - port.point.x,
                dy = target.y - port.point.y;
            const dist = Math.hypot(dx, dy);
            const facing =
                (dx * port.normal.x + dy * port.normal.y) / Math.max(dist, 1);
            return {
                ...port,
                dist,
                facing,
                score: dist + Math.max(0, 0.55 - facing) * 140,
            };
        })
        .filter((port) => port.facing > 0.05)
        .sort((a, b) => a.score - b.score);
    for (const port of candidates) {
        const reach = Math.min(90, Math.max(8, port.dist * 0.32));
        const p0 = port.point;
        const p1 = {
            x: p0.x + port.normal.x * reach,
            y: p0.y + port.normal.y * reach,
        };
        const p2 = {
            x: target.x - (target.x - p0.x) * 0.25,
            y: target.y - (target.y - p0.y) * 0.25,
        };
        let previous = p0,
            clear = true;
        for (let i = 1; i <= 24; i++) {
            const t = i / 24,
                u = 1 - t;
            const point = {
                x:
                    u ** 3 * p0.x +
                    3 * u * u * t * p1.x +
                    3 * u * t * t * p2.x +
                    t ** 3 * target.x,
                y:
                    u ** 3 * p0.y +
                    3 * u * u * t * p1.y +
                    3 * u * t * t * p2.y +
                    t ** 3 * target.y,
            };
            if (!segmentIsClear(previous, point, obstacles)) {
                clear = false;
                break;
            }
            previous = point;
        }
        if (clear)
            return `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${target.x} ${target.y}`;
    }
    // When text blocks a direct curve, route through whitespace and round its turns.
    const routeObstacles = collapsed
        ? obstacles
        : [
              ...obstacles,
              {
                  left: card.x + 1,
                  right: card.x + card.width - 1,
                  top: card.y + 1,
                  bottom: card.y + card.height - 1,
              },
          ];
    const routes = candidates.slice(0, 4).flatMap((port) => {
        const route = routeConnector(target, port.point, routeObstacles);
        return route
            ? [
                  {
                      route,
                      score:
                          length(route) +
                          route.length * 12 +
                          Math.max(0, 0.55 - port.facing) * 140,
                  },
              ]
            : [];
    });
    routes.sort((a, b) => a.score - b.score);
    return routes[0]
        ? roundedConnectorPath(routes[0].route.reverse(), routeObstacles)
        : null;
}
