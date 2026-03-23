/**
 * Slide transition animations for PPTX spread-mode navigation.
 *
 * IMPORTANT: Effects must NEVER set `transform` on the incoming element.
 * The incoming element is the real spread — transforms on it would change
 * its layout position, causing scrollbar flicker, resize-observer loops,
 * and page-jump bugs. Only use `opacity` and `clip-path` on incoming.
 * The outgoing element is a disposable snapshot overlay, so `transform`
 * and `opacity` are safe on it.
 */

import type {
    PageTransition,
    TransitionEffect,
    SideDirection,
    EightDirection,
    CornerDirection,
} from "../../worker/index.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface TransitionHandle {
    /** Cancel the in-flight transition, jumping to the final state. */
    cancel(): void;
}

/**
 * Run a slide transition animation between two spread elements.
 *
 * @param outgoing   The snapshot overlay (will be removed on complete)
 * @param incoming   The real spread element (already mounted and positioned)
 * @param transition Transition descriptor from PageInfo
 * @param forward    Navigation direction (true = forward, false = backward)
 * @param onComplete Called when the transition finishes (or is cancelled)
 */
export function runTransition(
    outgoing: HTMLElement,
    incoming: HTMLElement,
    transition: PageTransition,
    forward: boolean,
    onComplete: () => void,
): TransitionHandle {
    const durationMs = transition.durationMs ?? 500;
    const apply = resolveEffect(transition.effect, forward);

    // Instant transitions
    if (durationMs <= 0 || !apply) {
        onComplete();
        return { cancel() {} };
    }

    // Prepare elements for animation.
    // No will-change on either element — it creates a new compositing layer
    // with different sub-pixel alignment, causing a visible 1px shift.
    // Modern browsers handle short transform/opacity animations efficiently
    // without the hint.
    outgoing.style.pointerEvents = "none";

    // The snapshot is inserted before the spread in the DOM, so the spread
    // (incoming) naturally paints on top. Effects that need the snapshot on
    // top set outgoing.style.zIndex = "1". We never set zIndex on the
    // incoming element to avoid creating a stacking context (causes 1px shift).

    // Set initial frame
    apply(0, outgoing, incoming);

    let rafId = 0;
    let done = false;
    const startTime = performance.now();

    function tick(now: number) {
        if (done) return;
        const elapsed = now - startTime;
        const raw = Math.min(elapsed / durationMs, 1);
        const t = easeInOut(raw);
        apply!(t, outgoing, incoming);
        if (raw < 1) {
            rafId = requestAnimationFrame(tick);
        } else {
            finish();
        }
    }

    function finish() {
        if (done) return;
        done = true;
        cancelAnimationFrame(rafId);
        resetOutgoing(outgoing);
        resetIncoming(incoming);
        onComplete();
    }

    rafId = requestAnimationFrame(tick);

    return {
        cancel() {
            finish();
        },
    };
}

// ---------------------------------------------------------------------------
// Easing
// ---------------------------------------------------------------------------

function easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------

/** Reset the outgoing snapshot — about to be removed from DOM anyway. */
function resetOutgoing(el: HTMLElement): void {
    el.style.pointerEvents = "";
    el.style.zIndex = "";
    el.style.opacity = "";
    el.style.clipPath = "";
    el.style.transform = "none";
}

/** Reset the incoming spread — only clear opacity/clip-path. NEVER touch transform or zIndex. */
function resetIncoming(el: HTMLElement): void {
    el.style.opacity = "";
    el.style.clipPath = "";
}

// ---------------------------------------------------------------------------
// Direction helpers
// ---------------------------------------------------------------------------

function sideToTranslate(dir: SideDirection, progress: number): string {
    const p = progress * 100;
    switch (dir) {
        case "left":
            return `translateX(${-p}%)`;
        case "right":
            return `translateX(${p}%)`;
        case "up":
            return `translateY(${-p}%)`;
        case "down":
            return `translateY(${p}%)`;
    }
}

function oppositeSide(dir: SideDirection): SideDirection {
    switch (dir) {
        case "left":
            return "right";
        case "right":
            return "left";
        case "up":
            return "down";
        case "down":
            return "up";
    }
}

