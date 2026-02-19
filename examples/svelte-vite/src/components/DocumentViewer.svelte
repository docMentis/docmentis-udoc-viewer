<script lang="ts">
  import { onMount } from "svelte";
  import { UDocClient } from "@docmentis/udoc-viewer";

  let { url }: { url: string } = $props();

  let containerEl: HTMLDivElement;
  let client: any = null;
  let viewer: any = null;

  onMount(() => {
    let active = true;

    async function initViewer() {
      try {
        client = await UDocClient.create();

        if (!active) return;

        viewer = await client.createViewer({
          container: containerEl,
        });

        if (!active) return;

        await viewer.load(url);
      } catch (error) {
        if (active) {
          console.error("Failed to initialize UDoc Viewer:", error);
        }
      }
    }

    initViewer();

    return () => {
      active = false;
      viewer?.destroy();
      client?.destroy();
    };
  });
</script>

<div bind:this={containerEl} style="width: 100%; height: 100vh"></div>
