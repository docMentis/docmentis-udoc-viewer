/**
 * UDoc Viewer — WordPress frontend initializer.
 *
 * Dynamically imports the ESM viewer SDK and initializes all
 * [data-udoc-config] containers on the page.
 */

const config = window.udocViewerConfig || {};

async function initViewers() {
    const containers = document.querySelectorAll("[data-udoc-config]");
    if (!containers.length) return;

    let UDocClient;
    try {
        ({ UDocClient } = await import(config.esmUrl));
    } catch (err) {
        console.error("[UDoc Viewer] Failed to load viewer SDK:", err);
        for (const el of containers) {
            el.textContent = "Failed to load document viewer.";
        }
        return;
    }

    for (const el of containers) {
        try {
            const opts = JSON.parse(el.getAttribute("data-udoc-config"));
            const src = opts.src;
            delete opts.src;

            // Apply global theme default if not set per-instance.
            if (!opts.theme && config.theme) {
                opts.theme = config.theme;
            }

            // Each viewer gets its own client instance.
            const client = await UDocClient.create({
                license: config.license || undefined,
                baseUrl: config.baseUrl || undefined,
            });

            opts.container = el;
            const viewer = await client.createViewer(opts);
            await viewer.load(src);

            // Store references for potential cleanup.
            el._udocClient = client;
            el._udocViewer = viewer;
        } catch (err) {
            console.error("[UDoc Viewer] Failed to initialize viewer:", err);
            el.textContent = "Failed to load document viewer.";
        }
    }
}

// Initialize when DOM is ready.
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initViewers);
} else {
    initViewers();
}