function eightDirToTranslate(dir: EightDirection, progress: number): string {
    const p = progress * 100;
    const x =
        dir === "left" || dir === "leftUp" || dir === "leftDown"
            ? -p
            : dir === "right" || dir === "rightUp" || dir === "rightDown"
              ? p
              : 0;
    const y =
        dir === "up" || dir === "leftUp" || dir === "rightUp"
            ? -p
            : dir === "down" || dir === "leftDown" || dir === "rightDown"
              ? p
              : 0;
    return `translate(${x}%, ${y}%)`;
}

function oppositeEightDir(dir: EightDirection): EightDirection {
    const map: Record<EightDirection, EightDirection> = {
        left: "right",
        right: "left",
        up: "down",
        down: "up",
        leftUp: "rightDown",
        rightUp: "leftDown",
        leftDown: "rightUp",
        rightDown: "leftUp",
    };
    return map[dir];
}

/**
 * Build a clip-path: inset() that reveals the incoming element
 * progressively from the given direction.
 */
function revealInset(dir: SideDirection, t: number): string {
    const p = (1 - t) * 100;
    switch (dir) {
        case "right":
            return `inset(0 0 0 ${p}%)`;
        case "left":
            return `inset(0 ${p}% 0 0)`;
        case "down":
            return `inset(${p}% 0 0 0)`;
        case "up":
            return `inset(0 0 ${p}% 0)`;
    }
}

function eightDirToRevealInset(dir: EightDirection, t: number): string {
    const p = (1 - t) * 100;
    let top = 0,
        right = 0,
        bottom = 0,
        left = 0;
    if (dir === "left" || dir === "leftUp" || dir === "leftDown") right = p;
    if (dir === "right" || dir === "rightUp" || dir === "rightDown") left = p;
    if (dir === "up" || dir === "leftUp" || dir === "rightUp") bottom = p;
    if (dir === "down" || dir === "leftDown" || dir === "rightDown") top = p;
    return `inset(${top}% ${right}% ${bottom}% ${left}%)`;
}

// ---------------------------------------------------------------------------
// Effect resolver
//
// PowerPoint always uses the direction defined on the slide, regardless of
// whether the user navigates forward or backward. The `forward` flag is only
// used for symmetric directional effects (push, wipe) where reversing the
// direction feels natural. Shape reveals (cover, uncover, pull, strips) use
// the authored direction as-is.
// ---------------------------------------------------------------------------

type FrameFn = (t: number, outgoing: HTMLElement, incoming: HTMLElement) => void;

function resolveEffect(effect: TransitionEffect, forward: boolean): FrameFn | null {
    switch (effect.type) {
        case "replace":
            return null;

        case "fade":
            return effect.throughBlack ? fadeThroughBlack : crossfade;

        case "cut":
            return effect.throughBlack ? cutThroughBlack : null;

        case "dissolve":
            return crossfade;

        case "push": {
            const dir = forward ? effect.direction : oppositeSide(effect.direction);
            return pushEffect(dir);
        }

        case "wipe": {
            const dir = forward ? effect.direction : oppositeSide(effect.direction);
            return wipeEffect(dir);
        }

        case "cover":
            return coverEffect(effect.direction);

        case "uncover":
            return uncoverEffect(effect.direction);

        case "pull":
            return pullEffect(effect.direction);

        case "split":
            return splitEffect(effect.orientation, effect.inOut);

        case "zoom":
        case "box":
            return effect.inOut === "in" ? revealFromCenter : shrinkOutgoing;

        case "fly": {
            const dir = forward ? effect.direction : oppositeSide(effect.direction);
            return flyEffect(dir);
        }

        case "glitter": {
            const dir = forward ? effect.direction : oppositeSide(effect.direction);
            return wipeEffect(dir);
        }

        case "circle":
            return circleEffect;

        case "diamond":
            return diamondEffect;

        case "plus":
            return plusEffect;

        case "wedge":
            return crossfade;

        case "wheel":
            return crossfade;

        case "newsflash":
            return circleEffect;

        case "blinds":
            return crossfade;

        case "checker":
            return crossfade;

        case "comb":
            return crossfade;

        case "strips":
            return stripsEffect(effect.direction);

        case "random":
            return crossfade;

        case "randomBar":
            return crossfade;

        // PPTX 2010+ effects (p14)
        case "vortex":
            return shrinkOutgoing;

        case "switch":
        case "flip":
        case "gallery":
        case "conveyor":
            return flyEffect(effect.direction);

        case "ripple":
            return circleEffect;

        case "honeycomb":
            return crossfade;

        case "prism":
            return wipeEffect(effect.direction);

        case "doors":
            return splitEffect(effect.orientation, "out");

        case "window":
            return splitEffect(effect.orientation, "in");

        case "ferris":
            return flyEffect(effect.direction);

        case "pan": {
            const dir = forward ? effect.direction : oppositeSide(effect.direction);
            return pushEffect(dir);
        }

        case "warp":
        case "flythrough":
            return effect.inOut === "in" ? revealFromCenter : shrinkOutgoing;

        case "flash":
            return fadeThroughBlack;

        case "shred":
            return effect.inOut === "in" ? revealFromCenter : shrinkOutgoing;

        case "reveal":
            return effect.throughBlack ? fadeThroughBlack : wipeEffect(effect.direction);

        case "wheelReverse":
            return crossfade;

        case "morph":
            return crossfade;

        default:
            return crossfade;
    }
}

