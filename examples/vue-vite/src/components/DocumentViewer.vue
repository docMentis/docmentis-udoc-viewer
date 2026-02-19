<template>
  <div ref="containerRef" style="width: 100%; height: 100vh"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { UDocClient } from "@docmentis/udoc-viewer";

const props = defineProps<{
  url: string;
}>();

const containerRef = ref<HTMLDivElement>();
let client: any = null;
let viewer: any = null;

async function initViewer() {
  if (!containerRef.value) return;

  try {
    client = await UDocClient.create();

    viewer = await client.createViewer({
      container: containerRef.value,
    });

    await viewer.load(props.url);
  } catch (error) {
    console.error("Failed to initialize UDoc Viewer:", error);
  }
}

onMounted(() => {
  initViewer();
});

onBeforeUnmount(() => {
  viewer?.destroy();
  client?.destroy();
});

watch(
  () => props.url,
  async (newUrl) => {
    if (viewer) {
      await viewer.load(newUrl);
    }
  },
);
</script>
