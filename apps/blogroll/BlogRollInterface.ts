import { ContentLoaderInterface } from "../../framework/ContentLoaderInterface";
import * as THREE from 'three';
import { BlogRollInterfaceData } from "./BlogRollInterfaceData";

const GLOBE_RADIUS    = 4;
const ARC_COUNT       = 10;
const ARC_PTS         = 100;   // curve resolution (vertices per arc)
const ARC_TRAIL       = 30;    // how many vertices are visible at once
const ARC_MAX_HEIGHT  = 1.6;   // peak altitude of arc above globe surface

interface ArcData {
    progress: number;   // 0 → 1 + ARC_TRAIL/ARC_PTS  (then resets)
    speed: number;      // progress units per second
    geometry: THREE.BufferGeometry;
    line: THREE.Line;
}

export class BlogRollInterface {
    static html_url  = "./apps/blogroll/layout.html";
    static css_urls: string[] = ["./apps/blogroll/assets/css/blogroll_layout.css"];

    private canvas: HTMLCanvasElement;
    private canvas_container: HTMLElement;
    private renderer: THREE.WebGLRenderer;
    private camera: THREE.PerspectiveCamera;
    private scene: THREE.Scene;

    private globeGroup: THREE.Group;
    private arcs: ArcData[] = [];

    private mouse: THREE.Vector2;
    private resize_observer: ResizeObserver;
    private animationFrameId: number;
    private lastTime: number = 0;
    private camera_movement_x: number = 0;
    private camera_movement_y: number = 0;

    private blogroll_list_container: HTMLElement;
    private document_info: BlogRollInterfaceData[];

    // ── Static factory ────────────────────────────────────────────────────────
    static async create_layout() {
        for (const url of this.css_urls) ContentLoaderInterface.set_app_customize_css(url);
        const response  = await fetch(this.html_url);
        const parser    = new DOMParser();
        const html_doc  = parser.parseFromString(await response.text(), 'text/html');
        ContentLoaderInterface.set_app_layout(html_doc.body.children[0].innerHTML);
        const instance  = new BlogRollInterface();
        await instance.init();
        return instance;
    }

