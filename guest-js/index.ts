import { invoke } from "@tauri-apps/api/core";
import { currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Takes a DOMRect (usually obtained from {@linkcode Element.getBoundingClientRect}) and converts
 * it to a screen source frame using the current window and monitor.
 *
 * @param rect The input {@linkcode DOMRect}
 * @returns The source frame, with coordinates converted to AppKit screen space
 *
 * @see {@linkcode positionAndDimensionsToScreenSourceFrame}
 */
export async function domRectToScreenSourceFrame(
    rect: DOMRect,
): Promise<SourceFrame> {
    return await positionAndDimensionsToScreenSourceFrame(
        rect.x,
        rect.y,
        rect.width,
        rect.height,
    );
}

/**
 * Converts viewport position and dimensions to a screen source frame for the current window
 * and monitor.
 *
 * @param x Viewport x-coordinate
 * @param y Viewport y-coordinate
 * @param width Pixel Width
 * @param height Pixel Height
 * @returns The source frame, with coordinates converted to AppKit screen space
 */
export async function positionAndDimensionsToScreenSourceFrame(
    x: number,
    y: number,
    width: number,
    height: number,
): Promise<SourceFrame> {
    const scaleFactor = await getCurrentWindow().scaleFactor();
    const monitorSize = (await currentMonitor())!.size.toLogical(scaleFactor);
    const windowPosOut = (await getCurrentWindow().innerPosition()).toLogical(
        scaleFactor,
    );

    return {
        x: windowPosOut.x + x,
        y: monitorSize.height - (windowPosOut.y + y + height),
        width,
        height,
    };
}

/**
 * Sets the preview items displayed in the preview pane, overriding
 * previously set items.
 *
 * This works on the fly—that is, if the user already has the preview
 * pane open and you update the items through this method, those changes
 * will automatically be visually reflected.
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
 * subsequently shows the preview pane.
 *
 * This works on the fly—that is, if the user already has the preview
 * pane open and you update the items through this method, those changes
 * will automatically be visually reflected.
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
    return await invoke("plugin:quicklook|show_preview_pane");
}

/**
 * Requests the preview pane to be hidden if its currently
 * visible, and vice versa if its currently shown.
 *
 * @see {@linkcode showPreviewPane}
 * @see {@linkcode hidePreviewPane}
 */
async function togglePreviewPane() {
    return await invoke("plugin:quicklook|toggle_preview_pane");
}

/**
 * Representation of a preview item that can be shown in a
 * quicklook preview pane.
 */
export declare type PreviewItem = {
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

/**
 * Describes a frame on the screen where a preview item originates from.
 * Coordinates are in screen space (NOT the window).
 *
 * In AppKit/Cocoa, coordinates are relative to the bottom-left corner
 * of the screen, so you must take that into account when calculating
 * your frame's `y` position.
 *
 * @see {@linkcode domRectToScreenSourceFrame}
 * @see {@linkcode positionAndDimensionsToScreenSourceFrame}
 */
export declare type SourceFrame = {
    x: number;
    y: number;
    width: number;
    height: number;
};
