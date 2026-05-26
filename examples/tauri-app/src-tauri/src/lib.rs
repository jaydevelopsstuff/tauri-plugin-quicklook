use std::thread;
use std::time::Duration;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_quicklook::init())
        .run(tauri::generate_context!())
        .unwrap();
}
