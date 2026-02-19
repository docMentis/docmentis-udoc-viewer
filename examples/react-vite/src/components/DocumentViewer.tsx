"use client";
import { useEffect, useRef } from "react";
import { UDocClient } from "@docmentis/udoc-viewer";

interface DocumentViewerProps {
  url: string;
}

export function DocumentViewer({ url }: DocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<any>(null);
  const viewerRef = useRef<any>(null);

  useEffect(() => {
    let active = true;

    async function initViewer() {
      if (!containerRef.current) return;

      try {
        if (!clientRef.current) {
          clientRef.current = await UDocClient.create();
        }

        if (!active) return;

        viewerRef.current = await clientRef.current.createViewer({
          container: containerRef.current,
        });

        if (!active) return;

        await viewerRef.current.load(url);
      } catch (error) {
        if (active) {
          console.error("Failed to initialize UDoc Viewer:", error);
        }
      }
    }

    initViewer();

    return () => {
      active = false;
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
      if (clientRef.current) {
        clientRef.current.destroy();
        clientRef.current = null;
      }
    };
  }, [url]);

  return <div ref={containerRef} style={{ width: "100%", height: "100vh" }} />;
}
