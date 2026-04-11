/**
 * WebGL2-accelerated slide transitions.
 *
 * Currently implements: vortex.
 *
 * The entry point is tryRunGLTransition(), called from runTransition() in
 * transition.ts BEFORE the CSS path runs. It returns null when the effect
 * isn't GL-backed or when GL setup fails — in that case the caller falls
 * back to the CSS path and there is no visible regression.
 *
 * Same DOM contract as the CSS path (see transition.ts header):
 *   - The outgoing element (snapshot overlay) is disposable — we mutate
 *     it freely (innerHTML, zIndex, a GL <canvas> child).
 *   - The incoming element (real spread) is only touched via `opacity`.
 *     NEVER set `transform` on incoming.
 */

import type { PageTransition, SideDirection } from "../../worker/index.js";
import type { TransitionHandle } from "./transition.js";

// 4x the tile count of the CSS fallback (40x22). The GL path pays one draw
// call per phase regardless of tile count, so we can afford a much finer
// grid for a smoother, more detailed vortex.
const VORTEX_COLS = 80;
const VORTEX_ROWS = 44;

/**
 * Try to run a GL-accelerated transition. Returns null if the effect is
 * not GL-backed, WebGL2 isn't available, or texture setup fails — caller
 * should fall back to the CSS path.
 */
export function tryRunGLTransition(
    outgoing: HTMLElement,
    incoming: HTMLElement,
    transition: PageTransition,
    _forward: boolean,
    durationMs: number,
    onComplete: () => void,
): TransitionHandle | null {
    const effect = transition.effect;
    if (effect.type !== "vortex") return null;
    return runVortex(outgoing, incoming, effect.direction, durationMs, onComplete);
}

// ---------------------------------------------------------------------------
// Vortex
// ---------------------------------------------------------------------------

