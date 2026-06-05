use tauri::{command, AppHandle, Runtime};

use crate::models::*;
use crate::QuicklookExt;
use crate::Result;

#[command(async)]
pub(crate) fn set_preview_items<R: Runtime>(
    app: AppHandle<R>,
    payload: SetPreviewPaneItemsRequest,
) -> Result<()> {
    app.quicklook().set_items(payload.items)
}

#[command(async)]
pub(crate) fn set_preview_items_and_show<R: Runtime>(
    app: AppHandle<R>,
    payload: SetPreviewPaneItemsRequest,
) -> Result<()> {
    app.quicklook().set_items(payload.items)?;
    app.quicklook().queue_show()?;

    Ok(())
}

#[command(async)]
pub(crate) fn reload_preview_pane<R: Runtime>(app: AppHandle<R>) -> Result<()> {
    app.quicklook().queue_reload_if_dirty()
}

#[command(async)]
pub(crate) fn show_preview_pane<R: Runtime>(app: AppHandle<R>) -> Result<()> {
    app.quicklook().queue_show()
}

#[command(async)]
pub(crate) fn hide_preview_pane<R: Runtime>(app: AppHandle<R>) -> Result<()> {
    app.quicklook().queue_hide()
}

#[command(async)]
pub(crate) fn toggle_preview_pane<R: Runtime>(app: AppHandle<R>) -> Result<()> {
    app.quicklook().queue_toggle_visible()
}