// ---------------------------------------------------------------------------
// Effect implementations
//
// Rules:
//   outgoing (snapshot): transform + opacity OK
//   incoming (real spread): opacity + clip-path ONLY, NO transform
// ---------------------------------------------------------------------------

// All effects below follow the z-order convention:
//   - Snapshot (outgoing) is inserted BEFORE the spread in the DOM,
//     so the spread (incoming) naturally paints on top.
//   - Effects where the snapshot must be on top set outgoing.style.zIndex = "1".
//   - We NEVER set zIndex on the incoming element.

/** Simple crossfade. */
function crossfade(t: number, outgoing: HTMLElement, _incoming: HTMLElement): void {
    outgoing.style.opacity = `${1 - t}`;
}

/** Fade through black: outgoing fades out first, then incoming fades in. */
function fadeThroughBlack(t: number, outgoing: HTMLElement, incoming: HTMLElement): void {
    if (t < 0.5) {
        outgoing.style.opacity = `${1 - t * 2}`;
        incoming.style.opacity = "0";
    } else {
        outgoing.style.opacity = "0";
        incoming.style.opacity = `${(t - 0.5) * 2}`;
    }
}

/** Hard cut through black. */
function cutThroughBlack(t: number, outgoing: HTMLElement, incoming: HTMLElement): void {
    if (t < 0.5) {
        outgoing.style.opacity = `${1 - t * 2}`;
        incoming.style.opacity = "0";
    } else {
        outgoing.style.opacity = "0";
        incoming.style.opacity = "1";
    }
}

/**
 * Push: snapshot slides away on top, incoming revealed via clip-path underneath.
 */
function pushEffect(dir: SideDirection): FrameFn {
    return (t, outgoing, incoming) => {
        outgoing.style.zIndex = "1";
        outgoing.style.transform = sideToTranslate(dir, t);
        incoming.style.clipPath = revealInset(oppositeSide(dir), t);
    };
}

/**
 * Wipe: incoming revealed via clip-path on top of static snapshot.
 */
function wipeEffect(dir: SideDirection): FrameFn {
    return (t, _outgoing, incoming) => {
        incoming.style.clipPath = revealInset(dir, t);
    };
}

/**
 * Cover: incoming revealed via clip-path on top of static snapshot.
 */
function coverEffect(dir: EightDirection): FrameFn {
    return (t, _outgoing, incoming) => {
        incoming.style.clipPath = eightDirToRevealInset(dir, t);
    };
}

/**
 * Uncover: snapshot slides away on top, revealing incoming underneath.
 */
function uncoverEffect(dir: EightDirection): FrameFn {
    return (t, outgoing, _incoming) => {
        outgoing.style.zIndex = "1";
        outgoing.style.transform = eightDirToTranslate(dir, t);
    };
}

/**
 * Pull: snapshot slides away on top while incoming is revealed via clip-path.
 */