    constructor() {
        this.render      = this.render.bind(this);
        this.onResize    = this.onResize.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Convert lat/lon (degrees) to a unit vector on the sphere. */
    private latLonToNorm(lat: number, lon: number): THREE.Vector3 {
        const phi   = (90 - lat)   * (Math.PI / 180);
        const theta = (lon + 180)  * (Math.PI / 180);
        return new THREE.Vector3(
            -Math.sin(phi) * Math.cos(theta),
             Math.cos(phi),
             Math.sin(phi) * Math.sin(theta)
        );
    }

    private randomNorm(): THREE.Vector3 {
        return this.latLonToNorm(
            (Math.random() - 0.5) * 160,
            (Math.random() - 0.5) * 360
        );
    }

    /**
     * Fill a pre-allocated BufferAttribute with the great-circle arc between
     * src and dst, lifted above the surface by a sin-shaped altitude.
     * Vertex colors fade from white (index 0, source) to dark gray (index N-1, dest)
     * so the head of a travelling arc is always the most visible.
     */
    private fillArcBuffer(
        posAttr: THREE.BufferAttribute,
        colAttr: THREE.BufferAttribute,
        src: THREE.Vector3,
        dst: THREE.Vector3
    ) {
        for (let i = 0; i < ARC_PTS; i++) {
            const t   = i / (ARC_PTS - 1);
            const pt  = src.clone().lerp(dst, t).normalize();
            pt.multiplyScalar(GLOBE_RADIUS + Math.sin(t * Math.PI) * ARC_MAX_HEIGHT);
            posAttr.setXYZ(i, pt.x, pt.y, pt.z);

            // Head (high i) is dark-gray; tail (low i) fades to white background
            const c = 1.0 - t * 0.72;   // 1.0 (white) → 0.28 (dark gray)
            colAttr.setXYZ(i, c, c, c);
        }
        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
    }

    /** Create a brand-new arc, add its Line to the globe group. */
    private createArc(initialProgress: number): ArcData {
        const posAttr = new THREE.BufferAttribute(new Float32Array(ARC_PTS * 3), 3);
        const colAttr = new THREE.BufferAttribute(new Float32Array(ARC_PTS * 3), 3);
        this.fillArcBuffer(posAttr, colAttr, this.randomNorm(), this.randomNorm());

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', posAttr);
        geo.setAttribute('color',    colAttr);
        geo.setDrawRange(0, 0);

        const mat  = new THREE.LineBasicMaterial({ vertexColors: true });
        const line = new THREE.Line(geo, mat);
        this.globeGroup.add(line);

        return {
            progress: initialProgress,
            speed:    0.18 + Math.random() * 0.18,
            geometry: geo,
            line
        };
    }

    /** Recycle an arc by writing new curve data into its existing buffers. */
    private resetArc(arc: ArcData) {
        const posAttr = arc.geometry.getAttribute('position') as THREE.BufferAttribute;
        const colAttr = arc.geometry.getAttribute('color')    as THREE.BufferAttribute;
        this.fillArcBuffer(posAttr, colAttr, this.randomNorm(), this.randomNorm());
        arc.geometry.setDrawRange(0, 0);
        arc.progress = 0;
        arc.speed    = 0.18 + Math.random() * 0.18;
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    async init() {
        this.canvas_container        = document.getElementById("blogroll-canvas-container");
        this.blogroll_list_container = document.getElementById("blogroll-list-container");
        this.canvas = document.getElementById("blogroll-threejs-canvas") as HTMLCanvasElement;
        this.blogroll_list_container.innerHTML = "";

        // Load friend list
        let resp = await fetch("./apps/blogroll/blogroll_list.json");
        while (!resp.ok) resp = await fetch("./apps/blogroll/blogroll_list.json");
        this.document_info = JSON.parse(await resp.text());

        for (const doc of this.document_info) {
            const card  = document.createElement("div");
            const img   = document.createElement("div");
            const text  = document.createElement("div");
            const title = document.createElement("h1");
            const descr = document.createElement("p");
            title.innerText = doc.title;
            descr.innerText = doc.descrp;
            card.classList.add("blogroll-card");
            text.classList.add("loading-components-light", "blogroll-card-text");
            img.classList.add("blogroll-card-image");
            img.style.backgroundImage = `url("${doc.img}")`;
            text.append(title, descr);
            card.append(img, text);
            card.onclick = () => window.open(doc.url, '_blank').focus();
            const loader = new Image();
            loader.addEventListener("load", () =>
                text.classList.replace("loading-components-light", "loaded-components-light")
            );
            loader.src = doc.img;
            this.blogroll_list_container.appendChild(card);
        }

        if (!this.canvas || !this.canvas_container) return;

        this.canvas_container.style.position        = "relative";
        this.canvas_container.style.overflow        = "hidden";
        this.canvas_container.style.backgroundColor = "#ffffff";

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: this.canvas, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0xffffff, 1);

        const width  = this.canvas_container.clientWidth;
        const height = this.canvas_container.clientHeight;
        this.renderer.setSize(width, height);

        // Camera — slightly above centre, looking at origin
        this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        this.camera.position.set(0, 2, 12);
        this.camera.lookAt(0, 0, 0);

        // Scene + fog
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0xffffff, 0.018);

        // Lighting (gives the sphere a 3-D shaded look)
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.45));
        const sun = new THREE.DirectionalLight(0xffffff, 0.75);
        sun.position.set(8, 6, 8);
        this.scene.add(sun);

        // Globe group — rotates as a unit
        this.globeGroup = new THREE.Group();
        this.scene.add(this.globeGroup);

        // Base sphere — lit, very light gray
        const baseMat = new THREE.MeshPhongMaterial({
            color:     0xebebeb,
            specular:  0xffffff,
            shininess: 18,
        });
        this.globeGroup.add(new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS, 64, 32), baseMat));

        // Lat/lon wireframe grid sitting just above the base
        const gridMat = new THREE.MeshBasicMaterial({
            color:       0xbbbbbb,
            wireframe:   true,
            transparent: true,
            opacity:     0.30,
        });
        this.globeGroup.add(
            new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS + 0.02, 36, 18), gridMat)
        );

        // Arcs — stagger starting progress so they aren't all in sync
        const doneThreshold = 1 + ARC_TRAIL / ARC_PTS;
        for (let i = 0; i < ARC_COUNT; i++) {
            this.arcs.push(this.createArc(Math.random() * doneThreshold));
        }

        // Mouse & resize
        this.mouse = new THREE.Vector2(9999, 9999);
        this.resize_observer = new ResizeObserver(this.onResize);
        this.resize_observer.observe(this.canvas_container);
        this.canvas_container.addEventListener('mousemove', this.onMouseMove);

        this.render(0);
    }

    onMouseMove(event: MouseEvent) {
        const rect    = this.canvas.getBoundingClientRect();
        this.mouse.x  =  ((event.clientX - rect.left) / rect.width)  * 2 - 1;
        this.mouse.y  = -((event.clientY - rect.top)  / rect.height) * 2 + 1;
    }

    onResize() {
        if (!this.canvas_container || !this.camera || !this.renderer) return;
        const w = this.canvas_container.clientWidth;
        const h = this.canvas_container.clientHeight;
        this.renderer.setSize(w, h);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.render(this.scene, this.camera);
    }

    // ── Render loop ───────────────────────────────────────────────────────────

    render(time: number) {
        time *= 0.001;  // ms → s
        const dt = this.lastTime > 0 ? Math.min(time - this.lastTime, 0.05) : 0;
        this.lastTime = time;

        // Slow globe auto-rotation
        this.globeGroup.rotation.y = time * 0.09;

        // Advance each arc along its curve
        const doneThreshold = 1 + ARC_TRAIL / ARC_PTS;
        for (const arc of this.arcs) {
            arc.progress += arc.speed * dt;
            if (arc.progress >= doneThreshold) {
                this.resetArc(arc);
                continue;
            }
            const headIdx = Math.min(Math.floor(arc.progress * ARC_PTS), ARC_PTS);
            const tailIdx = Math.max(0, headIdx - ARC_TRAIL);
            arc.geometry.setDrawRange(tailIdx, headIdx - tailIdx);
        }

        // Smooth camera follow mouse
        const inBounds = Math.abs(this.mouse.x) <= 0.9 && Math.abs(this.mouse.y) <= 0.9;
        if (inBounds) {
            this.camera_movement_x = 0.96 * this.camera_movement_x + 0.04 * this.mouse.x;
            this.camera_movement_y = 0.96 * this.camera_movement_y + 0.04 * this.mouse.y;
        } else {
            this.camera_movement_x /= 1.02;
            this.camera_movement_y /= 1.02;
        }
        this.camera.position.set(
            this.camera_movement_x * 3,
            this.camera_movement_y * 2 + 2,
            12
        );
        this.camera.lookAt(0, 0, 0);

        this.renderer.render(this.scene, this.camera);
        this.animationFrameId = requestAnimationFrame(this.render);
    }

    // ── Cleanup ───────────────────────────────────────────────────────────────

    destroy() {
        cancelAnimationFrame(this.animationFrameId);
        if (this.resize_observer) this.resize_observer.disconnect();
        if (this.canvas_container) this.canvas_container.removeEventListener('mousemove', this.onMouseMove);
        if (this.renderer) this.renderer.dispose();
        for (const arc of this.arcs) {
            arc.geometry.dispose();
            if (arc.line.material instanceof THREE.Material) arc.line.material.dispose();
        }
    }
}