function runVortex(
    outgoing: HTMLElement,
    incoming: HTMLElement,
    dir: SideDirection,
    durationMs: number,
    onComplete: () => void,
): TransitionHandle | null {
    const outCanvas = outgoing.querySelector<HTMLCanvasElement>("canvas");
    const inCanvas =
        incoming.querySelector<HTMLCanvasElement>(".udoc-spread__canvas") ??
        incoming.querySelector<HTMLCanvasElement>("canvas");
    if (!outCanvas || !inCanvas || outCanvas.width === 0 || inCanvas.width === 0) {
        return null;
    }

    const dpr = window.devicePixelRatio || 1;
    const slideW = outCanvas.width / dpr;
    const slideH = outCanvas.height / dpr;

    // Detached GL canvas. Everything up to the "Commit" line below is
    // side-effect-free from the page's perspective — if any step fails
    // we can return null and the CSS fallback runs cleanly.
    const glCanvas = document.createElement("canvas");
    glCanvas.width = outCanvas.width;
    glCanvas.height = outCanvas.height;

    const gl = glCanvas.getContext("webgl2", {
        alpha: false,
        antialias: true,
        depth: true,
        premultipliedAlpha: false,
    }) as WebGL2RenderingContext | null;
    if (!gl) return null;

    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    if (outCanvas.width > maxTex || outCanvas.height > maxTex || inCanvas.width > maxTex || inCanvas.height > maxTex) {
        return null;
    }

    const program = createProgram(gl, VORTEX_VS, VORTEX_FS);
    if (!program) return null;

    const outTex = uploadTexture(gl, outCanvas);
    const inTex = uploadTexture(gl, inCanvas);
    if (!outTex || !inTex) {
        if (outTex) gl.deleteTexture(outTex);
        if (inTex) gl.deleteTexture(inTex);
        gl.deleteProgram(program);
        return null;
    }

    const mesh = buildVortexMesh(VORTEX_COLS, VORTEX_ROWS, slideW, slideH, dir);
    const vbo = gl.createBuffer();
    if (!vbo) {
        gl.deleteTexture(outTex);
        gl.deleteTexture(inTex);
        gl.deleteProgram(program);
        return null;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.data, gl.STATIC_DRAW);

    gl.useProgram(program);

    const F = 4; // bytes per float
    const STRIDE = 11 * F;
    bindAttrib(gl, program, "a_localPos", 2, STRIDE, 0 * F);
    bindAttrib(gl, program, "a_tileCenter", 2, STRIDE, 2 * F);
    bindAttrib(gl, program, "a_uv", 2, STRIDE, 4 * F);
    bindAttrib(gl, program, "a_staggerOut", 1, STRIDE, 6 * F);
    bindAttrib(gl, program, "a_staggerIn", 1, STRIDE, 7 * F);
    bindAttrib(gl, program, "a_jitter", 3, STRIDE, 8 * F);

    const uT = gl.getUniformLocation(program, "u_t");
    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uIsHorizontal = gl.getUniformLocation(program, "u_isHorizontal");
    const uRotSign = gl.getUniformLocation(program, "u_rotSign");
    const uPhase = gl.getUniformLocation(program, "u_phase");
    const uTex = gl.getUniformLocation(program, "u_tex");
    const uPerspective = gl.getUniformLocation(program, "u_perspective");

    const isH = dir === "left" || dir === "right";
    const rotSign = dir === "right" || dir === "up" ? 1 : -1;

    gl.uniform2f(uResolution, slideW, slideH);
    gl.uniform1f(uIsHorizontal, isH ? 1 : 0);
    gl.uniform1f(uRotSign, rotSign);
    gl.uniform1f(uPerspective, Math.max(slideW, slideH) * 2);
    gl.uniform1i(uTex, 0);

    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearColor(0, 0, 0, 1);
    gl.clearDepth(1);
    gl.activeTexture(gl.TEXTURE0);

    // ---- All fallible GL setup succeeded. Commit DOM mutations. ----
    glCanvas.style.position = "absolute";
    glCanvas.style.left = "0";
    glCanvas.style.top = "0";
    glCanvas.style.width = `${slideW}px`;
    glCanvas.style.height = `${slideH}px`;
    glCanvas.style.display = "block";

    outgoing.innerHTML = "";
    outgoing.style.overflow = "visible";
    outgoing.style.zIndex = "1";
    outgoing.style.pointerEvents = "none";
    outgoing.appendChild(glCanvas);

    incoming.style.opacity = "0";

    // Render the first frame synchronously so the GL canvas has content
    // before the browser composites — avoids a single-frame flash of black.
    drawFrame(0);

    let rafId = 0;
    let done = false;
    const startTime = performance.now();

    function drawFrame(t: number): void {
        gl!.clear(gl!.COLOR_BUFFER_BIT | gl!.DEPTH_BUFFER_BIT);
        gl!.uniform1f(uT, t);

        // Phase 0 — outgoing tiles
        gl!.uniform1f(uPhase, 0);
        gl!.bindTexture(gl!.TEXTURE_2D, outTex!);
        gl!.drawArrays(gl!.TRIANGLES, 0, mesh.vertexCount);

        // Phase 1 — incoming tiles
        gl!.uniform1f(uPhase, 1);
        gl!.bindTexture(gl!.TEXTURE_2D, inTex!);
        gl!.drawArrays(gl!.TRIANGLES, 0, mesh.vertexCount);
    }

    function tick(now: number): void {
        if (done) return;
        const elapsed = now - startTime;
        const raw = Math.min(elapsed / durationMs, 1);
        const eased = easeInOut(raw);
        drawFrame(eased);
        if (raw < 1) {
            rafId = requestAnimationFrame(tick);
        } else {
            finish();
        }
    }

    function finish(): void {
        if (done) return;
        done = true;
        cancelAnimationFrame(rafId);

        // Tear down GL — wrapped in try/catch because the context may have
        // been lost (or already released by loseContext() below).
        try {
            gl!.deleteTexture(outTex!);
            gl!.deleteTexture(inTex!);
            gl!.deleteBuffer(vbo!);
            gl!.deleteProgram(program!);
            const lose = gl!.getExtension("WEBGL_lose_context");
            if (lose) lose.loseContext();
        } catch {
            // ignore
        }

        // Restore incoming — outgoing is about to be removed by the caller.
        incoming.style.opacity = "";
        incoming.style.clipPath = "";
        onComplete();
    }

    glCanvas.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        finish();
    });

    rafId = requestAnimationFrame(tick);

    return { cancel: finish };
}

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

