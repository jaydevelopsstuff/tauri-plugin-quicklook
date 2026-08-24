import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, Monitor, Window } from "@tauri-apps/api/window";
import { rectsEqual } from "./utils";
import {
    PreviewItem,
    RectValues,
    SetAndTrackPreviewElementsOptions,
    SourceFrame,
    TrackedElement,
    TrackedElementItem,
} from "./types";

/**
 * Takes an input list of preview item URLs and the elements that represent them
 * (or resolver functions that locate them, see {@link TrackedElement}) and keeps
 * the preview items' source frames in sync with the elements' on-screen positions.
 * Position/size changes, scrolling anywhere in the viewport, and window resizes are
 * all tracked; updates are coalesced into at most one `setPreviewItems` push per
 * animation frame, and pushes are skipped entirely when nothing has moved.
 *
 * An item's source frame is cleared (making the preview pane fall back to its fade
 * animation for that item) whenever its element is unavailable: the resolver returned
 * `null`, the element was removed from the DOM, or—unless
 * {@link SetAndTrackPreviewElementsOptions.clearFrameWhenHidden} is disabled—the
 * element is scrolled fully offscreen or clipped away by a scroll container. When the
 * element becomes available again (e.g. a virtualized row remounts and its resolver
 * returns the new node), its source frame is restored and tracking resumes.
 *
 * The set of items (URLs and order) is fixed for the lifetime of the call. To change
 * it, call the returned cleanup function and invoke this again with the new list—and
 * since the URLs/order changed, follow with {@link reloadPreviewPane}. Source frame
 * updates alone never require a reload.
 *
 * This is a catch-all use case when your preview items might move around and/or the user might
 * scroll or resize the window while the preview pane is open. If you don't need this level of
 * dynamic coverage you can just use {@link setPreviewItems}.
 *
 * @param elementItems The elements (or element resolvers) to track/update and their URLs.
 * Each item can also provide a `getRect` override to track a sub-rectangle of its
 * element (see {@link TrackedElementItem}).
 * @param options See {@link SetAndTrackPreviewElementsOptions}
 * @returns Cleanup callback that stops all tracking
 */
export async function setAndTrackPreviewElements(
    elementItems: TrackedElementItem[],
    options: SetAndTrackPreviewElementsOptions = {},
): Promise<() => void> {
    const { clearFrameWhenHidden = true } = options;
    const appWindow = getCurrentWindow();

    type TrackedItemState = {
        url: string;
        source: TrackedElement;
        getRect?: (element: Element) => RectValues;
        element: Element | null;
        visible: boolean;
        lastRect: RectValues | null;
    };

    const states: TrackedItemState[] = elementItems.map((item) => ({
        url: item.url,
        source: item.element,
        getRect: item.getRect,
        element: null,
        visible: true,
        lastRect: null,
    }));

    let scheduled = false;
    let rafId = 0;
    let syncing = false;
    let resyncNeeded = false;
    let forceFramePush = false;
    let hasPushed = false;
    let stopped = false;

    const resizeObserver = new ResizeObserver(schedule);
    const intersectionObserver = clearFrameWhenHidden
        ? new IntersectionObserver((entries) => {
              for (const entry of entries) {
                  for (const state of states) {
                      if (state.element === entry.target) {
                          state.visible = entry.isIntersecting;
                      }
                  }
              }
              schedule();
          })
        : null;

    // A single observer over the whole body catches position shifts that fire no
    // event on the element itself (e.g. a sibling mounting above it)
    const mutationObserver = new MutationObserver(schedule);
    mutationObserver.observe(document.body, {
        attributes: true,
        childList: true,
        subtree: true,
        characterData: false,
    });

    function resolveElement(state: TrackedItemState) {
        const resolved =
            typeof state.source === "function" ? state.source() : state.source;
        const next = resolved?.isConnected ? resolved : null;

        if (next === state.element) return;

        if (state.element) {
            resizeObserver.unobserve(state.element);
            intersectionObserver?.unobserve(state.element);
        }
        if (next) {
            resizeObserver.observe(next);
            intersectionObserver?.observe(next);
            // Assume visible until the IntersectionObserver reports otherwise
            state.visible = true;
        }
        state.element = next;
    }

    function schedule() {
        if (scheduled || stopped) return;
        scheduled = true;
        rafId = requestAnimationFrame(() => {
            scheduled = false;
            void sync();
        });
    }

    async function sync() {
        if (syncing) {
            resyncNeeded = true;
            return;
        }
        syncing = true;
        try {
            do {
                resyncNeeded = false;
                await pushItemsIfChanged();
            } while (resyncNeeded && !stopped);
        } finally {
            syncing = false;
        }
    }

    async function pushItemsIfChanged() {
        if (stopped) return;

        for (const state of states) resolveElement(state);

        const rects = states.map((state) =>
            state.element && state.visible
                ? state.getRect
                    ? state.getRect(state.element)
                    : state.element.getBoundingClientRect()
                : null,
        );
        // The initial push must always happen so the items themselves get set,
        // even if no element has resolved yet
        const changed =
            !hasPushed ||
            forceFramePush ||
            states.some((state, i) => !rectsEqual(rects[i], state.lastRect));
        if (!changed) return;
        forceFramePush = false;

        const scaleFactor = await appWindow.scaleFactor();
        const windowSize = (await appWindow.innerSize()).toLogical(scaleFactor);

        const items: PreviewItem[] = states.map((state, i) => {
            const rect = rects[i];
            state.lastRect = rect;
            return {
                url: state.url,
                srcFrame: rect
                    ? {
                          Window: {
                              windowLabel: appWindow.label,
                              rect: {
                                  x: rect.x,
                                  y: windowSize.height - (rect.y + rect.height),
                                  width: rect.width,
                                  height: rect.height,
                              },
                          },
                      }
                    : undefined,
            };
        });

        hasPushed = true;
        await setPreviewItems(items);
        // We don't need to reload the preview pane since only the source frames are changed
    }

    window.addEventListener("scroll", schedule, true);
    const resizeUnlisten = await appWindow.listen("tauri://resize", () => {
        // A window resize shifts the AppKit-coordinate frames even when the
        // viewport rects are unchanged, so the next push can't be skipped
        forceFramePush = true;
        schedule();
    });

    await sync();

    return () => {
        stopped = true;
        if (scheduled) cancelAnimationFrame(rafId);
        resizeUnlisten();
        window.removeEventListener("scroll", schedule, true);
        mutationObserver.disconnect();
        resizeObserver.disconnect();
        intersectionObserver?.disconnect();
    };
}

