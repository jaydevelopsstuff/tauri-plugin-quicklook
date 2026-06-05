use quicklook::SourceFrameRect;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SetPreviewPaneItemsRequest {
    pub items: Vec<PreviewItem>,
}

/// A serializable and deserializable preview item for Tauri commands
/// and method parameters.
///
/// If no `src_frame` is specified, the preview pane will use a fade in/out animation rather than a zoom in/out animation.
///
/// ## See Also
/// - [`quicklook::PreviewItem`]
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewItem {
    pub url: String,
    pub src_frame: Option<SourceFrame>,
}

/// Describes a source frame where a preview item originates from.
///
/// For more detailed info, see [`quicklook::SourceFrame`]'s docs.
#[derive(Debug, Serialize, Deserialize)]
pub enum SourceFrame {
    /// A source frame with coordinates relative to the screen/monitor. This is intended for
    /// users with unusual use-cases or that prefer more fine-grained control over coordinates.
    ///
    /// For more detailed info, see [`quicklook::SourceFrame::Screen`]'s docs.
    Screen(SourceFrameRect),

    /// A source frame with coordinates relative to a specified window. This is preferred over [`SourceFrame::Screen`]
    /// in most use cases.
    ///
    /// For more detailed info, such as coordinate validity lifetime considerations, see [`quicklook::SourceFrame::Window`]'s
    /// docs.
    Window {
        #[serde(rename = "windowLabel")]
        window_label: String,
        rect: SourceFrameRect,
    },
}

impl SourceFrame {
    /// Creates a [`SourceFrame::Screen`] based on the input coordinates and dimensions. `x` and `y`
    /// coordinates are relative to the bottom left corner of the screen.
    pub fn screen(x: f64, y: f64, width: f64, height: f64) -> Self {
        Self::Screen(SourceFrameRect {
            x,
            y,
            width,
            height,
        })
    }

    /// Creates a [`SourceFrame::Window`] based on the input coordinates, dimensions and provided window.
    /// `x` and `y` coordinates are relative to the bottom left corner of the window.
    ///
    /// ## See Also
    /// - [`SourceFrame::Window`] for more details
    pub fn window(window: &tauri::Window, x: f64, y: f64, width: f64, height: f64) -> Self {
        Self::Window {
            window_label: window.label().into(),
            rect: SourceFrameRect {
                x,
                y,
                width,
                height,
            },
        }
    }
}

impl PreviewItem {
    pub fn new(url: impl Into<String>, src_frame: Option<SourceFrame>) -> Self {
        Self {
            url: url.into(),
            src_frame,
        }
    }
}