// Vortex vertex shader.
//
// Matches the CSS vortex math from transition.ts: each tile rotates around
// a line through the slide center (vertical axis for horizontal direction,
// horizontal axis for vertical direction), with per-tile Z bump and
// perpendicular drift modulated by sin(πt). Per-tile stagger is supplied as
// a vertex attribute so the sweep animates without CPU per-frame work.
//
// CSS-style perspective divide is applied manually around the slide center
// so the result matches the existing effect's projection.
const VORTEX_VS = `#version 300 es
precision highp float;

in vec2 a_localPos;    // vertex xy relative to tile center, in slide pixels
in vec2 a_tileCenter;  // tile center in slide pixels
in vec2 a_uv;          // texture coord (0..1, origin top-left)
in float a_staggerOut;
in float a_staggerIn;
in vec3 a_jitter;      // (zSign, zRand, driftRand)

uniform float u_t;            // eased animation time 0..1
uniform vec2  u_resolution;   // slide width/height in CSS pixels
uniform float u_isHorizontal; // 1 for left/right, 0 for up/down
uniform float u_rotSign;      // +1 or -1
uniform float u_phase;        // 0 = outgoing, 1 = incoming
uniform float u_perspective;  // CSS perspective, in pixels

out vec2 v_uv;
out float v_facing;

const float PI = 3.14159265;

// Rotation axis is pushed back into the screen by this fraction of the
// slide's longest side. A larger value means a bigger orbit radius — tiles
// arc visibly backward through the screen plane instead of only sliding
// sideways. The CSS fallback uses 0 (axis on the slide plane itself).
const float AXIS_DEPTH_FACTOR = 0.5;

float clamp01(float x) { return clamp(x, 0.0, 1.0); }

void main() {
    vec2 center = u_resolution * 0.5;
    vec2 rest = a_tileCenter + a_localPos;
    float axisDepth = max(u_resolution.x, u_resolution.y) * AXIS_DEPTH_FACTOR;

    float stagger = (u_phase < 0.5) ? a_staggerOut : a_staggerIn;
    float offset = (u_phase < 0.5) ? 0.0 : 0.1;
    float localT = clamp01((u_t - offset - stagger * 0.4) / 0.55);

    float baseDeg = (u_phase < 0.5)
        ? (localT * 180.0)
        : (-180.0 + localT * 180.0);
    float angle = radians(u_rotSign * baseDeg);

    // A tile shows its front while |rotation| < 90°.
    //   Outgoing: visible for localT < 0.5
    //   Incoming: visible for localT > 0.5
    v_facing = (u_phase < 0.5) ? step(localT, 0.5) : step(0.5, localT);

    float zSign = a_jitter.x;
    float zRand = a_jitter.y;
    float driftRand = a_jitter.z;
    float sinPi = sin(localT * PI);
    float zOffset = zSign * sinPi * 200.0 * zRand;

    // Drift is perpendicular to the rotation axis.
    vec2 d = center - a_tileCenter;
    float dPerp = (u_isHorizontal > 0.5) ? d.y : d.x;
    float drift = sinPi * dPerp * 0.5 * driftRand;

    float c = cos(angle);
    float s = sin(angle);

    // 3D orbit around an axis pushed back into the screen by axisDepth.
    //
    // Each vertex, relative to the axis, starts at offset (u, axisDepth)
    // in the rotation plane (xz for horizontal, yz for vertical). After
    // rotating by the angle, its new in-plane offset is:
    //   u' = c*u + s*axisDepth
    //   z' = -s*u + c*axisDepth
    // Converting back to world coords (axis sits at z = -axisDepth) gives
    // the formulas below. At angle=0 every vertex is at rest; at 180° the
    // tile is mirrored across the axis AND pushed to z = -2*axisDepth —
    // a real semicircular arc rather than an in-plane flip.
    vec3 world;
    if (u_isHorizontal > 0.5) {
        float u = rest.x - center.x;
        world.x = center.x + c * u + s * axisDepth;
        world.y = rest.y + drift;
        world.z = -s * u + axisDepth * (c - 1.0) + zOffset;
    } else {
        float v = rest.y - center.y;
        world.x = rest.x + drift;
        world.y = center.y + c * v - s * axisDepth;
        world.z = s * v + axisDepth * (c - 1.0) + zOffset;
    }

    // CSS-style perspective: camera at z = +P, perspective-origin = center.
    float wp = max(1.0 - world.z / u_perspective, 0.001);
    vec2 screen = center + (world.xy - center) / wp;

    // Slide pixels → clip space. Screen uses +y down; clip is +y up.
    float clipX = (screen.x / u_resolution.x) * 2.0 - 1.0;
    float clipY = 1.0 - (screen.y / u_resolution.y) * 2.0;
    // Preserve z for depth testing so overlapping tiles sort correctly.
    float clipZ = clamp(-world.z / u_perspective, -0.99, 0.99);

    gl_Position = vec4(clipX, clipY, clipZ, 1.0);
    v_uv = a_uv;
}
`;

const VORTEX_FS = `#version 300 es
precision highp float;

in vec2 v_uv;
in float v_facing;

uniform sampler2D u_tex;

out vec4 outColor;

void main() {
    // Backface hide without relying on winding/cull, so the shader works
    // regardless of y-flip conventions.
    if (v_facing < 0.5) discard;
    outColor = texture(u_tex, v_uv);
}
`;

// ---------------------------------------------------------------------------
// GL helpers
// ---------------------------------------------------------------------------

