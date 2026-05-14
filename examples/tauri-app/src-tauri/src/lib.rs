use parking_lot::deadlock;
use std::thread;
use std::time::Duration;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_quicklook::init())
        .run(tauri::generate_context!())
        .unwrap();
}
