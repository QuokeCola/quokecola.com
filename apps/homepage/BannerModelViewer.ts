import * as THREE from 'three';

// Model file layout (little-endian), generated from the CAD B-rep:
//   u32 vertex_count, u32 triangle_count, u32 edge_segment_count, f32 center[3], f32 scale,
//   int16 xyz * vertex_count            mesh vertices, padded to 4 bytes,
//   u32 indices * triangle_count * 3    consistently wound triangles,
//   int16 xyz * edge_segment_count * 2  CAD edges (every face boundary), padded to 4 bytes,
//   u8 rgba * triangle_count            appearance colour (sRGB); a = 1 for carbon fiber parts.
// Coordinates are normalized to [-32767, 32767].
const HEADER_BYTES = 28;

const SMOOTH_ANGLE   = 30;    // deg, shading is smoothed across edges flatter than this
const WEAVE_TOW      = 0.012; // model units (~2.5 mm), carbon fiber tow width
const SWAY_AMPLITUDE = 0.05;  // rad, idle yaw oscillation
const SWAY_PERIOD    = 24;    // s

// Camera framings matched to the original banner render, sampled at a few banner shapes
// (aspect = width / height); between them the camera blends linearly. The model fills
// the banner and the text sits in the open space above the finger modules. shiftX/shiftY
// move the model across the banner, as fractions of its width/height.
// Half height of the orthographic view at zoom 1, in model units
const VIEW_HALF_HEIGHT = 1.14;

// roll tilts the view (rad, positive leans verticals to the right) like the render.
interface Frame { aspect: number; camera: [number, number, number]; zoom: number; shiftX: number; shiftY: number; roll: number; }
const FRAMES: Frame[] = [
    { aspect: 0.58, camera: [-2.6, 1.7, -3.2], zoom: 1.35, shiftX: 0.43, shiftY: 0.08, roll: 0.1 },  // tall phone
    { aspect: 0.77, camera: [-2.6, 1.7, -3.2], zoom: 1.6,  shiftX: 0.32, shiftY: 0.07, roll: 0.1 },  // phone
    { aspect: 1.2,  camera: [-2.6, 1.7, -3.2], zoom: 2.0,  shiftX: 0.26, shiftY: 0.07, roll: 0.1 },  // tablet
    { aspect: 1.6,  camera: [-2.6, 1.7, -3.2], zoom: 2.4,  shiftX: 0.21, shiftY: 0.09, roll: 0.1 },  // laptop
    { aspect: 2.0,  camera: [-2.6, 1.7, -3.2], zoom: 2.75, shiftX: 0.20, shiftY: 0.12, roll: 0.1 },  // desktop
    { aspect: 2.4,  camera: [-2.6, 1.7, -3.2], zoom: 3.0,  shiftX: 0.22, shiftY: 0.14, roll: 0.1 },  // wide desktop
];

function frameFor(aspect: number): Frame {
    if (aspect <= FRAMES[0].aspect) return FRAMES[0];
    for (let i = 1; i < FRAMES.length; i++) {
        const a = FRAMES[i - 1], b = FRAMES[i];
        if (aspect > b.aspect) continue;
        const t = (aspect - a.aspect) / (b.aspect - a.aspect);
        const mix = (p: number, q: number) => p + (q - p) * t;
        return {
            aspect,
            camera: [mix(a.camera[0], b.camera[0]), mix(a.camera[1], b.camera[1]), mix(a.camera[2], b.camera[2])],
            zoom:   mix(a.zoom, b.zoom),
            shiftX: mix(a.shiftX, b.shiftX),
            shiftY: mix(a.shiftY, b.shiftY),
            roll:   mix(a.roll, b.roll),
        };
    }
    return FRAMES[FRAMES.length - 1];
}

interface ModelGeometry {
    mesh: THREE.BufferGeometry;
    edges: THREE.BufferGeometry;
}

