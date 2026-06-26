import { ContentLoaderInterface } from "../../framework/ContentLoaderInterface";
import * as THREE from 'three';
import { BlogRollInterfaceData } from "./BlogRollInterfaceData";

// ── Constants ─────────────────────────────────────────────────────────────────
const GLOBE_RADIUS   = 6;
const ARC_COUNT      = 10;
const ARC_PTS        = 100;
const ARC_TRAIL      = 30;
const ARC_MAX_HEIGHT = 2.0;

// ── Minimal inline TopoJSON decoder ──────────────────────────────────────────
interface TopoJSON {
    transform: { scale: [number, number]; translate: [number, number] };
    arcs: number[][][];
    objects: {
        land: { geometries: Array<{ type: string; arcs: number[][][] | number[][] }> };
    };
}

function decodeTopoArc(topo: TopoJSON, idx: number): [number, number][] {
    const rev  = idx < 0;
    const raw  = topo.arcs[rev ? ~idx : idx];
    const [sx, sy] = topo.transform.scale;
    const [tx, ty] = topo.transform.translate;
    let x = 0, y = 0;
    const pts: [number, number][] = raw.map(([dx, dy]) => {
        x += dx; y += dy;
        return [x * sx + tx, y * sy + ty]; // [lon, lat]
    });
    return rev ? pts.reverse() : pts;
}

function topoRings(
    topo: TopoJSON,
    geom: { type: string; arcs: number[][][] | number[][] }
): [number, number][][] {
    const polys = geom.type === 'Polygon'
        ? [geom.arcs as number[][]]
        : geom.arcs as number[][][];
    return polys.flatMap(poly =>
        poly.map(ring => ring.flatMap(i => decodeTopoArc(topo, i)))
    );
}

// ── Arc data ──────────────────────────────────────────────────────────────────
interface ArcData {
    progress: number;
    speed: number;
    geometry: THREE.BufferGeometry;
    line: THREE.Line;
}

