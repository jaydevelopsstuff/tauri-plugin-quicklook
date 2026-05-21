use quicklook::SourceFrame;
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

impl PreviewItem {
    pub fn new(url: impl Into<String>, src_frame: Option<SourceFrame>) -> Self {
        Self {
            url: url.into(),
            src_frame,
        }
    }
}

impl TryFrom<quicklook::PreviewItem> for PreviewItem {
    type Error = &'static str;

    fn try_from(value: quicklook::PreviewItem) -> Result<Self, Self::Error> {
        Ok(Self {
            url: value
                .absolute_url_string()
                .ok_or("Failed to retrieve absolute url string")?,
            src_frame: value.source_frame().cloned(),
        })
    }
}
