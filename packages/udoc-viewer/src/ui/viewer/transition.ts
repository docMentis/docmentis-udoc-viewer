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
            return wedgeEffect;

        case "wheel":
            return wheelSweepEffect(effect.spokes, true);

        case "newsflash":
            return circleEffect;

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

const BLIND_STRIPS = 6;

/**
 * Blinds: N parallel strips revealed simultaneously.
 * Horizontal = horizontal bars growing downward; vertical = vertical bars growing rightward.
 */
function blindsEffect(orientation: "horizontal" | "vertical"): FrameFn {
    const N = BLIND_STRIPS;
    return (t, _outgoing, incoming) => {
        if (t >= 1) {
            incoming.style.clipPath = "none";
            return;
        }
        const points: string[] = [];
        if (orientation === "horizontal") {
            const stripH = 100 / N;
            for (let i = 0; i < N; i++) {
                const top = i * stripH;
                const bot = top + t * stripH;
                points.push(`0% ${top}%`, `100% ${top}%`, `100% ${bot}%`, `0% ${bot}%`, `0% ${top}%`);
            }
        } else {
            const stripW = 100 / N;
            for (let i = 0; i < N; i++) {
                const left = i * stripW;
                const right = left + t * stripW;
                points.push(`${left}% 0%`, `${right}% 0%`, `${right}% 100%`, `${left}% 100%`, `${left}% 0%`);
            }
        }
        incoming.style.clipPath = `polygon(${points.join(", ")})`;
    };
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
 * Checker: grid of cells revealed in a checkerboard pattern that sweeps
 * directionally. "Across" (horizontal) sweeps left-to-right; "Down"
 * (vertical) sweeps top-to-bottom. Cells snap fully visible once the
 * sweep reaches them, with checkerboard-phase offset so alternating
 * cells appear at different times.
 */
function checkerEffect(orientation: "horizontal" | "vertical"): FrameFn {
    const cols = orientation === "horizontal" ? CHECKER_COLS : CHECKER_ROWS;
    const rows = orientation === "horizontal" ? CHECKER_ROWS : CHECKER_COLS;
    // Total sweep distance: primary dimension + 1 extra step for phase offset
    const sweepLen = (orientation === "horizontal" ? cols : rows) + 1;
    return (t, _outgoing, incoming) => {
        if (t >= 1) {
            incoming.style.clipPath = "none";
            return;
        }
        const cellW = 100 / cols;
        const cellH = 100 / rows;
        const sweep = t * sweepLen; // 0 → sweepLen

        const points: string[] = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // Primary position along sweep direction
                const pos = orientation === "horizontal" ? c : r;
                // Checkerboard offset: alternating cells are delayed by 1 step
                const phase = (r + c) % 2;
                // Cell appears when sweep passes pos + phase
                if (sweep < pos + phase) continue;

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
        }
        if (points.length === 0) {
            incoming.style.clipPath = "polygon(0% 0%, 0% 0%, 0% 0%)";
        } else {
            incoming.style.clipPath = `polygon(${points.join(", ")})`;
        }
    };
}

// ---------------------------------------------------------------------------
// Dissolve
// ---------------------------------------------------------------------------

const DISSOLVE_COLS = 12;
const DISSOLVE_ROWS = 8;

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
