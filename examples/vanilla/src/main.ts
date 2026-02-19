import { UDocClient } from "@docmentis/udoc-viewer";

async function init() {
  const client = await UDocClient.create();

  const viewer = await client.createViewer({
    container: "#viewer",
  });

  await viewer.load("/sample.pdf");
}

init();