function createProgram(gl: WebGL2RenderingContext, vsSource: string, fsSource: string): WebGLProgram | null {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) {
        if (vs) gl.deleteShader(vs);
        if (fs) gl.deleteShader(fs);
        return null;
    }
    const program = gl.createProgram();
    if (!program) {
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        return null;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        return null;
    }
    return program;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function bindAttrib(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    name: string,
    size: number,
    stride: number,
    offset: number,
): void {
    const loc = gl.getAttribLocation(program, name);
    if (loc < 0) return;
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset);
}

function uploadTexture(gl: WebGL2RenderingContext, source: HTMLCanvasElement): WebGLTexture | null {
    const tex = gl.createTexture();
    if (!tex) return null;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // Keep UNPACK_FLIP_Y_WEBGL at its default (false): the source canvas's
    // top-left pixel lands at texel (0, 0), so uv (0, 0) samples the image
    // top-left — matching the screen-space UV convention used by the
    // vertex shader (which itself flips Y when emitting clip coords).
    // Using UNPACK_FLIP_Y=true here would cancel the shader's Y flip and
    // render the slide upside-down.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    } catch {
        gl.deleteTexture(tex);
        return null;
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
}

// ---------------------------------------------------------------------------
// Mesh
// ---------------------------------------------------------------------------

interface VortexMesh {
    data: Float32Array;
    vertexCount: number;
}

function buildVortexMesh(cols: number, rows: number, slideW: number, slideH: number, dir: SideDirection): VortexMesh {
    const tileW = slideW / cols;
    const tileH = slideH / rows;
    const FLOATS_PER_VERT = 11;
    const VERTS_PER_TILE = 6;
    const totalVerts = rows * cols * VERTS_PER_TILE;
    const data = new Float32Array(totalVerts * FLOATS_PER_VERT);

    let idx = 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const tileCenterX = (c + 0.5) * tileW;
            const tileCenterY = (r + 0.5) * tileH;

            const u0 = c / cols;
            const u1 = (c + 1) / cols;
            const v0 = r / rows;
            const v1 = (r + 1) / rows;

            // Per-tile stagger — mirrors setupVortex() in transition.ts so
            // the GL path visually matches the CSS fallback.
            const colN = c / Math.max(1, cols - 1);
            const rowN = r / Math.max(1, rows - 1);
            let outSt: number;
            let inSt: number;
            switch (dir) {
                case "right":
                    outSt = colN * 0.7 + rowN * 0.3;
                    inSt = (1 - colN) * 0.7 + (1 - rowN) * 0.3;
                    break;
                case "left":
                    outSt = (1 - colN) * 0.7 + rowN * 0.3;
                    inSt = colN * 0.7 + (1 - rowN) * 0.3;
                    break;
                case "down":
                    outSt = rowN * 0.7 + colN * 0.3;
                    inSt = (1 - rowN) * 0.7 + (1 - colN) * 0.3;
                    break;
                case "up":
                    outSt = (1 - rowN) * 0.7 + colN * 0.3;
                    inSt = rowN * 0.7 + (1 - colN) * 0.3;
                    break;
            }

            const jitter = (Math.random() - 0.5) * 0.15;
            const staggerOut = Math.max(0, Math.min(1, outSt + jitter));
            const staggerIn = Math.max(0, Math.min(1, inSt + jitter));

            const zSign = Math.random() < 0.5 ? -1 : 1;
            const zRand = 0.5 + Math.random();
            const driftRand = 0.3 + Math.random() * 1.4;

            // Two triangles per tile: A,B,C and A,C,D
            //   A = top-left   B = top-right
            //   D = bottom-left  C = bottom-right
            const hw = tileW / 2;
            const hh = tileH / 2;
            const tileVerts: ReadonlyArray<readonly [number, number, number, number]> = [
                [-hw, -hh, u0, v0], // A
                [hw, -hh, u1, v0], // B
                [hw, hh, u1, v1], // C
                [-hw, -hh, u0, v0], // A
                [hw, hh, u1, v1], // C
                [-hw, hh, u0, v1], // D
            ];

            for (const [lx, ly, u, v] of tileVerts) {
                data[idx++] = lx;
                data[idx++] = ly;
                data[idx++] = tileCenterX;
                data[idx++] = tileCenterY;
                data[idx++] = u;
                data[idx++] = v;
                data[idx++] = staggerOut;
                data[idx++] = staggerIn;
                data[idx++] = zSign;
                data[idx++] = zRand;
                data[idx++] = driftRand;
            }
        }
    }

    return { data, vertexCount: totalVerts };
}

// ---------------------------------------------------------------------------
// Easing — matches runTransition() in transition.ts.
// ---------------------------------------------------------------------------

function easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
