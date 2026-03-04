<template>
  <main>
    <DocumentViewer url="/sample.pdf" />
  </main>
</template>

<script setup lang="ts">
useHead({
  title: "UDoc Viewer - Nuxt Example",
});
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

main {
  width: 100%;
  height: 100vh;
}
</style>
