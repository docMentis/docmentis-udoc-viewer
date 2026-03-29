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
    el.style.filter = "";
}

/** Reset the incoming spread — only clear opacity/clip-path. NEVER touch transform or zIndex. */
function resetIncoming(el: HTMLElement): void {
    el.style.opacity = "";
    el.style.clipPath = "";
    el.style.maskImage = "";
    el.style.setProperty("-webkit-mask-image", "");
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
            return dissolveEffect();

        case "push": {
            const dir = forward ? effect.direction : oppositeSide(effect.direction);
            return pushEffect(dir);
        }

        case "wipe": {
            const dir = forward ? effect.direction : oppositeSide(effect.direction);
            return wipeEffect(dir);
        }

        case "cover":
            return coverEffect(oppositeEightDir(effect.direction));

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
            return wedgeEffect;

        case "wheel":
            return wheelSweepEffect(effect.spokes, true);

        case "newsflash":
            return newsflashEffect;

        case "blinds":
            return blindsEffect(effect.orientation);

        case "checker":
            return checkerEffect(effect.orientation);

        case "comb":
            return combEffect(effect.orientation);

        case "strips":
            return stripsEffect(effect.direction);

        case "random": {
            const options: FrameFn[] = [
                crossfade,
                fadeThroughBlack,
                wipeEffect("left"),
                wipeEffect("right"),
                wipeEffect("up"),
                wipeEffect("down"),
                pushEffect("left"),
                pushEffect("right"),
                blindsEffect("horizontal"),
                blindsEffect("vertical"),
                circleEffect,
                diamondEffect,
                plusEffect,
                splitEffect("horizontal", "out"),
                splitEffect("vertical", "out"),
            ];
            return options[Math.floor(Math.random() * options.length)];
        }

        case "randomBar":
            return randomBarEffect(effect.orientation);

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
            return wheelSweepEffect(effect.spokes, false);

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

/** Simple crossfade — outgoing on top, faded out to reveal incoming below. */
function crossfade(t: number, outgoing: HTMLElement, _incoming: HTMLElement): void {
    outgoing.style.zIndex = "1";
    outgoing.style.opacity = `${1 - t}`;
}

/**
 * Fade through black: outgoing dims to solid black, then black fades out
 * to reveal incoming. Uses CSS brightness filter so the "black" is real,
 * not dependent on the viewer background color.
 */
function fadeThroughBlack(t: number, outgoing: HTMLElement, _incoming: HTMLElement): void {
    outgoing.style.zIndex = "1";
    if (t < 0.5) {
        // Outgoing content dims to black
        outgoing.style.filter = `brightness(${1 - t * 2})`;
        outgoing.style.opacity = "1";
    } else {
        // Black overlay fades out, revealing incoming below
        outgoing.style.filter = "brightness(0)";
        outgoing.style.opacity = `${1 - (t - 0.5) * 2}`;
    }
}

/**
 * Hard cut through black: instant switch to black, then instant switch
 * to new slide. Uses brightness(0) for actual black.
 */
function cutThroughBlack(t: number, outgoing: HTMLElement, _incoming: HTMLElement): void {
    outgoing.style.zIndex = "1";
    if (t < 0.5) {
        // Show solid black (outgoing rendered as black)
        outgoing.style.filter = "brightness(0)";
        outgoing.style.opacity = "1";
    } else {
        // Remove outgoing entirely, incoming visible below
        outgoing.style.opacity = "0";
    }
}

/**
 * Push: snapshot slides away on top, incoming revealed via clip-path underneath.
 */
function pushEffect(dir: SideDirection): FrameFn {
    const opp = oppositeSide(dir);
    return (t, outgoing, incoming) => {
        if (t >= 1) {
            incoming.style.transform = "";
            return;
        }
        outgoing.style.zIndex = "1";
        outgoing.style.transform = sideToTranslate(dir, t);
        incoming.style.transform = sideToTranslate(opp, 1 - t);
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
    return (t, outgoing, _incoming) => {
        outgoing.style.zIndex = "1";
        outgoing.style.transform = eightDirToTranslate(dir, t);
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
 * Circle reveal from center with soft/feathered edge.
 * Uses mask-image radial gradient for a blurred boundary like PowerPoint.
 * Radius 71% ≈ sqrt(50² + 50²) to fully cover rectangular corners.
 */
function circleEffect(t: number, _outgoing: HTMLElement, incoming: HTMLElement): void {
    if (t >= 1) {
        incoming.style.maskImage = "";
        incoming.style.setProperty("-webkit-mask-image", "");
        return;
    }
    if (t <= 0) {
        const mask = "radial-gradient(circle at 50% 50%, #000 0%, transparent 0%)";
        incoming.style.maskImage = mask;
        incoming.style.setProperty("-webkit-mask-image", mask);
        return;
    }
    // Color stops are relative to the gradient ray (farthest-corner by default),
    // so r must reach 100% to fully cover the slide at t=1.
    const r = t * 100;
    const edge = Math.max(1, r * 0.15);
    const inner = Math.max(0, r - edge);
    const mask = `radial-gradient(circle at 50% 50%, #000 ${inner}%, transparent ${r + 0.5}%)`;
    incoming.style.maskImage = mask;
    incoming.style.setProperty("-webkit-mask-image", mask);
}

/** Diamond reveal from center with feathered edge via SVG mask + blur. */
function diamondEffect(t: number, _outgoing: HTMLElement, incoming: HTMLElement): void {
    if (t >= 1) {
        incoming.style.maskImage = "";
        incoming.style.setProperty("-webkit-mask-image", "");
        return;
    }
    if (t <= 0) {
        const mask = diamondMaskSvg(0, 0);
        incoming.style.maskImage = mask;
        incoming.style.setProperty("-webkit-mask-image", mask);
        return;
    }
    const p = t * 100;
    const blur = Math.max(0.5, p * 0.08);
    const mask = diamondMaskSvg(p, blur);
    incoming.style.maskImage = mask;
    incoming.style.maskSize = "100% 100%";
    incoming.style.setProperty("-webkit-mask-image", mask);
    incoming.style.setProperty("-webkit-mask-size", "100% 100%");
}

function diamondMaskSvg(p: number, blur: number): string {
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">` +
        `<defs><filter id="b" x="-50%" y="-50%" width="200%" height="200%">` +
        `<feGaussianBlur stdDeviation="${blur}"/></filter></defs>` +
        `<polygon points="50,${50 - p} ${50 + p},50 50,${50 + p} ${50 - p},50" ` +
        `fill="white" filter="url(#b)"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Plus/cross reveal from center with feathered edge via SVG mask + blur. */
function plusEffect(t: number, _outgoing: HTMLElement, incoming: HTMLElement): void {
    if (t >= 1) {
        incoming.style.maskImage = "";
        incoming.style.setProperty("-webkit-mask-image", "");
        return;
    }
    if (t <= 0) {
        const mask = plusMaskSvg(0, 0);
        incoming.style.maskImage = mask;
        incoming.style.setProperty("-webkit-mask-image", mask);
        return;
    }
    const p = t * 50;
    const blur = Math.max(0.5, p * 0.08);
    const mask = plusMaskSvg(p, blur);
    incoming.style.maskImage = mask;
    incoming.style.maskSize = "100% 100%";
    incoming.style.setProperty("-webkit-mask-image", mask);
    incoming.style.setProperty("-webkit-mask-size", "100% 100%");
}

function plusMaskSvg(p: number, blur: number): string {
    // Plus shape: a cross centered at (50,50) with arm half-widths of p
    const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">` +
        `<defs><filter id="b" x="-50%" y="-50%" width="200%" height="200%">` +
        `<feGaussianBlur stdDeviation="${blur}"/></filter></defs>` +
        `<polygon points="${50 - p},0 ${50 + p},0 ${50 + p},${50 - p} 100,${50 - p} ` +
        `100,${50 + p} ${50 + p},${50 + p} ${50 + p},100 ${50 - p},100 ` +
        `${50 - p},${50 + p} 0,${50 + p} 0,${50 - p} ${50 - p},${50 - p}" ` +
        `fill="white" filter="url(#b)"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Newsflash: incoming slide expands from a single pixel at center while rotating 360°. */
function newsflashEffect(t: number, _outgoing: HTMLElement, incoming: HTMLElement): void {
    if (t >= 1) {
        incoming.style.transform = "";
        incoming.style.opacity = "";
        return;
    }
    // Scale from near-zero to 1, rotate a full 360°.
    const scale = Math.max(0.01, t);
    const deg = -t * 360;
    incoming.style.transform = `scale(${scale}) rotate(${deg}deg)`;
    incoming.style.transformOrigin = "50% 50%";
    incoming.style.opacity = String(t);
}

/**
 * Strips: diagonal wipe that reveals the incoming slide from a corner.
 * The reveal starts at the corner and sweeps diagonally across.
 */
function stripsEffect(dir: CornerDirection): FrameFn {
    return (t, _outgoing, incoming) => {
        if (t >= 1) {
            incoming.style.clipPath = "none";
            return;
        }
        if (t <= 0) {
            incoming.style.clipPath = "polygon(0% 0%, 0% 0%, 0% 0%)";
            return;
        }
        // d goes from 0 to 200 — the diagonal sweep distance across the rectangle
        const d = t * 200;
        let points: string;

        if (d <= 100) {
            // Triangle phase: expanding triangle from the corner
            switch (dir) {
                case "rightDown":
                    points = `0% 0%, ${d}% 0%, 0% ${d}%`;
                    break;
                case "leftDown":
                    points = `100% 0%, ${100 - d}% 0%, 100% ${d}%`;
                    break;
                case "rightUp":
                    points = `0% 100%, ${d}% 100%, 0% ${100 - d}%`;
                    break;
                case "leftUp":
                    points = `100% 100%, ${100 - d}% 100%, 100% ${100 - d}%`;
                    break;
            }
        } else {
            // Quadrilateral phase: the diagonal has passed the opposite edges
            const e = d - 100;
            switch (dir) {
                case "rightDown":
                    points = `0% 0%, 100% 0%, 100% ${e}%, ${e}% 100%, 0% 100%`;
                    break;
                case "leftDown":
                    points = `100% 0%, 0% 0%, 0% ${e}%, ${100 - e}% 100%, 100% 100%`;
                    break;
                case "rightUp":
                    points = `0% 100%, 100% 100%, 100% ${100 - e}%, ${e}% 0%, 0% 0%`;
                    break;
                case "leftUp":
                    points = `100% 100%, 0% 100%, 0% ${100 - e}%, ${100 - e}% 0%, 100% 0%`;
                    break;
            }
        }
        incoming.style.clipPath = `polygon(${points})`;
    };
}

// ---------------------------------------------------------------------------
// Blinds / Comb
// ---------------------------------------------------------------------------

const BLIND_STRIPS = 14;

/**
 * Blinds: CSS 3D box-rotation effect matching PowerPoint.
 *
 * Each strip is modelled as a 3D box whose cross-section is a square
 * (depth === strip height). The front face shows the outgoing slide and the
 * bottom face shows the incoming slide. All boxes rotate 90° around the X
 * axis (horizontal) or Y axis (vertical) at the box centre, so the bottom
 * face rolls into view like a real window blind.
 *
 * All faces share a single `preserve-3d` context rooted on the outgoing
 * snapshot element, so the browser z-sorts faces across strips correctly.
 */
function blindsEffect(orientation: "horizontal" | "vertical"): FrameFn {
    const N = BLIND_STRIPS;
    const isH = orientation === "horizontal";
    let setup: { flippers: HTMLElement[]; halfDepth: number } | null = null;

    return (t, outgoing, incoming) => {
        if (t >= 1) {
            incoming.style.opacity = "";
            incoming.style.clipPath = "none";
            // outgoing (now containing strips) is removed by onComplete
            return;
        }

        // Lazy init: build 3D strip DOM on first frame
        if (!setup) {
            setup = setupBlinds3D(outgoing, incoming, N, isH);
        }

        // Fallback to crossfade if 3D setup failed (no canvases)
        if (!setup || setup.flippers.length === 0) {
            outgoing.style.zIndex = "1";
            outgoing.style.opacity = `${1 - t}`;
            return;
        }

        // Staggered rotation: center strips start first, edges start last.
        // Each strip's local progress is derived from its distance to center.
        const hd = setup.halfDepth;
        const stagger = 0.7; // fraction of total duration used for stagger spread
        const center = (N - 1) / 2;

        for (let i = 0; i < setup.flippers.length; i++) {
            const dist = Math.abs(i - center) / center; // 0 at center, 1 at edges
            const delay = dist * stagger;
            const stripT = Math.max(0, Math.min(1, (t - delay) / (1 - stagger)));
            const angle = stripT * 90;
            setup.flippers[i].style.transform = isH
                ? `translateZ(-${hd}px) rotateX(${angle}deg)`
                : `translateZ(-${hd}px) rotateY(-${angle}deg)`;
        }
    };
}

/**
 * Build N 3D box-strip elements inside the outgoing snapshot.
 *
 * DOM structure (horizontal example):
 *   outgoing  [perspective, preserve-3d]
 *   ├── flipper-0  [preserve-3d, position: absolute, rotateX(angle)]
 *   │   ├── front  [canvas, translateZ(d/2)]
 *   │   └── bottom [canvas, rotateX(-90deg) translateZ(d/2)]
 *   ├── flipper-1  ...
 *   └── ...
 */
function setupBlinds3D(
    outgoing: HTMLElement,
    incoming: HTMLElement,
    N: number,
    isH: boolean,
): { flippers: HTMLElement[]; halfDepth: number } {
    // The outgoing snapshot is a div (positioned at the slot area) containing a canvas.
    // The incoming is the real spread — find its main canvas.
    const outCanvas = outgoing.querySelector<HTMLCanvasElement>("canvas");
    const inCanvas =
        incoming.querySelector<HTMLCanvasElement>(".udoc-spread__canvas") ??
        incoming.querySelector<HTMLCanvasElement>("canvas");

    if (!outCanvas || !inCanvas || outCanvas.width === 0 || inCanvas.width === 0) {
        return { flippers: [], halfDepth: 0 };
    }

    // The snapshot is positioned exactly at the slot area — use its dimensions directly.
    const slideW = outgoing.offsetWidth;
    const slideH = outgoing.offsetHeight;
    const d = isH ? slideH / N : slideW / N; // box depth = strip size (square cross-section)

    // Repurpose the disposable snapshot as the container.
    // Since the snapshot is now a canvas positioned at the slot area,
    // all children are placed at (0,0) relative to it — no offset needed.
    outgoing.innerHTML = "";
    outgoing.style.overflow = "visible";
    outgoing.style.zIndex = "1";

    // Hide the real spread during animation (resetIncoming restores on cancel)
    incoming.style.opacity = "0";

    // Black backdrop — flat 2D element, NOT inside the preserve-3d context.
    // Sits behind the 3D scene in normal stacking order (DOM before scene).
    const backdrop = document.createElement("div");
    backdrop.style.position = "absolute";
    backdrop.style.left = "0";
    backdrop.style.top = "0";
    backdrop.style.width = `${slideW}px`;
    backdrop.style.height = `${slideH}px`;
    backdrop.style.background = "#000";
    outgoing.appendChild(backdrop);

    // 3D scene container — preserve-3d + perspective live here,
    // separate from the flat backdrop so it doesn't interfere.
    const scene = document.createElement("div");
    scene.style.position = "absolute";
    scene.style.left = "0";
    scene.style.top = "0";
    scene.style.width = `${slideW}px`;
    scene.style.height = `${slideH}px`;
    scene.style.perspective = `${(isH ? slideH : slideW) * 2}px`;
    scene.style.transformStyle = "preserve-3d";
    outgoing.appendChild(scene);

    const flippers: HTMLElement[] = [];

    for (let i = 0; i < N; i++) {
        // Flipper — the rotating 3D box for this strip
        const flipper = document.createElement("div");
        flipper.style.position = "absolute";
        flipper.style.transformStyle = "preserve-3d";
        const pad = 0.5; // half-pixel overlap to hide sub-pixel seams
        if (isH) {
            flipper.style.left = "0";
            flipper.style.top = `${i * d - pad}px`;
            flipper.style.width = `${slideW}px`;
            flipper.style.height = `${d + pad * 2}px`;
        } else {
            flipper.style.top = "0";
            flipper.style.left = `${i * d - pad}px`;
            flipper.style.width = `${d + pad * 2}px`;
            flipper.style.height = `${slideH}px`;
        }
        // transform-origin defaults to center — correct for box-centre rotation

        // Front face: outgoing content, pushed forward by d/2
        const front = createBlindFace(outCanvas, i, N, isH);
        front.style.backfaceVisibility = "hidden";
        front.style.transform = `translateZ(${d / 2}px)`;

        // Bottom/right face: incoming content, rotated into position then pushed out
        const bottom = createBlindFace(inCanvas, i, N, isH);
        bottom.style.backfaceVisibility = "hidden";
        bottom.style.transform = isH
            ? `rotateX(-90deg) translateZ(${d / 2}px)`
            : `rotateY(90deg) translateZ(${d / 2}px)`;

        flipper.appendChild(front);
        flipper.appendChild(bottom);
        scene.appendChild(flipper);
        flippers.push(flipper);
    }

    return { flippers, halfDepth: d / 2 };
}

/** Create a canvas element showing one strip slice of a source canvas. */
function createBlindFace(
    source: HTMLCanvasElement,
    index: number,
    total: number,
    isHorizontal: boolean,
): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";

    if (isHorizontal) {
        const stripH = Math.round(source.height / total);
        const sy = index * stripH;
        const sh = Math.min(stripH, source.height - sy);
        canvas.width = source.width;
        canvas.height = sh;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(source, 0, sy, source.width, sh, 0, 0, source.width, sh);
    } else {
        const stripW = Math.round(source.width / total);
        const sx = index * stripW;
        const sw = Math.min(stripW, source.width - sx);
        canvas.width = sw;
        canvas.height = source.height;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(source, sx, 0, sw, source.height, 0, 0, sw, source.height);
    }

    return canvas;
}

/**
 * Comb: N strips revealed from alternating directions.
 * Horizontal = even strips from left, odd from right.
 * Vertical = even strips from top, odd from bottom.
 */
function combEffect(orientation: "horizontal" | "vertical"): FrameFn {
    const N = BLIND_STRIPS;
    return (t, _outgoing, incoming) => {
        if (t >= 1) {
            incoming.style.clipPath = "none";
            return;
        }
        // Each rectangle is anchored through the origin (0% 0%) so that
        // bridges between non-adjacent strips retrace and produce zero
        // net winding — no visible triangles between strips.
        const points: string[] = [];
        if (orientation === "horizontal") {
            const stripH = 100 / N;
            for (let i = 0; i < N; i++) {
                const top = i * stripH;
                const bot = (i + 1) * stripH;
                points.push("0% 0%");
                if (i % 2 === 0) {
                    const r = t * 100;
                    points.push(`0% ${top}%`, `${r}% ${top}%`, `${r}% ${bot}%`, `0% ${bot}%`, `0% ${top}%`);
                } else {
                    const l = (1 - t) * 100;
                    points.push(`${l}% ${top}%`, `100% ${top}%`, `100% ${bot}%`, `${l}% ${bot}%`, `${l}% ${top}%`);
                }
                points.push("0% 0%");
            }
        } else {
            const stripW = 100 / N;
            for (let i = 0; i < N; i++) {
                const left = i * stripW;
                const right = (i + 1) * stripW;
                points.push("0% 0%");
                if (i % 2 === 0) {
                    const b = t * 100;
                    points.push(`${left}% 0%`, `${right}% 0%`, `${right}% ${b}%`, `${left}% ${b}%`, `${left}% 0%`);
                } else {
                    const tp = (1 - t) * 100;
                    points.push(
                        `${left}% ${tp}%`,
                        `${right}% ${tp}%`,
                        `${right}% 100%`,
                        `${left}% 100%`,
                        `${left}% ${tp}%`,
                    );
                }
                points.push("0% 0%");
            }
        }
        incoming.style.clipPath = `polygon(${points.join(", ")})`;
    };
}

// ---------------------------------------------------------------------------
// Wheel / Wedge
// ---------------------------------------------------------------------------

/** Arc resolution for wheel/wedge polygon approximation. */
const ARC_STEPS = 12;
/** Radius large enough to fully cover a rectangular element from center. */
const SWEEP_RADIUS = 75;

/**
 * Wheel: N spokes sweep from 12 o'clock, revealing N sectors simultaneously.
 * @param clockwise  true = clockwise (wheel), false = counter-clockwise (wheelReverse)
 */
function wheelSweepEffect(spokes: number, clockwise: boolean): FrameFn {
    const n = Math.max(1, spokes);
    const dir = clockwise ? 1 : -1;
    return (t, _outgoing, incoming) => {
        if (t >= 1) {
            incoming.style.clipPath = "none";
            return;
        }
        if (t <= 0) {
            incoming.style.clipPath = "polygon(50% 50%, 50% 50%, 50% 50%)";
            return;
        }
        const sectorAngle = 360 / n;
        const sweep = t * sectorAngle;
        const points: string[] = [];
        for (let s = 0; s < n; s++) {
            const startDeg = -90 + s * sectorAngle;
            points.push("50% 50%");
            for (let j = 0; j <= ARC_STEPS; j++) {
                const deg = startDeg + dir * (j / ARC_STEPS) * sweep;
                const rad = (deg * Math.PI) / 180;
                points.push(`${50 + SWEEP_RADIUS * Math.cos(rad)}% ${50 + SWEEP_RADIUS * Math.sin(rad)}%`);
            }
            points.push("50% 50%");
        }
        incoming.style.clipPath = `polygon(${points.join(", ")})`;
    };
}

/**
 * Wedge: two sectors expand symmetrically from 12 o'clock (one CW, one CCW).
 */
function wedgeEffect(t: number, _outgoing: HTMLElement, incoming: HTMLElement): void {
    if (t >= 1) {
        incoming.style.clipPath = "none";
        return;
    }
    if (t <= 0) {
        incoming.style.clipPath = "polygon(50% 50%, 50% 50%, 50% 50%)";
        return;
    }
    const sweep = t * 180;
    const points: string[] = ["50% 50%"];
    // Counter-clockwise half
    for (let j = ARC_STEPS; j >= 0; j--) {
        const deg = -90 - (j / ARC_STEPS) * sweep;
        const rad = (deg * Math.PI) / 180;
        points.push(`${50 + SWEEP_RADIUS * Math.cos(rad)}% ${50 + SWEEP_RADIUS * Math.sin(rad)}%`);
    }
    // Clockwise half
    for (let j = 0; j <= ARC_STEPS; j++) {
        const deg = -90 + (j / ARC_STEPS) * sweep;
        const rad = (deg * Math.PI) / 180;
        points.push(`${50 + SWEEP_RADIUS * Math.cos(rad)}% ${50 + SWEEP_RADIUS * Math.sin(rad)}%`);
    }
    incoming.style.clipPath = `polygon(${points.join(", ")})`;
}

// ---------------------------------------------------------------------------
// Checker / Random Bar
// ---------------------------------------------------------------------------

const CHECKER_COLS = 8;
const CHECKER_ROWS = 6;

/**
 * Checker: 3D tile-flip effect in a checkerboard pattern.
 *
 * The slide is divided into a grid of tiles. Each tile is a 3D object
 * with the outgoing slide on the front face and the incoming slide on
 * the back face. Tiles flip 180° around the X axis (across/horizontal)
 * or Y axis (down/vertical), staggered in a checkerboard sweep pattern.
 */
function checkerEffect(orientation: "horizontal" | "vertical"): FrameFn {
    const isH = orientation === "horizontal";
    const cols = CHECKER_COLS;
    const rows = CHECKER_ROWS;
    let setup: { flippers: HTMLElement[] } | null = null;

    // Sweep across columns (horizontal) or down rows (vertical),
    // with checkerboard phase offset.
    const sweepLen = (isH ? cols : rows) + 1;
    const flipDur = 3; // each tile takes 3 sweep-units to flip
    const totalLen = sweepLen + flipDur;

    return (t, outgoing, incoming) => {
        if (t >= 1) {
            incoming.style.opacity = "";
            incoming.style.clipPath = "none";
            return;
        }

        if (!setup) {
            setup = setupChecker3D(outgoing, incoming, cols, rows, isH);
        }

        const sweep = t * totalLen;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const idx = r * cols + c;
                const pos = isH ? c : r;
                const phase = (r + c) % 2;
                const cellStart = pos + phase;
                const cellT = Math.max(0, Math.min(1, (sweep - cellStart) / flipDur));
                const angle = cellT * 180;
                setup.flippers[idx].style.transform = isH ? `rotateY(-${angle}deg)` : `rotateX(${angle}deg)`;
            }
        }
    };
}

/**
 * Build a grid of 3D flipper tiles for the checker transition.
 *
 * DOM structure:
 *   outgoing  [container]
 *   ├── backdrop  [black background]
 *   └── scene  [perspective, preserve-3d]
 *       ├── flipper-0,0  [preserve-3d, rotateX/Y]
 *       │   ├── front  [canvas tile of outgoing]
 *       │   └── back   [canvas tile of incoming, rotated 180°]
 *       ├── flipper-0,1  ...
 *       └── ...
 */
function setupChecker3D(
    outgoing: HTMLElement,
    incoming: HTMLElement,
    cols: number,
    rows: number,
    isH: boolean,
): { flippers: HTMLElement[] } {
    const outCanvas = outgoing.querySelector<HTMLCanvasElement>("canvas");
    const inCanvas =
        incoming.querySelector<HTMLCanvasElement>(".udoc-spread__canvas") ??
        incoming.querySelector<HTMLCanvasElement>("canvas");

    if (!outCanvas || !inCanvas || outCanvas.width === 0 || inCanvas.width === 0) {
        return { flippers: [] };
    }

    const slideW = outgoing.offsetWidth;
    const slideH = outgoing.offsetHeight;
    const tileW = slideW / cols;
    const tileH = slideH / rows;

    outgoing.innerHTML = "";
    outgoing.style.overflow = "visible";
    outgoing.style.zIndex = "1";

    incoming.style.opacity = "0";

    const backdrop = document.createElement("div");
    backdrop.style.position = "absolute";
    backdrop.style.left = "0";
    backdrop.style.top = "0";
    backdrop.style.width = `${slideW}px`;
    backdrop.style.height = `${slideH}px`;
    backdrop.style.background = "#000";
    outgoing.appendChild(backdrop);

    const scene = document.createElement("div");
    scene.style.position = "absolute";
    scene.style.left = "0";
    scene.style.top = "0";
    scene.style.width = `${slideW}px`;
    scene.style.height = `${slideH}px`;
    scene.style.perspective = `${Math.max(slideW, slideH) * 2}px`;
    scene.style.transformStyle = "preserve-3d";
    outgoing.appendChild(scene);

    const flippers: HTMLElement[] = [];

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const flipper = document.createElement("div");
            flipper.style.position = "absolute";
            flipper.style.transformStyle = "preserve-3d";
            const pad = 0.5; // half-pixel overlap to hide sub-pixel seams
            flipper.style.left = `${c * tileW - pad}px`;
            flipper.style.top = `${r * tileH - pad}px`;
            flipper.style.width = `${tileW + pad * 2}px`;
            flipper.style.height = `${tileH + pad * 2}px`;

            const front = createCheckerFace(outCanvas, c, r, cols, rows);
            front.style.backfaceVisibility = "hidden";

            const back = createCheckerFace(inCanvas, c, r, cols, rows);
            back.style.backfaceVisibility = "hidden";
            back.style.transform = isH ? "rotateY(-180deg)" : "rotateX(180deg)";

            flipper.appendChild(front);
            flipper.appendChild(back);
            scene.appendChild(flipper);
            flippers.push(flipper);
        }
    }

    return { flippers };
}

/** Create a canvas element showing one tile of a source canvas. */
function createCheckerFace(
    source: HTMLCanvasElement,
    col: number,
    row: number,
    cols: number,
    rows: number,
): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";

    const tileW = Math.round(source.width / cols);
    const tileH = Math.round(source.height / rows);
    const sx = col * tileW;
    const sy = row * tileH;
    const sw = Math.min(tileW, source.width - sx);
    const sh = Math.min(tileH, source.height - sy);

    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh);

    return canvas;
}

// ---------------------------------------------------------------------------
// Dissolve
// ---------------------------------------------------------------------------

const DISSOLVE_COLS = 60;
const DISSOLVE_ROWS = 40;

/**
 * Dissolve: random grid cells appear progressively, approximating PowerPoint's
 * pixelated dissolve pattern. Cells snap fully visible in shuffled order.
 */
function dissolveEffect(): FrameFn {
    const total = DISSOLVE_COLS * DISSOLVE_ROWS;
    // Fisher-Yates shuffle — computed once per transition
    const order = Array.from({ length: total }, (_, i) => i);
    for (let i = total - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }

    return (t, _outgoing, incoming) => {
        if (t >= 1) {
            incoming.style.clipPath = "none";
            return;
        }
        const revealed = Math.ceil(t * total);
        if (revealed <= 0) {
            incoming.style.clipPath = "polygon(0% 0%, 0% 0%, 0% 0%)";
            return;
        }
        const cellW = 100 / DISSOLVE_COLS;
        const cellH = 100 / DISSOLVE_ROWS;
        const points: string[] = [];
        for (let k = 0; k < revealed; k++) {
            const idx = order[k];
            const c = idx % DISSOLVE_COLS;
            const r = Math.floor(idx / DISSOLVE_COLS);
            const left = c * cellW;
            const top = r * cellH;
            points.push(
                "0% 0%",
                `${left}% ${top}%`,
                `${left + cellW}% ${top}%`,
                `${left + cellW}% ${top + cellH}%`,
                `${left}% ${top + cellH}%`,
                `${left}% ${top}%`,
                "0% 0%",
            );
        }
        incoming.style.clipPath = `polygon(${points.join(", ")})`;
    };
}

// ---------------------------------------------------------------------------
// Random Bar
// ---------------------------------------------------------------------------

const RANDOM_BAR_COUNT = 10;

/**
 * Random Bar: bars revealed in shuffled order.
 * Each bar fully appears before the next starts, creating a staggered wipe.
 */
function randomBarEffect(orientation: "horizontal" | "vertical"): FrameFn {
    const N = RANDOM_BAR_COUNT;
    // Fisher-Yates shuffle — computed once per transition
    const order = Array.from({ length: N }, (_, i) => i);
    for (let i = N - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }

    return (t, _outgoing, incoming) => {
        if (t >= 1) {
            incoming.style.clipPath = "none";
            return;
        }
        // How many bars are fully or partially revealed
        const progress = t * N;
        const revealed = Math.floor(progress);
        const partial = progress - revealed;

        const points: string[] = [];

        for (let k = 0; k <= revealed && k < N; k++) {
            const barIndex = order[k];
            const barT = k < revealed ? 1 : partial;
            if (barT <= 0) continue;

            if (orientation === "horizontal") {
                const stripH = 100 / N;
                const top = barIndex * stripH;
                const right = barT * 100;
                points.push(
                    `0% ${top}%`,
                    `${right}% ${top}%`,
                    `${right}% ${top + stripH}%`,
                    `0% ${top + stripH}%`,
                    `0% ${top}%`,
                );
            } else {
                const stripW = 100 / N;
                const left = barIndex * stripW;
                const bot = barT * 100;
                points.push(
                    `${left}% 0%`,
                    `${left + stripW}% 0%`,
                    `${left + stripW}% ${bot}%`,
                    `${left}% ${bot}%`,
                    `${left}% 0%`,
                );
            }
        }

        if (points.length === 0) {
            incoming.style.clipPath = "polygon(0% 0%, 0% 0%, 0% 0%)";
        } else {
            incoming.style.clipPath = `polygon(${points.join(", ")})`;
        }
    };
}