// CAD edges are always drawn; mesh edges are drawn only when they are on the contour:
// one adjacent face points toward the camera and the other away. Non-contour edges
// collapse to a clipped point.
const EDGE_VERTEX_SHADER = `
    attribute vec3 other;
    attribute vec3 n1;
    attribute vec3 n2;
    attribute float cad;
    uniform vec2  fadeRange;   // view depth where lines start/finish fading
    varying float vFade;

    void main() {
        vec4 mvMid = modelViewMatrix * vec4(0.5 * (position + other), 1.0);
        bool show  = cad > 0.5;
        if (!show) {
            // View direction: toward the edge for perspective, constant for orthographic
            vec3 view = projectionMatrix[2][3] == 0.0 ? vec3(0.0, 0.0, -1.0) : mvMid.xyz;
            float fa = dot(normalMatrix * n1, view);
            float fb = dot(normalMatrix * n2, view);
            show = fa * fb < 0.0;
        }
        if (!show) {
            gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
            return;
        }
        vFade = smoothstep(fadeRange.x, fadeRange.y, -mvMid.z);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        // Pull toward the camera by a fixed sliver so edges lying on the surface win the
        // depth test (a slope-based polygon offset lets edges behind it leak through)
        gl_Position.z -= 0.0005 * gl_Position.w;
    }
`;

const EDGE_FRAGMENT_SHADER = `
    uniform vec3  color;
    uniform float opacity;
    uniform float fadeAmount;
    varying float vFade;

    void main() {
        gl_FragColor = vec4(color, opacity * (1.0 - vFade * fadeAmount));
    }
`;

// 2x2 twill weave, projected along the dominant axis of the object-space normal.
// Tows alternate direction in diagonal steps; each tow gets a rounded highlight.
const CARBON_FRAGMENT = `
    if (vCarbon > 0.5) {
        vec3 an = abs(vObjNormal);
        vec2 uv = an.x > an.y && an.x > an.z ? vObjPos.yz : (an.y > an.z ? vObjPos.xz : vObjPos.xy);
        uv /= weaveTow;
        vec2 cell = floor(uv);
        vec2 f    = fract(uv);
        bool warp = mod(cell.x + cell.y, 4.0) < 2.0;
        float across = warp ? f.y : f.x;
        float tow    = sin(across * 3.14159);
        float shade  = (warp ? 0.055 : 0.032) + tow * (warp ? 0.05 : 0.03);
        diffuseColor.rgb = vec3(shade);
    }
`;

export class BannerModelViewer {
    // Parsed geometry is shared by every viewer of the same model (the banner recreates
    // its slide on each visit), so it is built once and never disposed.
    private static geometryCache = new Map<string, Promise<ModelGeometry>>();

    private canvas: HTMLCanvasElement;
    private renderer: THREE.WebGLRenderer;
    private camera: THREE.OrthographicCamera;
    private scene: THREE.Scene;
    private pivot: THREE.Group;
    private meshGeometry: THREE.BufferGeometry | null = null;
    private edgeGeometry: THREE.BufferGeometry | null = null;
    private surfaceMaterial: THREE.MeshStandardMaterial;
    private edgeMaterial: THREE.ShaderMaterial;
    private resize_observer: ResizeObserver;
    private animationFrameId: number = 0;
    private startTime: number = 0;
    private mouse = new THREE.Vector2(0, 0);
    private mouseSmooth = new THREE.Vector2(0, 0);
    private reducedMotion: boolean;
    private destroyed = false;

    constructor(private container: HTMLElement, private model_url: string) {
        this.render      = this.render.bind(this);
        this.onResize    = this.onResize.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        this.canvas = document.createElement('canvas');
        this.canvas.className = 'home-banner-model-canvas';
        container.appendChild(this.canvas);

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0xffffff, 0);

