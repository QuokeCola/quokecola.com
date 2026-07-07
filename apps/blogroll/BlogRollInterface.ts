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

    // Background
    private bgScene    : THREE.Scene;
    private bgCamera   : THREE.OrthographicCamera;
    private bgMaterial : THREE.ShaderMaterial;

    // Post-processing
    private renderTarget  : THREE.WebGLRenderTarget;
    private postScene     : THREE.Scene;
    private postCamera    : THREE.OrthographicCamera;
    private postMaterial  : THREE.ShaderMaterial;
    private bayerTexture  : THREE.DataTexture;
    private glitchIntensity: number = 0;
    private prevMouseX   : number = 0;
    private prevMouseY   : number = 0;

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
        const mat = new THREE.LineBasicMaterial({ color: 0xc8c8c8, transparent: true, opacity: 0.50, depthWrite: false });
        this.toDispose.push(geo, mat);
        this.globeGroup.add(new THREE.LineSegments(geo, mat));
    }

    // ── Background grid ───────────────────────────────────────────────────────

    private setupBackground(width: number, height: number) {
        this.bgMaterial = new THREE.ShaderMaterial({
            uniforms: {
                resolution: { value: new THREE.Vector2(width, height) },
                gridOffset: { value: new THREE.Vector2(0, 0) },
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position.xy, 0.0, 1.0);
                }
            `,
            fragmentShader: `
                precision highp float;
                uniform vec2 resolution;
                uniform vec2 gridOffset;
                varying vec2 vUv;

                void main() {
                    float cellSize = 159.0;
                    float halfCell = 79.5;

                    // CSS-pixel position with parallax offset
                    vec2 pixPos = vUv * resolution + gridOffset;

                    // Thin grid lines at every halfCell px
                    vec2 lineMod = mod(pixPos, halfCell);
                    float distX  = min(lineMod.x, halfCell - lineMod.x);
                    float distY  = min(lineMod.y, halfCell - lineMod.y);
                    float lineA  = max(
                        1.0 - smoothstep(0.0, 0.75, distX),
                        1.0 - smoothstep(0.0, 0.75, distY)
                    );

                    // Cross marks at full-cell centers
                    vec2  crossMod = mod(pixPos + halfCell, cellSize) - halfCell;
                    float crossH   = step(abs(crossMod.y), 1.0) * step(abs(crossMod.x), 5.0);
                    float crossV   = step(abs(crossMod.x), 1.0) * step(abs(crossMod.y), 5.0);
                    float crossA   = max(crossH, crossV);

                    vec3 col = vec3(1.0);
                    col = mix(col, vec3(0.863), lineA);   // #dcddde
                    col = mix(col, vec3(0.710), crossA);  // #b5b5b5
                    gl_FragColor = vec4(col, 1.0);
                }
            `,
            depthTest:  false,
            depthWrite: false,
        });

        const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.bgMaterial);
        quad.frustumCulled = false;
        this.bgScene  = new THREE.Scene();
        this.bgScene.add(quad);
        this.bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    }

    // ── Post-processing ───────────────────────────────────────────────────────

    private setupPostProcessing(width: number, height: number) {
        const bayerRaw = [
             0, 32,  8, 40,  2, 34, 10, 42,
            48, 16, 56, 24, 50, 18, 58, 26,
            12, 44,  4, 36, 14, 46,  6, 38,
            60, 28, 52, 20, 62, 30, 54, 22,
             3, 35, 11, 43,  1, 33,  9, 41,
            51, 19, 59, 27, 49, 17, 57, 25,
            15, 47,  7, 39, 13, 45,  5, 37,
            63, 31, 55, 23, 61, 29, 53, 21,
        ];
        const bayerData = new Uint8Array(64 * 4);
        for (let i = 0; i < 64; i++) {
            const v = Math.round(bayerRaw[i] / 63 * 255);
            bayerData[i*4] = bayerData[i*4+1] = bayerData[i*4+2] = v;
            bayerData[i*4+3] = 255;
        }
        this.bayerTexture = new THREE.DataTexture(bayerData, 8, 8, THREE.RGBAFormat);
        this.bayerTexture.magFilter = THREE.NearestFilter;
        this.bayerTexture.minFilter = THREE.NearestFilter;
        this.bayerTexture.wrapS    = THREE.RepeatWrapping;
        this.bayerTexture.wrapT    = THREE.RepeatWrapping;
        this.bayerTexture.needsUpdate = true;

        const dpr = window.devicePixelRatio;
        this.renderTarget = new THREE.WebGLRenderTarget(
            Math.floor(width * dpr), Math.floor(height * dpr),
            { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat }
        );

        this.postMaterial = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse:   { value: this.renderTarget.texture },
                tBayer:     { value: this.bayerTexture },
                time:       { value: 0.0 },
                glitch:     { value: 0.0 },
                mouseUv:    { value: new THREE.Vector2(0.5, 0.5) },
                resolution: { value: new THREE.Vector2(Math.floor(width * dpr), Math.floor(height * dpr)) },
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position.xy, 0.0, 1.0);
                }
            `,
            fragmentShader: `
                precision highp float;
                uniform sampler2D tDiffuse;
                uniform sampler2D tBayer;
                uniform float     time;
                uniform float     glitch;
                uniform vec2      mouseUv;
                uniform vec2      resolution;
                varying vec2      vUv;

                float rand(vec2 co) {
                    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
                }

                void main() {
                    vec2 uv = vUv;

                    // Glitch: horizontal strip shifts (gray-safe — no channel separation)
                    if (glitch > 0.001) {
                        float row = floor(uv.y * resolution.y / 4.0);
                        float t   = floor(time * 18.0);
                        if (rand(vec2(row, t)) > 0.80 - glitch * 0.28) {
                            float sh = (rand(vec2(row * 1.31, t * 0.71)) - 0.5) * 0.07 * glitch;
                            uv.x = fract(uv.x + sh);
                        }
                        float br = floor(uv.y * 7.0);
                        if (rand(vec2(br, floor(time * 5.0))) > 0.95) {
                            uv.x = fract(uv.x + (rand(vec2(br * 2.1, time)) - 0.5) * 0.13 * glitch);
                        }
                    }

                    // Sample + desaturate — pure grayscale, no chromatic aberration
                    vec4  color = texture2D(tDiffuse, uv);
                    float luma  = dot(color.rgb, vec3(0.299, 0.587, 0.114));

                    // Shallow gray bloom: 5-tap cross blur mixed in softly
                    vec2  ts    = 1.0 / resolution;
                    float bw    = 7.0;
                    float blurL = (
                        luma * 4.0
                        + dot(texture2D(tDiffuse, uv + vec2( bw, 0.0) * ts).rgb, vec3(0.299, 0.587, 0.114))
                        + dot(texture2D(tDiffuse, uv + vec2(-bw, 0.0) * ts).rgb, vec3(0.299, 0.587, 0.114))
                        + dot(texture2D(tDiffuse, uv + vec2(0.0,  bw) * ts).rgb, vec3(0.299, 0.587, 0.114))
                        + dot(texture2D(tDiffuse, uv + vec2(0.0, -bw) * ts).rgb, vec3(0.299, 0.587, 0.114))
                    ) / 8.0;
                    luma = luma * 0.82 + blurL * 0.18;
                    color.rgb = vec3(luma);

                    // Ordered dithering: init burst + mouse radial + small baseline
                    vec2  pix      = floor(vUv * resolution);
                    float bayer    = texture2D(tBayer, pix / 8.0).r;
                    float initFade = exp(-time * 0.6);
                    float dist     = length(vUv - mouseUv);
                    float radial   = 1.0 - smoothstep(0.0, 0.3, dist);
                    float mid      = smoothstep(0.03, 0.5, luma) * smoothstep(0.99, 0.55, luma);
                    float amt      = clamp(0.05 + radial * 0.45 + initFade * 0.65, 0.0, 0.85) * mid;
                    float dithered = floor(luma * 4.0 + bayer) / 4.0;
                    color.rgb = vec3(mix(luma, dithered, amt));

                    gl_FragColor = color;
                }
            `,
            depthTest:  false,
            depthWrite: false,
        });

        const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMaterial);
        quad.frustumCulled = false;
        this.postScene  = new THREE.Scene();
        this.postScene.add(quad);
        this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
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
        this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: this.canvas });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0xffffff, 1);
        this.renderer.autoClear = false;
        const width  = this.canvas_container.clientWidth;
        const height = this.canvas_container.clientHeight;
        this.renderer.setSize(width, height);
        this.setupBackground(width, height);
        this.setupPostProcessing(width, height);

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
        if (this.bgMaterial) {
            this.bgMaterial.uniforms.resolution.value.set(w, h);
        }
        if (this.renderTarget && this.postMaterial) {
            const dpr = window.devicePixelRatio;
            const pw = Math.floor(w * dpr), ph = Math.floor(h * dpr);
            this.renderTarget.setSize(pw, ph);
            this.postMaterial.uniforms.resolution.value.set(pw, ph);
        }
    }

    // ── Render loop ───────────────────────────────────────────────────────────

    render(time: number) {
        time *= 0.001;
        const dt = this.lastTime > 0 ? Math.min(time - this.lastTime, 0.05) : 0;
        this.lastTime = time;

        // Mouse velocity → glitch intensity
        const dvx = this.mouse.x - this.prevMouseX;
        const dvy = this.mouse.y - this.prevMouseY;
        this.glitchIntensity = Math.min(1.0, this.glitchIntensity * 0.88 + Math.sqrt(dvx*dvx + dvy*dvy) * 6.0);
        this.prevMouseX = this.mouse.x;
        this.prevMouseY = this.mouse.y;

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

        if (this.bgMaterial) {
            const parallax = 40;
            this.bgMaterial.uniforms.gridOffset.value.set(
                -this.camera_movement_x * parallax,
                 this.camera_movement_y * parallax
            );
        }
        if (this.postMaterial) {
            this.postMaterial.uniforms.time.value   = time;
            this.postMaterial.uniforms.glitch.value = this.glitchIntensity;
            this.postMaterial.uniforms.mouseUv.value.set(
                (this.mouse.x + 1) * 0.5,
                (this.mouse.y + 1) * 0.5
            );
        }
        // Render bg grid + globe into renderTarget, then post-process to screen
        this.renderer.setRenderTarget(this.renderTarget ?? null);
        this.renderer.clear();
        if (this.bgScene && this.bgCamera) {
            this.renderer.render(this.bgScene, this.bgCamera);
        }
        this.renderer.render(this.scene, this.camera);
        this.renderer.setRenderTarget(null);
        this.renderer.clear();
        if (this.postScene && this.postCamera) {
            this.renderer.render(this.postScene, this.postCamera);
        }
        this.animationFrameId = requestAnimationFrame(this.render);
    }

    // ── Cleanup ───────────────────────────────────────────────────────────────

    destroy() {
        cancelAnimationFrame(this.animationFrameId);
        if (this.resize_observer) this.resize_observer.disconnect();
        if (this.canvas_container) this.canvas_container.removeEventListener('mousemove', this.onMouseMove);
        if (this.renderer) this.renderer.dispose();
        if (this.bgMaterial)    this.bgMaterial.dispose();
        if (this.renderTarget)  this.renderTarget.dispose();
        if (this.bayerTexture)  this.bayerTexture.dispose();
        if (this.postMaterial)  this.postMaterial.dispose();
        for (const obj of this.toDispose) obj.dispose();
    }
}
