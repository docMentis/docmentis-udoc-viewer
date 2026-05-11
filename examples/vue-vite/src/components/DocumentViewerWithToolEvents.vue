<template>
  <div class="demo">
    <div class="toolbar">
      <span class="tool-info">Tool: {{ currentToolDisplay }}</span>
      <div class="buttons">
        <button 
          v-for="btn in toolButtons" 
          :key="btn.label"
          @click="setTool(btn.tool)"
          :class="{ active: isToolActive(btn.tool) }"
        >
          {{ btn.label }}
        </button>
      </div>
    </div>
    <div ref="containerRef" class="viewer"></div>
    <div class="log">
      <h3>Events</h3>
      <div v-for="(event, i) in events" :key="i" class="event">{{ event }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { UDocClient, type ActiveTool } from "@docmentis/udoc-viewer";

const props = defineProps<{ url: string }>();

const containerRef = ref<HTMLDivElement>();
const currentTool = ref<ActiveTool>({ kind: "pointer" });
const events = ref<string[]>([]);

let client: any = null;
let viewer: any = null;

const toolButtons = [
  { label: "Pointer (V)", tool: { kind: "pointer" as const } },
  { label: "Hand (H)", tool: { kind: "hand" as const } },
  { label: "Zoom (Z)", tool: { kind: "zoom" as const } },
  { label: "Rectangle (R)", tool: { kind: "annotate" as const, sub: "rectangle" as const } },
  { label: "Freehand (F)", tool: { kind: "annotate" as const, sub: "freehand" as const } },
  { label: "Highlight (L)", tool: { kind: "markup" as const, sub: "highlight" as const } },
];

const currentToolDisplay = computed(() => {
  const t = currentTool.value;
  return t.kind === "annotate" || t.kind === "markup" ? `${t.kind}:${t.sub}` : t.kind;
});

function isToolActive(tool: ActiveTool) {
  const t = currentTool.value;
  return t.kind === tool.kind && ("sub" in t ? t.sub === (tool as any).sub : true);
}

function setTool(tool: ActiveTool) {
  viewer?.setActiveTool(tool);
}

function log(msg: string) {
  events.value.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
  if (events.value.length > 10) events.value.pop();
}

async function init() {
  if (!containerRef.value) return;
  
  try {
    client = await UDocClient.create();
    viewer = await client.createViewer({ container: containerRef.value });
    await viewer.load(props.url);
    
    viewer.on("tool:change", ({ tool, previousTool }: any) => {
      currentTool.value = tool;
      log(`${previousTool.kind} → ${tool.kind}`);
    });
    
    log("Loaded");
  } catch (error) {
    log(`Error: ${error}`);
  }
}

function setupShortcuts() {
  const map: Record<string, ActiveTool> = {
    v: { kind: "pointer" },
    h: { kind: "hand" },
    z: { kind: "zoom" },
    r: { kind: "annotate", sub: "rectangle" },
    f: { kind: "annotate", sub: "freehand" },
    l: { kind: "markup", sub: "highlight" },
  };

  const handler = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const tool = map[e.key.toLowerCase()];
    if (tool) {
      e.preventDefault();
      setTool(tool);
    }
  };

  document.addEventListener("keydown", handler);
  return () => document.removeEventListener("keydown", handler);
}

onMounted(() => {
  init();
  const cleanup = setupShortcuts();
  onBeforeUnmount(cleanup);
});

onBeforeUnmount(() => {
  viewer?.destroy();
  client?.destroy();
});
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.toolbar {
  padding: 12px;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
  display: flex;
  align-items: center;
  gap: 20px;
}

.tool-info {
  font-size: 14px;
  font-weight: 500;
}

.buttons {
  display: flex;
  gap: 8px;
}

.buttons button {
  padding: 8px 16px;
  border: 1px solid #ccc;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.buttons button:hover {
  background: #e8e8e8;
}

.buttons button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.viewer {
  flex: 1;
  width: 100%;
}

.log {
  height: 200px;
  padding: 12px;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: monospace;
  font-size: 12px;
  overflow-y: auto;
}

.log h3 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #4ec9b0;
}

.event {
  padding: 4px 8px;
  background: #2d2d2d;
  border-radius: 2px;
  margin-bottom: 4px;
}
</style>
