use crate::Result;
use quicklook::QuickLookHandle;
use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Manager, Runtime};

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
    ///
    /// **IMPORTANT**: If you change the URLs or order of the items you MUST
    /// call [`Quicklook::queue_reload_if_dirty`] after for your changes to take visual effect.
    /// However, if you are only updating the source frames of pre-existing items you
    /// can safely avoid reloading.
    pub fn set_items(&self, items: Vec<PreviewItem>) -> Result<()> {
        self.set_items_raw(
            items
                .into_iter()
                .map(|i| {
                    let frame = match i.src_frame {
                        Some(SourceFrame::Screen(rect)) => {
                            Some(quicklook::SourceFrame::Screen(rect))
                        }
                        Some(SourceFrame::Window { window_label, rect }) => self
                            .app_handle
                            .get_webview_window(&window_label)
                            .and_then(|w| {
                                quicklook::SourceFrame::window(
                                    &w,
                                    rect.x,
                                    rect.y,
                                    rect.width,
                                    rect.height,
                                )
                            }),
                        None => None,
                    };

                    quicklook::PreviewItem::from_url_string(i.url, frame)
                        .ok_or(Error::NSURLMalformedURLString)
                })
                .collect::<Result<Vec<quicklook::PreviewItem>>>()?,
        )?;

        Ok(())
    }

    /// Sets the preview pane's items using [`quicklook::PreviewItem`] and reloads
    /// the pane. This is useful if you want to manually initialize `NSURL`s yourself.
    ///
    /// **IMPORTANT**: If you change the URLs or order of the items you MUST
    /// call [`Quicklook::queue_reload_if_dirty`] after for your changes to take visual effect.
    /// However, if you are only updating the source frames of pre-existing items you
    /// can safely avoid reloading.
    ///
    /// ## See Also
    /// - [`quicklook::PreviewItem`]
    /// - [`NSURL`](https://docs.rs/objc2-foundation/latest/objc2_foundation/struct.NSURL.html)
    pub fn set_items_raw(&self, items: Vec<quicklook::PreviewItem>) -> Result<()> {
        self.quicklook_handle.set_items(items);
        Ok(())
    }

    /// Queues a panel reload that will be executed if the list of items has
    /// been modified.
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
