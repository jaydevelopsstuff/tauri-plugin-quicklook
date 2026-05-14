use crate::Result;
use quicklook::QuickLookHandle;
use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::{models::*, Error, PANEL};

pub fn init<R: Runtime, C: DeserializeOwned>(
    app: &AppHandle<R>,
    quicklook_handle: QuickLookHandle,
    _api: PluginApi<R, C>,
) -> crate::Result<Quicklook<R>> {
    Ok(Quicklook {
        app_handle: app.clone(),
        quicklook_handle,
    })
}

/// Access to the quicklook APIs.
pub struct Quicklook<R: Runtime> {
    app_handle: AppHandle<R>,
    quicklook_handle: QuickLookHandle,
}

impl<R: Runtime> Quicklook<R> {
    /// Sets the preview pane's items and reloads the pane.
    pub fn set_items(&self, items: Vec<PreviewItem>) -> Result<()> {
        self.set_items_raw(
            items
                .into_iter()
                .map(|i| {
                    quicklook::PreviewItem::from_url_string(i.url, i.src_frame)
                        .ok_or(Error::NSURLMalformedURLString)
                })
                .collect::<Result<Vec<quicklook::PreviewItem>>>()?,
        )?;

        Ok(())
    }

    /// Sets the preview pane's items using [`quicklook::PreviewItem`] and reloads
    /// the pane. This is useful if you want to manually initialize `NSURL`s yourself.
    ///
    /// ## See Also
    /// - [`NSURL`](https://docs.rs/objc2-foundation/latest/objc2_foundation/struct.NSURL.html)
    pub fn set_items_raw(&self, items: Vec<quicklook::PreviewItem>) -> Result<()> {
        self.quicklook_handle.set_items(items);
        self.queue_reload_if_dirty()?;
        Ok(())
    }

    /// Queues a panel reload that will be executed if the list of items has
    /// been modified.
    ///
    /// It is very unlikely you will need to call this method yourself, as all
    /// other methods that mutate the preview items automatically call this.
    pub fn queue_reload_if_dirty(&self) -> Result<()> {
        self.app_handle
            .run_on_main_thread(|| {
                PANEL.with(|p| {
                    // SAFETY: OnceCell is initialized in `setup`
                    p.get().unwrap().reload_if_dirty();
                });
            })
            .map_err(|_| Error::MainThreadDispatchFailed)?;
        Ok(())
    }

    /// Queues the preview panel to be shown.
    pub fn queue_show(&self) -> Result<()> {
        self.app_handle
            .run_on_main_thread(|| {
                PANEL.with(|p| {
                    p.get().unwrap().show();
                })
            })
            .map_err(|_| Error::MainThreadDispatchFailed)?;
        Ok(())
    }

    /// Queues the preview panel to be hidden.
    pub fn queue_hide(&self) -> Result<()> {
        self.app_handle
            .run_on_main_thread(|| {
                PANEL.with(|p| {
                    p.get().unwrap().hide();
                })
            })
            .map_err(|_| Error::MainThreadDispatchFailed)?;
        Ok(())
    }

    /// Queues the preview pane to be hidden if its currently
    /// visible, and vice versa if its currently shown.
    pub fn queue_toggle_visible(&self) -> Result<()> {
        self.app_handle
            .run_on_main_thread(|| {
                PANEL.with(|p| {
                    p.get().unwrap().toggle_visible();
                })
            })
            .map_err(|_| Error::MainThreadDispatchFailed)?;
        Ok(())
    }
}
