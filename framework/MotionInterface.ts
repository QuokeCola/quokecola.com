/**
 * MotionInterface — site-wide animation utilities for the terminal/schematic
 * design language: text scramble (decode) effects, scroll-driven reveals,
 * ordered-dither image processing, crosshair cursor HUD and live clocks.
 *
 * Apps call MotionInterface.observe() in onload() after their layout is
 * injected; global effects (HUD) are initialized once from main.ts.
 */
export class MotionInterface {

    private static readonly GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>/[]#*+-";
    private static scramble_timers: Map<HTMLElement, number> = new Map();
    private static reveal_observer: IntersectionObserver | null = null;
    private static dither_cache: Map<string, string> = new Map();
    private static hud_initialized = false;

    // Smooth scroll state
    private static scroller: HTMLElement | null = null;
    private static scroll_target = 0;
    private static scroll_current = 0;
    private static scroll_raf = 0;
    private static scroll_last_ts = 0;
    private static scroll_initialized = false;

    static reduced_motion(): boolean {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    /************************************************
     *  Text scramble (decode) effect
     ***********************************************/
    /**
     * Run a decode animation on an element: glyphs cycle randomly, then settle
     * into the original text from left to right.
     */
    static scramble(el: HTMLElement) {
        if (!el.dataset.scrambleText) {
            el.dataset.scrambleText = el.textContent ?? "";
        }
        const target = el.dataset.scrambleText;
        if (!target || this.reduced_motion()) {
            el.textContent = target ?? "";
            return;
        }
        const prev = this.scramble_timers.get(el);
        if (prev !== undefined) window.clearInterval(prev);

        const frame_ms = 30;
        // Total duration: ~2 frames per character, clamped to keep long lines snappy.
        const total_frames = Math.min(Math.max(target.length * 2, 8), 30);
        let frame = 0;
        const timer = window.setInterval(() => {
            frame++;
            const settled = Math.floor((frame / total_frames) * target.length);
            let out = "";
            for (let i = 0; i < target.length; i++) {
                const ch = target[i];
                if (i < settled || ch === " " || ch === "\n") {
                    out += ch;
                } else {
                    out += this.GLYPHS[Math.floor(Math.random() * this.GLYPHS.length)];
                }
            }
            el.textContent = out;
            if (frame >= total_frames) {
                el.textContent = target;
                window.clearInterval(timer);
                this.scramble_timers.delete(el);
            }
        }, frame_ms);
        this.scramble_timers.set(el, timer);
    }

    /************************************************
     *  Scroll reveals
     ***********************************************/
    /**
     * Scan root for .qk-reveal / .qk-scramble elements and reveal them when
     * they enter the viewport. Stagger delays are auto-assigned inside each
     * .qk-reveal-group container. Safe to call repeatedly (after app swaps).
     */
    static observe(root: HTMLElement | Document = document) {
        // Assign stagger delays within groups.
        root.querySelectorAll<HTMLElement>(".qk-reveal-group").forEach(group => {
            group.querySelectorAll<HTMLElement>(":scope .qk-reveal").forEach((el, i) => {
                el.style.setProperty("--reveal-delay", (i * 0.07).toFixed(2) + "s");
            });
        });

        if (this.reduced_motion()) {
            root.querySelectorAll<HTMLElement>(".qk-reveal").forEach(el => el.classList.add("is-in"));
            return;
        }

        if (!this.reveal_observer) {
            this.reveal_observer = new IntersectionObserver((entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    const el = entry.target as HTMLElement;
                    el.classList.add("is-in");
                    if (el.classList.contains("qk-scramble")) {
                        const delay = parseFloat(el.style.getPropertyValue("--reveal-delay") || "0") * 1000;
                        window.setTimeout(() => this.scramble(el), delay);
                    }
                    this.reveal_observer!.unobserve(el);
                }
            }, { threshold: 0.12 });
        }
        root.querySelectorAll<HTMLElement>(".qk-reveal, .qk-scramble").forEach(el => {
            if (!el.classList.contains("is-in")) this.reveal_observer!.observe(el);
        });

        this.bind_hover_scrambles(root);
        this.update_parallax();
    }

    /** Re-decode text on mouseenter for elements marked data-scramble-hover. */
    static bind_hover_scrambles(root: HTMLElement | Document = document) {
        root.querySelectorAll<HTMLElement>("[data-scramble-hover]").forEach(el => {
            if (el.dataset.scrambleHoverBound) return;
            el.dataset.scrambleHoverBound = "1";
            el.addEventListener("mouseenter", () => this.scramble(el));
        });
    }