function pullEffect(dir: EightDirection): FrameFn {
    return (t, outgoing, incoming) => {
        outgoing.style.zIndex = "1";
        outgoing.style.transform = eightDirToTranslate(dir, t);
        incoming.style.clipPath = eightDirToRevealInset(oppositeEightDir(dir), t);
    };
}

/**
 * Split "out": incoming revealed from center outward — clip-path on incoming.
 * Split "in": incoming revealed from edges inward — clip-path on snapshot (outgoing).
 */
function splitEffect(orientation: "horizontal" | "vertical", inOut: "in" | "out"): FrameFn {
    if (inOut === "out") {
        // Center outward: incoming starts fully clipped, opens from center
        return (t, _outgoing, incoming) => {
            const p = (1 - t) * 50;
            incoming.style.clipPath = orientation === "horizontal" ? `inset(${p}% 0)` : `inset(0 ${p}%)`;
        };
    } else {
        // Edges inward: snapshot collapses toward center, revealing incoming at edges
        return (t, outgoing, _incoming) => {
            outgoing.style.zIndex = "1";
            const p = t * 50;
            outgoing.style.clipPath = orientation === "horizontal" ? `inset(${p}% 0)` : `inset(0 ${p}%)`;
        };
    }
}

/**
 * Zoom/box in: incoming revealed from center via inset clip-path.
 */
function revealFromCenter(t: number, _outgoing: HTMLElement, incoming: HTMLElement): void {
    const p = (1 - t) * 50;
    incoming.style.clipPath = `inset(${p}% ${p}% ${p}% ${p}%)`;
}

/**
 * Zoom/box out: snapshot shrinks away on top, incoming visible underneath.
 */
function shrinkOutgoing(t: number, outgoing: HTMLElement, _incoming: HTMLElement): void {
    outgoing.style.zIndex = "1";
    outgoing.style.transform = `scale(${1 - t})`;
    outgoing.style.opacity = `${1 - t}`;
}

/**
 * Fly: snapshot slides and fades out on top, incoming fades in underneath.
 */
function flyEffect(dir: SideDirection): FrameFn {
    return (t, outgoing, incoming) => {
        outgoing.style.zIndex = "1";
        outgoing.style.transform = `${sideToTranslate(dir, t)} scale(${1 - t * 0.5})`;
        outgoing.style.opacity = `${1 - t}`;
        incoming.style.opacity = `${t}`;
    };
}

/**
 * Circle reveal from center.
 * Uses 71% radius (≈ sqrt(50² + 50²)) to fully cover rectangular corners.
 */
function circleEffect(t: number, _outgoing: HTMLElement, incoming: HTMLElement): void {
    const r = t * 71;
    incoming.style.clipPath = `circle(${r}% at 50% 50%)`;
}

/** Diamond reveal from center. */
function diamondEffect(t: number, _outgoing: HTMLElement, incoming: HTMLElement): void {
    const p = t * 50;
    incoming.style.clipPath = `polygon(50% ${50 - p}%, ${50 + p}% 50%, 50% ${50 + p}%, ${50 - p}% 50%)`;
}

/** Plus/cross reveal from center. */
function plusEffect(t: number, _outgoing: HTMLElement, incoming: HTMLElement): void {
    const h = t * 50;
    const v = t * 50;
    incoming.style.clipPath =
        `polygon(${50 - v}% 0%, ${50 + v}% 0%, ${50 + v}% ${50 - h}%, 100% ${50 - h}%, ` +
        `100% ${50 + h}%, ${50 + v}% ${50 + h}%, ${50 + v}% 100%, ${50 - v}% 100%, ` +
        `${50 - v}% ${50 + h}%, 0% ${50 + h}%, 0% ${50 - h}%, ${50 - v}% ${50 - h}%)`;
}

/**
 * Strips: snapshot slides away diagonally on top, incoming visible underneath.
 */
function stripsEffect(dir: CornerDirection): FrameFn {
    return (t, outgoing, _incoming) => {
        outgoing.style.zIndex = "1";
        outgoing.style.transform = eightDirToTranslate(dir as EightDirection, t);
        outgoing.style.opacity = `${1 - t}`;
    };
}
