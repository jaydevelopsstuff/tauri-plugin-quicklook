export function observeElementRect(
    element: Element,
    callback: (rect: DOMRect) => void,
): () => void {
    let prev = element.getBoundingClientRect();
    let scheduled = false;

    const hasChanged = (a: DOMRect, b: DOMRect) =>
        a.x !== b.x ||
        a.y !== b.y ||
        a.width !== b.width ||
        a.height !== b.height;

    const emit = () => {
        scheduled = false;

        const rect = element.getBoundingClientRect();

        if (hasChanged(rect, prev)) {
            prev = rect;

            callback(rect);
        }
    };

    const schedule = () => {
        if (!scheduled) {
            scheduled = true;
            requestAnimationFrame(emit);
        }
    };

    // Element resize
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(element);

    // DOM/layout/style changes
    const mutationObserver = new MutationObserver(schedule);

    mutationObserver.observe(document.body, {
        attributes: true,
        childList: true,
        subtree: true,
        characterData: false,
    });

    // Initial emit
    schedule();

    return () => {
        resizeObserver.disconnect();
        mutationObserver.disconnect();
    };
}