/**
 * Takes a DOMRect (usually obtained from {@link Element.getBoundingClientRect}) and converts
 * it to a window-relative source frame.
 *
 * @param window The window this DOMRect is from (usually `getCurrentWindow`)
 * @param rect The input {@link DOMRect}
 * @returns The source frame, with window-relative coordinates converted to AppKit coordinates
 *
 * @see {@link positionAndDimensionsToWindowSourceFrame}
 */
export async function domRectToWindowSourceFrame(
    window: Window,
    rect: DOMRect,
): Promise<SourceFrame> {
    return await positionAndDimensionsToWindowSourceFrame(
        window,
        rect.x,
        rect.y,
        rect.width,
        rect.height,
    );
}

/**
 * Converts viewport position and dimensions to a window-relative source frame.
 *
 * @param window The window that this source frame is relative to (usually `getCurrentWindow`)
 * @param x Viewport x-coordinate
 * @param y Viewport y-coordinate
 * @param width Pixel Width
 * @param height Pixel Height
 * @returns The source frame, with window-relative coordinates converted to AppKit coordinates
 */
export async function positionAndDimensionsToWindowSourceFrame(
    window: Window,
    x: number,
    y: number,
    width: number,
    height: number,
): Promise<SourceFrame> {
    const scaleFactor = await window.scaleFactor();
    const windowSize = (await window.innerSize()).toLogical(scaleFactor);

    return {
        Window: {
            windowLabel: window.label,
            rect: {
                x,
                y: windowSize.height - (y + height),
                width,
                height,
            },
        },
    };
}

/**
 * Converts screen position and dimensions to a screen-relative source frame.
 *
 * @param monitor The monitor (screen) that the coordinates are relative to
 * @param x Screen x-coordinate
 * @param y Screen y-coordinate (relative to top of monitor)
 * @param width Pixel Width
 * @param height Pixel Height
 * @returns The resulting screen-relative source frame
 */
export function positionAndDimensionsToScreenSourceFrame(
    monitor: Monitor,
    x: number,
    y: number,
    width: number,
    height: number,
): SourceFrame {
    const monitorSize = monitor.size.toLogical(monitor.scaleFactor);

    return {
        Screen: {
            x,
            y: monitorSize.height - (y + height),
            width,
            height,
        },
    };
}

/**
 * Sets the preview items displayed in the preview pane, overriding
 * previously set items.
 *
 * **IMPORTANT**: If the preview items' url or order has changed you MUST
 * call {@link reloadPreviewPane} for your changes to take visual effect.
 * If you are only using this to update the source frame of pre-existing items,
 * {@link reloadPreviewPane} is not necessary.
 *
 * @see {@link setPreviewItemsAndShow}
 * @param items The new preview items
 */
export async function setPreviewItems(items: PreviewItem[]) {
    await invoke("plugin:quicklook|set_preview_items", {
        payload: {
            items,
        },
    });
}

/**
 * Sets the preview items displayed in the preview pane, and then
 * subsequently shows the preview pane. You should use
 * {@link setPreviewItems} if the preview pane is already open.
 *
 * @see {@link setPreviewItems}
 * @param items The new preview items
 */
export async function setPreviewItemsAndShow(items: PreviewItem[]) {
    await invoke("plugin:quicklook|set_preview_items_and_show", {
        payload: {
            items,
        },
    });
}

/**
 *
 */
export async function reloadPreviewPane() {
    await invoke("plugin:quicklook|reload_preview_pane");
}

/**
 * Shows the preview pane to the user based on the previously
 * set items.
 *
 * @see {@link hidePreviewPane}
 * @see {@link togglePreviewPane}
 */
export async function showPreviewPane() {
    await invoke("plugin:quicklook|show_preview_pane");
}

/**
 * Hides the preview pane from the user.
 *
 * @see {@link showPreviewPane}
 * @see {@link togglePreviewPane}
 */
export async function hidePreviewPane() {
    await invoke("plugin:quicklook|hide_preview_pane");
}

/**
 * Requests the preview pane to be hidden if its currently
 * visible, and vice versa if its currently shown.
 *
 * @see {@link showPreviewPane}
 * @see {@link hidePreviewPane}
 */
export async function togglePreviewPane() {
    await invoke("plugin:quicklook|toggle_preview_pane");
}

export * from "./types";