        this.scene  = new THREE.Scene();
        // Tight depth range (camera sits ~4.5 from the unit-sized model) for depth precision
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 8);

        this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b8b8, 2.0));
        const key = new THREE.DirectionalLight(0xffffff, 1.8);
        key.position.set(-2, 4, -1);
        const fill = new THREE.DirectionalLight(0xffffff, 0.6);
        fill.position.set(3, 1, 2);
        this.scene.add(key, fill);

        this.pivot = new THREE.Group();
        this.scene.add(this.pivot);

        this.surfaceMaterial = new THREE.MeshStandardMaterial({
            vertexColors:        true,
            roughness:           0.6,
            metalness:           0.0,
            side:                THREE.DoubleSide,
        });
        this.surfaceMaterial.onBeforeCompile = shader => {
            shader.uniforms.weaveTow = { value: WEAVE_TOW };
            shader.vertexShader = shader.vertexShader
                .replace('#include <common>', `#include <common>
                    attribute float carbon;
                    varying float vCarbon;
                    varying vec3 vObjPos;
                    varying vec3 vObjNormal;`)
                .replace('#include <begin_vertex>', `#include <begin_vertex>
                    vCarbon = carbon;
                    vObjPos = position;
                    vObjNormal = normal;`);
            shader.fragmentShader = shader.fragmentShader
                .replace('#include <common>', `#include <common>
                    uniform float weaveTow;
                    varying float vCarbon;
                    varying vec3 vObjPos;
                    varying vec3 vObjNormal;`)
                .replace('#include <color_fragment>', `#include <color_fragment>
                    ${CARBON_FRAGMENT}`)
                .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
                    roughnessFactor = mix(roughnessFactor, 0.3, vCarbon);`);
        };

        this.edgeMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color:      { value: new THREE.Color(0x404040) },
                opacity:    { value: 0.5 },
                fadeAmount: { value: 0.45 },
                fadeRange:  { value: new THREE.Vector2(3.6, 5.4) },
            },
            vertexShader:   EDGE_VERTEX_SHADER,
            fragmentShader: EDGE_FRAGMENT_SHADER,
            transparent:    true,
            depthWrite:     false,
        });
    }

    /** Loads the model, compiles its shaders and starts rendering; resolves once the first frame is drawn. */
    async load() {
        let geometry = BannerModelViewer.geometryCache.get(this.model_url);
        if (!geometry) {
            geometry = this.fetchGeometry();
            BannerModelViewer.geometryCache.set(this.model_url, geometry);
        }
        const { mesh: meshGeometry, edges: edgeGeometry } = await geometry;
        if (this.destroyed) return;  // slide was removed while loading
        this.meshGeometry = meshGeometry;
        this.edgeGeometry = edgeGeometry;
        const mesh  = new THREE.Mesh(meshGeometry, this.surfaceMaterial);
        const edges = new THREE.LineSegments(edgeGeometry, this.edgeMaterial);
        edges.renderOrder = 1;
        edges.frustumCulled = false;
        this.pivot.add(mesh, edges);

        this.resize_observer = new ResizeObserver(this.onResize);
        this.resize_observer.observe(this.container);
        window.addEventListener('mousemove', this.onMouseMove);
        this.onResize();

        // Compile before the slide animates in, so the first frames do not stall
        await this.renderer.compileAsync(this.scene, this.camera);
        if (this.destroyed) return;
        this.startTime = performance.now();
        this.render();
    }

    private async fetchGeometry(): Promise<ModelGeometry> {
        const response = await fetch(this.model_url);
        const buffer   = await response.arrayBuffer();
        const header   = new DataView(buffer);
        const nVerts   = header.getUint32(0, true);
        const nTris    = header.getUint32(4, true);
        const nSegs    = header.getUint32(8, true);
        const pad4 = (n: number) => Math.ceil(n / 4) * 4;
        const indexOffset = HEADER_BYTES + pad4(nVerts * 6);
        const edgeOffset  = indexOffset + nTris * 12;
        const colorOffset = edgeOffset + pad4(nSegs * 12);
        const dequantize = (raw: Int16Array) => Float32Array.from(raw, v => v / 32767);
        const positions = dequantize(new Int16Array(buffer, HEADER_BYTES, nVerts * 3));
        const indices   = new Uint32Array(buffer, indexOffset, nTris * 3);
        const cadEdges  = dequantize(new Int16Array(buffer, edgeOffset, nSegs * 6));
        const colors    = new Uint8Array(buffer, colorOffset, nTris * 4);

        const normals = this.faceNormals(positions, indices);
        return {
            mesh:  this.buildSurfaceGeometry(positions, indices, normals, colors),
            edges: this.buildEdgeGeometry(positions, indices, normals, cadEdges),
        };
    }

    /** Unit normal of each triangle; its length before normalizing is twice the area. */
    private faceNormals(positions: Float32Array, indices: Uint32Array): Float32Array {
        const nTris   = indices.length / 3;
        const normals = new Float32Array(nTris * 3);
        const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
        for (let f = 0; f < nTris; f++) {
            a.fromArray(positions, indices[f * 3] * 3);
            b.fromArray(positions, indices[f * 3 + 1] * 3);
            c.fromArray(positions, indices[f * 3 + 2] * 3);
            c.sub(b); b.sub(a); b.cross(c).normalize();
            normals[f * 3] = b.x; normals[f * 3 + 1] = b.y; normals[f * 3 + 2] = b.z;
        }
        return normals;
    }

    /**
     * Unindexed surface with per-corner normals: each corner averages the triangles around
     * its vertex that bend less than SMOOTH_ANGLE from its own, so creases stay sharp.
     */
    private buildSurfaceGeometry(positions: Float32Array, indices: Uint32Array,
                                 normals: Float32Array, colors: Uint8Array): THREE.BufferGeometry {
        const nTris  = indices.length / 3;
        const nVerts = positions.length / 3;

        // Vertex -> triangles adjacency (CSR)
        const start = new Uint32Array(nVerts + 1);
        for (let i = 0; i < indices.length; i++) start[indices[i] + 1]++;
        for (let v = 0; v < nVerts; v++) start[v + 1] += start[v];
        const fill = start.slice(0, nVerts);
        const around = new Uint32Array(indices.length);
        for (let i = 0; i < indices.length; i++) around[fill[indices[i]]++] = (i / 3) | 0;

        const smoothCos = Math.cos(SMOOTH_ANGLE * Math.PI / 180);
        const pos    = new Float32Array(nTris * 9);
        const nrm    = new Float32Array(nTris * 9);
        const col    = new Float32Array(nTris * 9);
        const carbon = new Uint8Array(nTris * 3);
        const linear = new THREE.Color();
        for (let f = 0; f < nTris; f++) {
            linear.setRGB(colors[f * 4] / 255, colors[f * 4 + 1] / 255, colors[f * 4 + 2] / 255, THREE.SRGBColorSpace);
            for (let k = 0; k < 3; k++) {
                const v = indices[f * 3 + k], o = f * 9 + k * 3;
                let nx = 0, ny = 0, nz = 0;
                for (let j = start[v]; j < start[v + 1]; j++) {
                    const g = around[j];
                    if (normals[f * 3] * normals[g * 3] + normals[f * 3 + 1] * normals[g * 3 + 1]
                        + normals[f * 3 + 2] * normals[g * 3 + 2] < smoothCos) continue;
                    nx += normals[g * 3]; ny += normals[g * 3 + 1]; nz += normals[g * 3 + 2];
                }
                const len = Math.hypot(nx, ny, nz) || 1;
                nrm[o] = nx / len; nrm[o + 1] = ny / len; nrm[o + 2] = nz / len;
                pos[o] = positions[v * 3]; pos[o + 1] = positions[v * 3 + 1]; pos[o + 2] = positions[v * 3 + 2];
                col[o] = linear.r; col[o + 1] = linear.g; col[o + 2] = linear.b;
                carbon[f * 3 + k] = colors[f * 4 + 3];
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
        geometry.setAttribute('carbon', new THREE.BufferAttribute(carbon, 1));
        return geometry;
    }

    /**
     * Combines the CAD edges (always drawn) with contour candidates: mesh edges shared
     * by two non-coplanar triangles. Open mesh edges are skipped; the CAD edges cover them.
     */
    private buildEdgeGeometry(positions: Float32Array, indices: Uint32Array,
                              normals: Float32Array, cadEdges: Float32Array): THREE.BufferGeometry {
        const nTris  = indices.length / 3;
        const nVerts = positions.length / 3;
        const dot = (f: number, g: number) =>
            normals[f * 3] * normals[g * 3] + normals[f * 3 + 1] * normals[g * 3 + 1] + normals[f * 3 + 2] * normals[g * 3 + 2];

        const open  = new Map<number, number>();  // edge key -> first face
        const pairs: number[] = [];                // v0, v1, f, g
        for (let f = 0; f < nTris; f++) {
            for (let k = 0; k < 3; k++) {
                const v0 = indices[f * 3 + k], v1 = indices[f * 3 + (k + 1) % 3];
                const key = v0 < v1 ? v0 * nVerts + v1 : v1 * nVerts + v0;
                const g = open.get(key);
                if (g === undefined) { open.set(key, f); continue; }
                open.delete(key);
                if (dot(f, g) < 0.9999) pairs.push(v0, v1, f, g);
            }
        }

        const nCad  = cadEdges.length / 6;
        const count = nCad + pairs.length / 4;
        const pos   = new Float32Array(count * 6);
        const other = new Float32Array(count * 6);
        const n1    = new Int8Array(count * 6);
        const n2    = new Int8Array(count * 6);
        const cad   = new Uint8Array(count * 2);
        for (let e = 0; e < count; e++) {
            const isCad = e < nCad;
            const p = e - nCad;
            for (let i = 0; i < 3; i++) {
                const p0 = isCad ? cadEdges[e * 6 + i]     : positions[pairs[p * 4] * 3 + i];
                const p1 = isCad ? cadEdges[e * 6 + 3 + i] : positions[pairs[p * 4 + 1] * 3 + i];
                pos[e * 6 + i] = p0;   pos[e * 6 + 3 + i] = p1;
                other[e * 6 + i] = p1; other[e * 6 + 3 + i] = p0;
                if (!isCad) {
                    n1[e * 6 + i] = n1[e * 6 + 3 + i] = Math.round(normals[pairs[p * 4 + 2] * 3 + i] * 127);
                    n2[e * 6 + i] = n2[e * 6 + 3 + i] = Math.round(normals[pairs[p * 4 + 3] * 3 + i] * 127);
                }
            }
            cad[e * 2] = cad[e * 2 + 1] = isCad ? 1 : 0;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geometry.setAttribute('other', new THREE.BufferAttribute(other, 3));
        geometry.setAttribute('n1', new THREE.BufferAttribute(n1, 3, true));
        geometry.setAttribute('n2', new THREE.BufferAttribute(n2, 3, true));
        geometry.setAttribute('cad', new THREE.BufferAttribute(cad, 1));
        return geometry;
    }

    destroy() {
        this.destroyed = true;
        cancelAnimationFrame(this.animationFrameId);
        window.removeEventListener('mousemove', this.onMouseMove);
        if (this.resize_observer) this.resize_observer.disconnect();
        this.surfaceMaterial.dispose();
        this.edgeMaterial.dispose();
        this.renderer.dispose();
        this.renderer.forceContextLoss();  // release the WebGL context right away
        this.canvas.remove();
    }

    private onMouseMove(e: MouseEvent) {
        this.mouse.set(e.clientX / window.innerWidth * 2 - 1, e.clientY / window.innerHeight * 2 - 1);
    }

    private onResize() {
        const width  = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width === 0 || height === 0) return;
        this.renderer.setSize(width, height, false);

        const frame = frameFor(width / height);
        this.camera.position.set(...frame.camera);
        this.camera.lookAt(0, 0, 0);
        this.camera.rotateZ(frame.roll);
        this.camera.top    =  VIEW_HALF_HEIGHT;
        this.camera.bottom = -VIEW_HALF_HEIGHT;
        this.camera.left   = -VIEW_HALF_HEIGHT * width / height;
        this.camera.right  =  VIEW_HALF_HEIGHT * width / height;
        this.camera.zoom = frame.zoom;
        this.camera.setViewOffset(width, height, -frame.shiftX * width, -frame.shiftY * height, width, height);
        this.camera.updateProjectionMatrix();

        // Resizing clears the canvas; redraw now instead of on the next frame so it never flashes
        if (this.startTime > 0) this.renderer.render(this.scene, this.camera);
    }

    private render() {
        // Release everything once the page layout has replaced our slide
        if (!this.canvas.isConnected) {
            this.destroy();
            return;
        }
        this.animationFrameId = requestAnimationFrame(this.render);
        const t = (performance.now() - this.startTime) / 1000;

        this.mouseSmooth.lerp(this.mouse, 0.04);
        const sway = this.reducedMotion ? 0 : Math.sin(t / SWAY_PERIOD * Math.PI * 2) * SWAY_AMPLITUDE;
        this.pivot.rotation.y = sway + this.mouseSmooth.x * 0.05;
        this.pivot.rotation.x = this.mouseSmooth.y * 0.03;

        this.renderer.render(this.scene, this.camera);
    }
}
