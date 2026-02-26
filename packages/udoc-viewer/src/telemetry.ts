/**
 * Lightweight telemetry for tracking SDK usage.
 *
 * Collects non-PII data on each document open:
 * - domain: hostname of the embedding website
 * - format: document format (pdf, pptx, image)
 * - size_bucket: file size in units of 100 KB (floor(bytes / 100_000))
 * - viewer_version: SDK version string
 *
 * Data is sent to PostHog via the HTTP capture API using
 * navigator.sendBeacon (with fetch fallback). No posthog-js dependency.
 *
 * Opt out by passing `telemetry: false` to `UDocClient.create()`.
 */

const POSTHOG_HOST = "https://us.i.posthog.com";
const POSTHOG_KEY = "phc_26IC6W3M0v3RJm2AwRu8vff8QFBoDWjuWQiadSFZ1P3";

interface TelemetryEvent {
    domain: string;
    format: string;
    size_bucket: number;
    viewer_version: string;
}

export function reportDocumentOpen(event: TelemetryEvent): void {
    const payload = {
        api_key: POSTHOG_KEY,
        event: "document_open",
        properties: {
            domain: event.domain,
            format: event.format,
            size_bucket: event.size_bucket,
            viewer_version: event.viewer_version,
        },
        distinct_id: event.domain,
        timestamp: new Date().toISOString(),
    };

    const body = JSON.stringify(payload);
    const url = `${POSTHOG_HOST}/capture/`;

    // Fire-and-forget: sendBeacon preferred, fetch fallback
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(url, body);
    } else if (typeof fetch !== "undefined") {
        fetch(url, {
            method: "POST",
            body,
            headers: { "Content-Type": "application/json" },
            keepalive: true,
        }).catch(() => {});
    }
}
