import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, Monitor, Window } from "@tauri-apps/api/window";

/**
 * Takes a DOMRect (usually obtained from {@linkcode Element.getBoundingClientRect}) and converts
 * it to a window-relative source frame.
 *
 * @param window The window this DOMRect is from (usually `getCurrentWindow`)
 * @param rect The input {@linkcode DOMRect}
 * @returns The source frame, with window-relative coordinates converted to AppKit coordinates
 *
 * @see {@linkcode positionAndDimensionsToWindowSourceFrame}
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
 * call {@linkcode reloadPreviewPane} for your changes to take visual effect.
 * If you are only using this to update the source frame of pre-existing items,
 * {@linkcode reloadPreviewPane} is not necessary.
 *
 * @see {@linkcode setPreviewItemsAndShow}
 * @param items The new preview items
 */
export async function setPreviewItems(items: PreviewItem[]) {
    return await invoke("plugin:quicklook|set_preview_items", {
        payload: {
            items,
        },
    });
}

/**
 * Sets the preview items displayed in the preview pane, and then
 * subsequently shows the preview pane. You should use
 * {@linkcode setPreviewItems} if the preview pane is already open.
 *
 * @see {@linkcode setPreviewItems}
 * @param items The new preview items
 */
export async function setPreviewItemsAndShow(items: PreviewItem[]) {
    return await invoke("plugin:quicklook|set_preview_items_and_show", {
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
 * @see {@linkcode hidePreviewPane}
 * @see {@linkcode togglePreviewPane}
 */
export async function showPreviewPane() {
    return await invoke("plugin:quicklook|show_preview_pane");
}

/**
 * Hides the preview pane from the user.
 *
 * @see {@linkcode showPreviewPane}
 * @see {@linkcode togglePreviewPane}
 */
export async function hidePreviewPane() {
    return await invoke("plugin:quicklook|hide_preview_pane");
}

/**
 * Requests the preview pane to be hidden if its currently
 * visible, and vice versa if its currently shown.
 *
 * @see {@linkcode showPreviewPane}
 * @see {@linkcode hidePreviewPane}
 */
export async function togglePreviewPane() {
    return await invoke("plugin:quicklook|toggle_preview_pane");
}

/**
 * Representation of a preview item that can be shown in a
 * quicklook preview pane.
 */
export type PreviewItem = {
    /**
     * The required url for the preview item. Must be valid.
     *
     * File urls should begin with `file://`
     */
    url: string;
    /**
     * Optional source frame for the preview item. If this is specified
     * the preview pane will have zoom in and out animations on show
     * and hide—without it it will just fade in and out.
     */
    srcFrame?: SourceFrame;
};

/** Describes a source frame where a preview item originates from. You should use the provided helper constructor
 * functions to instantiate a source frame rather than manually creating one, though you can if you want surgical
 * control.
 *
 * This is used when the preview pane is opened or close, where if a source frame is specified for the currently
 * viewed item the pane will animate the pane through scaling it in or out to make it appear as if the preview pane
 * is spawning from or "coming out of" the source frame.
 *
 * @see {@linkcode domRectToWindowSourceFrame}
 * @see {@linkcode positionAndDimensionsToWindowSourceFrame}
 * @see {@linkcode positionAndDimensionsToScreenSourceFrame}
 */
export type SourceFrame =
    | { Screen: SourceFrameDimensions; Window?: never }
    | {
          Window: { windowLabel: string; rect: SourceFrameDimensions };
          Screen?: never;
      };

/**
 * Describes a frame with coordinates relative either to the entire screen or a window
 * where the preview item originates from. Coordinates are in logical pixels.
 *
 * In AppKit/Cocoa, coordinates are relative to the bottom-left corner
 * of the window or screen, so you must take that into account when calculating
 * your frame's `y` position. Helper constructor functions are provided in the library
 * to help with this.
 *
 * @see {@linkcode domRectToWindowSourceFrame}
 * @see {@linkcode positionAndDimensionsToWindowSourceFrame}
 * @see {@linkcode positionAndDimensionsToScreenSourceFrame}
 */
export type SourceFrameDimensions = {
    x: number;
    y: number;
    width: number;
    height: number;
};
