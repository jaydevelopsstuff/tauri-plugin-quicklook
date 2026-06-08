<script lang="ts">
    import { convertFileSrc } from "@tauri-apps/api/core";
    import { open } from "@tauri-apps/plugin-dialog";
    import {
        togglePreviewPane,
        setAndTrackPreviewElements,
    } from "tauri-plugin-quicklook";

    document.addEventListener("keydown", async (event) => {
        if (event.key === " ") {
            event.preventDefault();
            await togglePreviewPane();
        }
    });

    let imagePaths = $state([]);

    let prevUnlisten: () => void = () => {};
    let prevInterval: number | null = null;

    async function chooseImages() {
        if (prevInterval) clearInterval(prevInterval);
        prevUnlisten();

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

        // Set our preview items and track the position of their elements once they've
        // been established on the DOM
        requestAnimationFrame(
            async () =>
                (prevUnlisten = await setAndTrackPreviewElements(
                    await Promise.all(
                        imagePaths.map(async (path) => ({
                            url: `file://${path}`,
                            element: document.getElementById(`img:${path}`),
                        })),
                    ),
                )),
        );

        // Move the images around randomly to demonstrate that `setAndTrackPreviewElements`
        // does indeed track elements and update their source frames.
        prevInterval = setInterval(() => {
            for (const path of imagePaths) {
                document.getElementById(`img:${path}`).style.top =
                    `${Math.round(Math.random() * 150)}px`;
            }
        }, 4000);
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
        position: relative;
        max-height: 24rem;
    }
    button {
        height: 30px;
    }
</style>
