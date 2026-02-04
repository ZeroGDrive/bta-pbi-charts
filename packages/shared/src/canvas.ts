"use strict";

export interface CanvasLayer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    dpr: number;
    resize: (width: number, height: number) => void;
    clear: () => void;
}

function getOrCreateCanvas(root: HTMLElement, className: string): HTMLCanvasElement {
    const existing = root.querySelector(`canvas.${className}`) as HTMLCanvasElement | null;
    if (existing) return existing;

    const canvas = document.createElement("canvas");
    canvas.className = className;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", className);
    canvas.style.position = "absolute";
    // Safari < 14.1 doesn't support the inset shorthand.
    (canvas.style as any).inset = "0";
    canvas.style.top = "0";
    canvas.style.right = "0";
    canvas.style.bottom = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "auto";
    canvas.style.zIndex = "0";

    // Insert behind SVG overlay.
    root.insertBefore(canvas, root.firstChild);
    return canvas;
}

export function ensureHiDPICanvas(root: HTMLElement, className: string = "bta-canvas"): CanvasLayer | null {
    if (typeof document === "undefined") return null;

    // Ensure the container can host absolutely positioned layers.
    const pos = (typeof window !== "undefined" && window.getComputedStyle)
        ? window.getComputedStyle(root).position
        : root.style.position;
    if (!pos || pos === "static") {
        root.style.position = "relative";
    }

    const canvas = getOrCreateCanvas(root, className);
    const ctx = (canvas.getContext("2d", { desynchronized: true } as any) || canvas.getContext("2d")) as CanvasRenderingContext2D | null;
    if (!ctx) return null;

    const layer: CanvasLayer = {
        canvas,
        ctx,
        dpr: 1,
        resize: (width: number, height: number) => {
            const dpr = Math.max(1, Math.min(3, (window.devicePixelRatio || 1)));
            layer.dpr = dpr;

            const logicalW = Math.max(0, width);
            const logicalH = Math.max(0, height);

            // Set internal resolution to DPR-scaled pixels.
            canvas.width = Math.max(1, Math.floor(logicalW * dpr));
            canvas.height = Math.max(1, Math.floor(logicalH * dpr));

            // CSS size stays in logical pixels.
            canvas.style.width = `${Math.max(0, Math.floor(logicalW))}px`;
            canvas.style.height = `${Math.max(0, Math.floor(logicalH))}px`;

            // Reset transform and scale to logical pixels.
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.scale(dpr, dpr);
        },
        clear: () => {
            // Clear in logical pixels (context is already scaled to dpr).
            ctx.clearRect(0, 0, canvas.width / layer.dpr, canvas.height / layer.dpr);
        }
    };

    return layer;
}
