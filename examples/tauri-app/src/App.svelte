<script lang="ts">
    import { convertFileSrc } from "@tauri-apps/api/core";
    import { getCurrentWindow, PhysicalPosition } from "@tauri-apps/api/window";
    import { open } from "@tauri-apps/plugin-dialog";
    import { onMount } from "svelte";
    import {
        domRectToWindowSourceFrame,
        reloadPreviewPane,
        setPreviewItems,
        togglePreviewPane,
    } from "tauri-plugin-quicklook";

    document.addEventListener("keydown", async (event) => {
        if (event.key === " ") {
            event.preventDefault();
            await togglePreviewPane();
        }
    });

    document.addEventListener("scroll", syncPreviewItems);

    onMount(async () => {
        getCurrentWindow().listen("tauri://resize", syncPreviewItems);
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
        setTimeout(async () => {
            await syncPreviewItems();
            await reloadPreviewPane();
        }, 50);
    }

    async function syncPreviewItems() {
        const items = await Promise.all(
            imagePaths.map(async (path) => ({
                url: `file://${path}`,
                srcFrame: await domRectToWindowSourceFrame(
                    getCurrentWindow(),
                    document
                        .getElementById(`img:${path}`)
                        .getBoundingClientRect(),
                ),
            })),
        );
        await setPreviewItems(items);
    }
</script>

<main class="container">
    <button onclick={chooseImages}>Choose Images...</button>
    <span style="color: white; font-weight: bold;">
        Press the Spacebar to Toggle the Preview Pane
    </span>
    <div class="img-container">
        {#each imagePaths as path, i}
            <div>
                <img
                    src={convertFileSrc(path)}
                    alt={`Img ${i}`}
                    id={`img:${path}`}
                />
            </div>
        {/each}
    </div>
</main>

<style>
    .img-container {
        width: 100%;
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
    }
    .container {
        display: flex;
        flex-direction: column;
    }
    div {
        object-fit: contain;
    }
    img {
        max-height: 24rem;
    }
    button {
        height: 30px;
    }
</style>
