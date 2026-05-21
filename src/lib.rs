use std::cell::OnceCell;

use quicklook::QuickLookPanel;
use tauri::{
    plugin::{Builder, TauriPlugin},
    Manager, Runtime,
};

pub use models::*;

#[cfg(desktop)]
mod desktop;

mod commands;
mod error;
mod models;

pub use error::{Error, Result};

#[cfg(desktop)]
use desktop::Quicklook;

thread_local! {
    pub(crate) static PANEL: OnceCell<QuickLookPanel> = OnceCell::new();
}

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the quicklook APIs.
pub trait QuicklookExt<R: Runtime> {
    fn quicklook(&self) -> &Quicklook<R>;
}

impl<R: Runtime, T: Manager<R>> crate::QuicklookExt<R> for T {
    fn quicklook(&self) -> &Quicklook<R> {
        self.state::<Quicklook<R>>().inner()
    }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("quicklook")
        .invoke_handler(tauri::generate_handler![
            commands::set_preview_items,
            commands::set_preview_items_and_show,
            commands::show_preview_pane,
            commands::hide_preview_pane,
            commands::toggle_preview_pane
        ])
        .setup(|app, api| {
            let panel = QuickLookPanel::shared().unwrap();

            #[cfg(desktop)]
            let quicklook = desktop::init(app, panel.handle(), api)?;
            app.manage(quicklook);

            PANEL.with(|p| {
                p.set(panel).unwrap_or_else(|_| panic!());
            });

            Ok(())
        })
        .build()
}
