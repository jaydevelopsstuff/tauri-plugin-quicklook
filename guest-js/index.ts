import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, Monitor, Window } from "@tauri-apps/api/window";
import { observeElementRect } from "./utils";
import { PreviewItem, SourceFrame } from "./types";

/**
 * Takes an input list of preview item URLs and the elements that represent them and
 * creates listeners to track changes in their position/size, track user scroll anywhere
 * in the viewport, and changes in the size of the window—refetching the bounding rect of
 * elements when (a) listener(s) fires and updating the source frames of preview items to
 * reflect the change.
 *
 * This is a catch-all use case when your preview items might move around and/or the user might
 * scroll or resize the window while the preview pane is open. If you don't need this level of
 * dynamic coverage you can just use {@link setPreviewItems}.
 *
 * @param elementItems The elements to track/update and their URLs
 * @returns Unlistener callback
 */
export async function setAndTrackPreviewElements(
    elementItems: { url: string; element: Element }[],
) {
    async function syncPreviewItems() {
        const items = await Promise.all(
            elementItems.map(async (item) => ({
                url: item.url,
                srcFrame: await domRectToWindowSourceFrame(
                    getCurrentWindow(),
                    item.element.getBoundingClientRect(),
                ),
            })),
        );
        await setPreviewItems(items);
        // We don't need to reload the preview pane since only the source frames are changed
        return items;
    }

    const previousPreviewItems = await syncPreviewItems();

    const resizeUnlisten = await getCurrentWindow().listen(
        "tauri://resize",
        syncPreviewItems,
    );
    window.addEventListener("scroll", syncPreviewItems, true);

    const observorCleanups = elementItems.map((item, i) =>
        observeElementRect(item.element, async () => {
            previousPreviewItems[i].srcFrame = await domRectToWindowSourceFrame(
                getCurrentWindow(),
                item.element.getBoundingClientRect(),
            );
            await setPreviewItems(previousPreviewItems);
            // We don't need to reload the preview pane since only the source frame is changed
        }),
    );

    return () => {
        resizeUnlisten();
        window.removeEventListener("scroll", syncPreviewItems);
        observorCleanups.forEach((c) => c());
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
