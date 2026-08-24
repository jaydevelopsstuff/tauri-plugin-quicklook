export type RectValues = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export function rectsEqual(
    a: RectValues | null,
    b: RectValues | null,
): boolean {
    if (a === null || b === null) return a === b;
    return (
        a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
    );
}
