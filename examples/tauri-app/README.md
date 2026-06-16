# tauri-plugin-quicklook Demo App
This is a very simple demo of how `tauri-plugin-quicklook`'s TypeScript API can be used
to dynamically update preview items (based on images selected from the filesystem by the user),
and toggle the preview pane's visibility using the Spacebar (similar functionality to macOS's Finder).

### Usage
- Run `pnpm install && pnpm build` in the Repo Root to Build the Library
- Run `pnpm install` in this directory
- Run `npm/pnpm/yarn/cargo tauri dev`
- Click `Choose Images...`, select files, and confirm
- Press the Spacebar to open/close the preview pane
