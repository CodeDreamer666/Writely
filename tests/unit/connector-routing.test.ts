import {
    expect,
    test,
} from "vitest";
import {
    routeConnector,
    clearCardPorts,
    roundedConnectorPath,
    segmentIsClear,
    type TextObstacle,
} from "../../src/lib/writely/connector-routing";

const words: TextObstacle[] = [
    { left: 20, right: 95, top: 10, bottom: 30 },
    { left: 105, right: 180, top: 10, bottom: 30 },
    { left: 20, right: 180, top: 40, bottom: 60 },
    { left: 20, right: 180, top: 70, bottom: 90 },
];

test("a card below a paragraph escapes along the line gap into a margin", () => {
    const route = routeConnector({ x: 70, y: 34 }, { x: 100, y: 110 }, words)!;
    expect(route).not.toBeNull();
    expect(route[1]!.y).toBe(34);
    expect(route.some((p) => p.x < 20 || p.x > 180)).toBe(true);
    for (let i = 1; i < route.length; i++)
        expect(segmentIsClear(route[i - 1]!, route[i]!, words)).toBe(true);
    expect(roundedConnectorPath(route, words)).toContain("Q");
});

test("visibility search reaches a card in an internal line gap", () => {
    const route = routeConnector({ x: 70, y: 34 }, { x: 110, y: 65 }, words)!;
    expect(route).not.toBeNull();
    for (let i = 1; i < route.length; i++)
        expect(segmentIsClear(route[i - 1]!, route[i]!, words)).toBe(true);
});

test("a blocked endpoint never produces an unsafe fallback", () => {
    expect(
        routeConnector({ x: 70, y: 34 }, { x: 100, y: 50 }, words),
    ).toBeNull();
});

test("card ports move into whitespace when edge midpoints intersect words", () => {
    const ports = clearCardPorts(
        { x: 30, y: 20, width: 110, height: 65 },
        words,
    );
    expect(ports.length).toBeGreaterThan(0);
    for (const port of ports)
        expect(segmentIsClear(port, port, words)).toBe(true);
});

test("narrow line gaps route sideways instead of crossing the following line", () => {
    const tight = [
        { left: 10, right: 200, top: 0, bottom: 20 },
        { left: 10, right: 200, top: 21, bottom: 50 },
    ];
    const route = routeConnector({ x: 80, y: 20.5 }, { x: 90, y: 80 }, tight)!;
    expect(route[1]!.y).toBe(20.5);
    for (let i = 1; i < route.length; i++)
        expect(segmentIsClear(route[i - 1]!, route[i]!, tight)).toBe(true);
});

test("diagonal collision checks detect word intersections, including zero-length endpoints", () => {
    expect(segmentIsClear({ x: 0, y: 0 }, { x: 200, y: 100 }, words)).toBe(
        false,
    );
    expect(segmentIsClear({ x: 50, y: 20 }, { x: 50, y: 20 }, words)).toBe(
        false,
    );
    expect(segmentIsClear({ x: 0, y: 34 }, { x: 200, y: 34 }, words)).toBe(
        true,
    );
});
