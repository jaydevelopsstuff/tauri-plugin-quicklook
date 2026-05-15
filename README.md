# Tauri Plugin Quicklook

This plugin provides APIs to display and manage the macOS 
[QuickLookUI Preview Pane](https://developer.apple.com/documentation/quicklookui/qlpreviewpanel).

| Platform | Supported |
| -------- | --------- |
| Linux    | x         |
| Windows  | x         |
| macOS    | ✓         |
| Android  | x         |
| iOS      | x         |

At the lower level, this crate makes use of the [`quicklook`](https://crates.io/crates/quicklook) crate,
which provides a general purpose easy-to-use Rust wrapper of QuickLookUI. If you need to access QuickLookUI
APIs within a **non-Tauri** Rust application, you should probably use `quicklook`.

## Install
You must install the core plugin by adding the following to your Cargo.toml file:

`src-tauri/Cargo.toml`
```toml
[dependencies]
tauri-plugin-quicklook = "0.1.0"
```

You also can (and probably want to) install the JavaScript guest bindings using your preferred
JavaScript package manager:
```sh
pnpm add tauri-plugin-quicklook
# or
npm add tauri-plugin-quicklook
# or
yarn add tauri-plugin-quicklook
```

## Usage
First you need to register the core plugin with Tauri:

`src-tauri/src/lib.rs`
```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_quicklook::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

Afterwards all the plugin's APIs are available through the JavaScript guest bindings.
