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
 * @see {@link domRectToWindowSourceFrame}
 * @see {@link positionAndDimensionsToWindowSourceFrame}
 * @see {@link positionAndDimensionsToScreenSourceFrame}
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
 * @see {@link domRectToWindowSourceFrame}
 * @see {@link positionAndDimensionsToWindowSourceFrame}
 * @see {@link positionAndDimensionsToScreenSourceFrame}
 */
export type SourceFrameDimensions = {
    x: number;
    y: number;
    width: number;
    height: number;
};