// ── Main class ────────────────────────────────────────────────────────────────
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
    private earthOutlineGeo: THREE.BufferGeometry | null = null;
    private toDispose: Array<THREE.BufferGeometry | THREE.Material> = [];

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
        const response = await fetch(this.html_url);
        const parser   = new DOMParser();
        const html_doc = parser.parseFromString(await response.text(), 'text/html');
        ContentLoaderInterface.set_app_layout(html_doc.body.children[0].innerHTML);
        const instance = new BlogRollInterface();
        await instance.init();
        return instance;
    }

    constructor() {
        this.render      = this.render.bind(this);
        this.onResize    = this.onResize.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private latLonToVec3(lat: number, lon: number, r: number = GLOBE_RADIUS): THREE.Vector3 {
        const phi   = (90 - lat)  * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        return new THREE.Vector3(
            -Math.sin(phi) * Math.cos(theta) * r,
             Math.cos(phi) * r,
             Math.sin(phi) * Math.sin(theta) * r
        );
    }

    private randomGlobeVec3(): THREE.Vector3 {
        const lat = (Math.random() - 0.5) * 160;
        const lon = (Math.random() - 0.5) * 360;
        return this.latLonToVec3(lat, lon, 1); // unit vector
    }

    // ── Continent outlines ────────────────────────────────────────────────────

    private async buildEarthOutlines() {
        const resp = await fetch('./apps/blogroll/assets/data/countries-110m.json');
        if (!resp.ok) return;
        const topo: TopoJSON = await resp.json();

        const verts: THREE.Vector3[] = [];
        for (const geom of topo.objects.land.geometries) {
            for (const ring of topoRings(topo, geom)) {
                for (let i = 0; i < ring.length - 1; i++) {
                    const [lonA, latA] = ring[i];
                    const [lonB, latB] = ring[i + 1];
                    verts.push(
                        this.latLonToVec3(latA, lonA),
                        this.latLonToVec3(latB, lonB)
                    );
                }
            }
        }

        this.earthOutlineGeo = new THREE.BufferGeometry().setFromPoints(verts);
        const mat = new THREE.LineBasicMaterial({
            color:       0x555555,
            transparent: true,
            opacity:     0.75,
            depthWrite:  false,
        });
        this.toDispose.push(this.earthOutlineGeo, mat);
        this.globeGroup.add(new THREE.LineSegments(this.earthOutlineGeo, mat));
    }

    // ── Globe lat/lon grid ────────────────────────────────────────────────────

    private buildGlobeGrid() {
        const r    = GLOBE_RADIUS + 0.02;
        const segs = 72;
        const verts: THREE.Vector3[] = [];

        // Latitude circles every 20°
        for (let lat = -80; lat <= 80; lat += 20) {
            for (let j = 0; j < segs; j++) {
                const lon1 = (j / segs) * 360 - 180;
                const lon2 = ((j + 1) / segs) * 360 - 180;
                verts.push(this.latLonToVec3(lat, lon1, r), this.latLonToVec3(lat, lon2, r));
            }
        }

        // Longitude meridians every 20°
        for (let lon = -180; lon < 180; lon += 20) {
            for (let j = 0; j < segs; j++) {
                const lat1 = -90 + (j / segs) * 180;
                const lat2 = -90 + ((j + 1) / segs) * 180;
                verts.push(this.latLonToVec3(lat1, lon, r), this.latLonToVec3(lat2, lon, r));
            }
        }

        const geo = new THREE.BufferGeometry().setFromPoints(verts);
        const mat = new THREE.LineBasicMaterial({ color: 0xc8c8c8, transparent: true, opacity: 0.25, depthWrite: false });
        this.toDispose.push(geo, mat);
        this.globeGroup.add(new THREE.LineSegments(geo, mat));
    }

    // ── Arc management ────────────────────────────────────────────────────────

    private fillArcBuffers(
        posAttr: THREE.BufferAttribute,
        colAttr: THREE.BufferAttribute,
        src: THREE.Vector3,
        dst: THREE.Vector3
    ) {
        for (let i = 0; i < ARC_PTS; i++) {
            const t  = i / (ARC_PTS - 1);
            const pt = src.clone().lerp(dst, t).normalize();
            pt.multiplyScalar(GLOBE_RADIUS + Math.sin(t * Math.PI) * ARC_MAX_HEIGHT);
            posAttr.setXYZ(i, pt.x, pt.y, pt.z);
            // Head (high i, near dst) is dark; tail fades to white
            const c = 1.0 - t * 0.72;
            colAttr.setXYZ(i, c, c, c);
        }
        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
    }

    private createArc(initialProgress: number): ArcData {
        const posAttr = new THREE.BufferAttribute(new Float32Array(ARC_PTS * 3), 3);
        const colAttr = new THREE.BufferAttribute(new Float32Array(ARC_PTS * 3), 3);
        this.fillArcBuffers(posAttr, colAttr, this.randomGlobeVec3(), this.randomGlobeVec3());

        const geo  = new THREE.BufferGeometry();
        geo.setAttribute('position', posAttr);
        geo.setAttribute('color',    colAttr);
        geo.setDrawRange(0, 0);

        const mat  = new THREE.LineBasicMaterial({ vertexColors: true, depthWrite: false, transparent: true, opacity: 1.0 });
        const line = new THREE.Line(geo, mat);
        this.toDispose.push(geo, mat);
        this.globeGroup.add(line);

        return { progress: initialProgress, speed: 0.18 + Math.random() * 0.18, geometry: geo, line };
    }

    private resetArc(arc: ArcData) {
        const posAttr = arc.geometry.getAttribute('position') as THREE.BufferAttribute;
        const colAttr = arc.geometry.getAttribute('color')    as THREE.BufferAttribute;
        this.fillArcBuffers(posAttr, colAttr, this.randomGlobeVec3(), this.randomGlobeVec3());
        arc.geometry.setDrawRange(0, 0);
        arc.progress = 0;
        arc.speed    = 0.18 + Math.random() * 0.18;
        (arc.line.material as THREE.LineBasicMaterial).opacity = 1.0;
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
        this.renderer.setClearColor(0xffffff, 0); // transparent — CSS grid shows through
        const width  = this.canvas_container.clientWidth;
        const height = this.canvas_container.clientHeight;
        this.renderer.setSize(width, height);

        // Camera
        this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 1000);
        this.camera.position.set(1, 1, 1);
        this.camera.lookAt(0, 0, 0);

        // Scene + fog
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0xffffff, 0.013);

        // Globe group — offset right and down so only the upper arc is visible
        this.globeGroup = new THREE.Group();
        this.globeGroup.position.set(5, -5, 5);
        this.globeGroup.rotation.z = -Math.PI / 2;
        this.scene.add(this.globeGroup);

        // ── Occlusion sphere ───────────────────────────────────────────────
        // Opaque, invisible sphere that writes only to the depth buffer.
        // Lines behind the globe are correctly hidden by depth testing.
        const occGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 0.995, 64, 32);
        const occMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // white — blocks CSS grid from bleeding through globe interior
        const occMesh = new THREE.Mesh(occGeo, occMat);
        occMesh.renderOrder = -1;   // render first so depth is ready for lines
        this.toDispose.push(occGeo, occMat);
        this.globeGroup.add(occMesh);

        // ── Lat / lon line grid (matches background grid style) ───────────
        this.buildGlobeGrid();

        // ── Continent outlines (async — arcs can start immediately) ────────
        this.buildEarthOutlines(); // fire and forget; outlines appear once loaded

        // ── Flying arcs ────────────────────────────────────────────────────
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
        const rect   = this.canvas.getBoundingClientRect();
        this.mouse.x =  ((event.clientX - rect.left) / rect.width)  * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top)  / rect.height) * 2 + 1;
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
        time *= 0.001;
        const dt = this.lastTime > 0 ? Math.min(time - this.lastTime, 0.05) : 0;
        this.lastTime = time;

        // Slow auto-rotation
        this.globeGroup.rotation.x = time * 0.09;

        // Advance arcs
        const doneThreshold = 1 + ARC_TRAIL / ARC_PTS;
        for (const arc of this.arcs) {
            arc.progress += arc.speed * dt;
            if (arc.progress >= doneThreshold) { this.resetArc(arc); continue; }
            // rawHead may exceed ARC_PTS; tail advances past the endpoint so the
            // trail keeps sliding after the head touches the destination.
            const rawHead = Math.floor(arc.progress * ARC_PTS);
            const head    = Math.min(rawHead, ARC_PTS);
            const tail    = Math.min(Math.max(0, rawHead - ARC_TRAIL), ARC_PTS);
            arc.geometry.setDrawRange(tail, Math.max(0, head - tail));
            if (arc.progress > 1.0) {
                const fadeProgress = (arc.progress - 1.0) / (ARC_TRAIL / ARC_PTS);
                (arc.line.material as THREE.LineBasicMaterial).opacity = Math.max(0, 1 - fadeProgress);
            }
        }

        // Smooth camera follow
        const inBounds = Math.abs(this.mouse.x) <= 0.9 && Math.abs(this.mouse.y) <= 0.9;
        if (inBounds) {
            this.camera_movement_x = 0.96 * this.camera_movement_x + 0.04 * this.mouse.x;
            this.camera_movement_y = 0.96 * this.camera_movement_y + 0.04 * this.mouse.y;
        } else {
            this.camera_movement_x /= 1.02;
            this.camera_movement_y /= 1.02;
        }
        this.camera.position.set(
            this.camera_movement_x * 1.5,
            this.camera_movement_y * 0.8 + 2,
            11
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
        for (const obj of this.toDispose) obj.dispose();
    }
}