    /************************************************
     *  Ordered (Bayer 8x8) image dithering
     ***********************************************/
    private static readonly BAYER8 = [
         0, 32,  8, 40,  2, 34, 10, 42,
        48, 16, 56, 24, 50, 18, 58, 26,
        12, 44,  4, 36, 14, 46,  6, 38,
        60, 28, 52, 20, 62, 30, 54, 22,
         3, 35, 11, 43,  1, 33,  9, 41,
        51, 19, 59, 27, 49, 17, 57, 25,
        15, 47,  7, 39, 13, 45,  5, 37,
        63, 31, 55, 23, 61, 29, 53, 21,
    ];

    /**
     * Convert an image to a 1-bit-look ordered-dither grayscale data URL.
     * Downsamples (max 480px wide) and pixel-doubles so the dither pattern
     * reads as a texture. Resolves with the original URL on any failure.
     */
    static async ditherToDataUrl(url: string): Promise<string> {
        const cached = this.dither_cache.get(url);
        if (cached) return cached;
        try {
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                const i = new Image();
                i.onload = () => resolve(i);
                i.onerror = reject;
                i.src = url;
            });
            const scale = Math.min(1, 480 / img.naturalWidth);
            const w = Math.max(1, Math.round(img.naturalWidth * scale));
            const h = Math.max(1, Math.round(img.naturalHeight * scale));
            const canvas = document.createElement("canvas");
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (!ctx) return url;
            ctx.drawImage(img, 0, 0, w, h);
            const data = ctx.getImageData(0, 0, w, h);
            const px = data.data;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    const i = (y * w + x) * 4;
                    const luma = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
                    const threshold = (this.BAYER8[(y % 8) * 8 + (x % 8)] + 0.5) / 64;
                    // 4-level dither (matches the blogroll post shader) — softer than 1-bit.
                    const level = Math.min(3, Math.floor(luma * 4 + threshold)) / 3;
                    const v = Math.round(level * 235 + 10);
                    px[i] = px[i + 1] = px[i + 2] = v;
                }
            }
            ctx.putImageData(data, 0, 0);
            const out = canvas.toDataURL("image/png");
            this.dither_cache.set(url, out);
            return out;
        } catch {
            return url;
        }
    }

    /** Load url, dither it, and apply as background-image of el. */
    static dither_background(el: HTMLElement, url: string) {
        this.ditherToDataUrl(url).then(dithered => {
            el.style.backgroundImage = `url("${dithered}")`;
        });
    }

    /************************************************
     *  Crosshair cursor HUD
     ***********************************************/
    /**
     * Global crosshair + coordinate readout following the pointer.
     * Desktop only; skipped for touch devices and reduced motion.
     */
    static init_hud() {
        if (this.hud_initialized) return;
        if (!window.matchMedia("(pointer: fine)").matches || this.reduced_motion()) return;
        this.hud_initialized = true;

        const hud = document.createElement("div");
        hud.id = "qk-hud";
        hud.innerHTML =
            `<div class="qk-hud-line-v"></div>` +
            `<div class="qk-hud-line-h"></div>` +
            `<div class="qk-hud-readout">X:0000 Y:0000</div>`;
        document.body.appendChild(hud);
        const line_v = hud.querySelector<HTMLElement>(".qk-hud-line-v")!;
        const line_h = hud.querySelector<HTMLElement>(".qk-hud-line-h")!;
        const readout = hud.querySelector<HTMLElement>(".qk-hud-readout")!;

        let raf = 0, mx = -1, my = -1;
        const render = () => {
            raf = 0;
            line_v.style.transform = `translateX(${mx}px)`;
            line_h.style.transform = `translateY(${my}px)`;
            const rx = Math.min(mx + 14, window.innerWidth - 110);
            const ry = Math.min(my + 18, window.innerHeight - 24);
            readout.style.transform = `translate(${rx}px, ${ry}px)`;
            readout.textContent =
                `X:${String(Math.round(mx)).padStart(4, "0")} Y:${String(Math.round(my)).padStart(4, "0")}`;
        };
        window.addEventListener("mousemove", (e) => {
            mx = e.clientX; my = e.clientY;
            hud.classList.add("qk-hud-active");
            if (!raf) raf = window.requestAnimationFrame(render);
        }, { passive: true });
        document.documentElement.addEventListener("mouseleave", () => {
            hud.classList.remove("qk-hud-active");
        });
    }

    /************************************************
     *  Inertial smooth scrolling (Lenis-style)
     *
     *  Wheel input feeds a target value; a rAF loop
     *  eases the real scrollTop toward it with
     *  frame-rate-independent exponential damping.
     *  scrollTop-based (not transform-based) so
     *  position:sticky and IntersectionObserver keep
     *  working. Touch and keyboard stay native.
     ***********************************************/
    static init_smooth_scroll() {
        if (this.scroll_initialized || this.reduced_motion()) return;
        const el = document.getElementById("content-screen");
        if (!el) return;
        this.scroll_initialized = true;
        this.scroller = el;
        this.scroll_target = this.scroll_current = el.scrollTop;

        el.addEventListener("wheel", (e: WheelEvent) => {
            if (e.ctrlKey) return; // browser zoom
            e.preventDefault();
            const step = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
            const max = el.scrollHeight - el.clientHeight;
            this.scroll_target = Math.max(0, Math.min(max, this.scroll_target + step));
            this.start_scroll_loop();
        }, { passive: false });

        // Resync when scrolling happens outside the loop (scrollbar drag,
        // keyboard, focus jumps, app swaps resetting content height).
        el.addEventListener("scroll", () => {
            if (Math.abs(el.scrollTop - this.scroll_current) > 2 && !this.scroll_raf) {
                this.scroll_target = this.scroll_current = el.scrollTop;
                this.update_parallax();
            }
        }, { passive: true });
    }

    private static start_scroll_loop() {
        if (this.scroll_raf) return;
        this.scroll_last_ts = performance.now();
        const tick = (ts: number) => {
            const el = this.scroller!;
            const dt = Math.min((ts - this.scroll_last_ts) / 1000, 0.05);
            this.scroll_last_ts = ts;
            const max = el.scrollHeight - el.clientHeight;
            this.scroll_target = Math.max(0, Math.min(max, this.scroll_target));
            // Frame-rate independent exponential damping.
            const k = 1 - Math.exp(-9 * dt);
            this.scroll_current += (this.scroll_target - this.scroll_current) * k;
            if (Math.abs(this.scroll_target - this.scroll_current) < 0.4) {
                this.scroll_current = this.scroll_target;
                el.scrollTop = this.scroll_current;
                this.update_parallax();
                this.scroll_raf = 0;
                return;
            }
            el.scrollTop = this.scroll_current;
            this.update_parallax();
            this.scroll_raf = window.requestAnimationFrame(tick);
        };
        this.scroll_raf = window.requestAnimationFrame(tick);
    }

    /** Glide (or jump) the content screen to a scroll offset. */
    static scroll_to(y: number, immediate = false) {
        const el = this.scroller ?? document.getElementById("content-screen");
        if (!el) return;
        if (immediate || this.reduced_motion() || !this.scroll_initialized) {
            this.scroll_target = this.scroll_current = y;
            el.scrollTop = y;
            return;
        }
        this.scroll_target = y;
        this.start_scroll_loop();
    }

    /************************************************
     *  Scroll parallax
     *  [data-qk-parallax="0.06"] drifts against the
     *  scroll; offset computed from the parent's
     *  position so the element's own transform never
     *  feeds back into the measurement.
     ***********************************************/
    private static update_parallax() {
        if (this.reduced_motion()) return;
        const vh = window.innerHeight;
        document.querySelectorAll<HTMLElement>("[data-qk-parallax]").forEach(el => {
            const anchor = el.parentElement ?? el;
            const r = anchor.getBoundingClientRect();
            if (r.bottom < -vh || r.top > vh * 2) return;
            const factor = parseFloat(el.dataset.qkParallax || "0");
            const mid = r.top + r.height / 2 - vh / 2;
            el.style.transform = `translate3d(0, ${(mid * factor).toFixed(2)}px, 0)`;
        });
    }

    /************************************************
     *  Live clock readout
     ***********************************************/
    /** Write a live HH:MM:SS clock into el. Returns a stop function. */
    static clock(el: HTMLElement): () => void {
        const tick = () => {
            const d = new Date();
            const p = (n: number) => String(n).padStart(2, "0");
            el.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
        };
        tick();
        const timer = window.setInterval(tick, 1000);
        return () => window.clearInterval(timer);
    }

    /** Bind clocks to all [data-qk-clock] elements under root (idempotent). */
    static bind_clocks(root: HTMLElement | Document = document) {
        root.querySelectorAll<HTMLElement>("[data-qk-clock]").forEach(el => {
            if (el.dataset.qkClockBound) return;
            el.dataset.qkClockBound = "1";
            this.clock(el);
        });
    }
}
