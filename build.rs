const COMMANDS: &[&str] = &[
    "set_preview_items",
    "set_preview_items_and_show",
    "show_preview_pane",
    "hide_preview_pane",
    "toggle_preview_pane",
];

fn main() {
    tauri_plugin::Builder::new(COMMANDS).build();
}
