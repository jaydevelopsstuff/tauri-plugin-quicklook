# Tauri Plugin Quicklook

This plugin provides APIs to display and manage the macOS 
[QuickLookUI Preview Pane](https://developer.apple.com/documentation/quicklookui/qlpreviewpanel).

https://github.com/user-attachments/assets/6889cb6e-1d5c-4dcd-8d5d-4a8f5bc652d2

| Platform | Supported |
| -------- | --------- |
| Linux    | x         |
| Windows  | x         |
| macOS    | ✓         |
| Android  | x         |
| iOS      | x         |

Under the hood this crate makes use of the [`quicklook`](https://crates.io/crates/quicklook) crate,
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

```typescript
import { domRectToWindowSourceFrame, setPreviewItems } from "tauri-plugin-quicklook";

// This function could be called when a user clicks a button or presses the spacebar
// 
// This is naive, read below this code and see `setAndTrackPreviewElements`
async function displayPreviewPane() {
    const imgFilePath = "/path/to/example-image/image.png";
    const imgElement = document.getElementById("example-image");
    
    await setPreviewItems([
        {
            url: `file://${imgFilePath}`,
            srcFrame: await domRectToWindowSourceFrame(
                getCurrentWindow(),
                imgElement.getBoundingClientRect()
            )
        }
    ])
}
```

Note: This is a naive implementation that assumes the user won't scroll, resize the window, and that the
preview items won't change while the preview pane is open. For a robust example covering edge
cases like the aforementioned, check out [`examples/tauri-app`](./examples/tauri-app).
