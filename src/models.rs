use quicklook::SourceFrame;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SetPreviewPaneItemsRequest {
    pub items: Vec<PreviewItem>,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewItem {
    pub url: String,
    pub src_frame: Option<SourceFrame>,
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
