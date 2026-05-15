<script lang="ts">
    import { convertFileSrc } from "@tauri-apps/api/core";
    import { open } from "@tauri-apps/plugin-dialog";
    import {
        domRectToScreenSourceFrame,
        setPreviewItems,
        showPreviewPane,
    } from "tauri-plugin-quicklook";

    document.addEventListener("keydown", async (event) => {
        if (event.key === " ") {
            event.preventDefault();
            await showPreviewPane();
        }
    });

    document.addEventListener("scroll", () => {
        syncPreviewItems();
    });

    let imagePaths = $state([]);

    async function chooseImages() {
        imagePaths = await open({
            multiple: true,
            directory: false,
            filters: [
                {
                    name: "Images Only",
                    extensions: ["png", "jpg", "jpeg"],
                },
            ],
        });
        // Give the DOM time to calculate image dimensions
        // FIXME: Kinda janky
        setTimeout(syncPreviewItems, 50);
    }

    async function syncPreviewItems() {
        await setPreviewItems(
            await Promise.all(
                imagePaths.map(async (path) => ({
                    url: `file://${path}`,
                    srcFrame: await domRectToScreenSourceFrame(
                        document
                            .getElementById(`img:${path}`)
                            .getBoundingClientRect(),
                    ),
                })),
            ),
        );
    }
</script>

<main class="container">
    <button onclick={chooseImages}>Choose Images...</button>
    <span style="color: white; font-weight: bold;">
        Press the Spacebar to Toggle the Preview Pane
    </span>
    <div class="img-container">
        {#each imagePaths as path, i}
            <img
                src={convertFileSrc(path)}
                alt={`Img ${i}`}
                id={`img:${path}`}
            />
        {/each}
    </div>
</main>

<style>
    .img-container {
        display: flex;
        flex-wrap: wrap;
    }
    .container {
        display: flex;
        flex-direction: column;
    }
    img {
        aspect-ratio: auto;
        max-width: 30rem;
    }
    button {
        height: 30px;
    }
</style>
