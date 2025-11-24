import { ContentLoaderInterface } from "../../framework/ContentLoaderInterface";
import { AppRequests } from "../../framework/AppRequests";
import { ArticleBrowserAppData, ArticleBrowserArticleData } from "../article_browser/ArticleBrowserData";
import * as THREE from 'three';
import {dispose} from "@react-three/fiber";

export class FriendsInterface {
    static html_url = "./apps/friends/layout.html";
    static css_urls: string[] = ["./apps/friends/assets/css/friends_layout.css"];

    private canvas: HTMLCanvasElement;
    private canvas_container: HTMLElement;
    private renderer: THREE.WebGLRenderer;
    private camera: THREE.PerspectiveCamera;
    private scene: THREE.Scene;

    // Particle System
    private particleGeometry: THREE.BufferGeometry;
    private particlesMesh: THREE.Points;
    private readonly particleCount = 2000; // Increased slightly for density

    // Physics / Orbit Data
    private orbitData: Float32Array;

    // Interaction Data
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;
    private planeArea: THREE.Plane; // Invisible plane to catch mouse in 3D
    private mouse3D: THREE.Vector3; // The calculated 3D position of mouse

    private resize_observer: ResizeObserver;
    private animationFrameId: number;
    private force_offset: Float32Array;
    private camera_movement_x : number;
    private camera_movement_y : number;

    static async create_layout() {
        for (let url of this.css_urls) {
            ContentLoaderInterface.set_app_customize_css(url);
        }

        const response = await fetch(this.html_url);
        const parser = new DOMParser();
        let html_doc = parser.parseFromString(await response.text(), 'text/html');
        ContentLoaderInterface.set_app_layout(html_doc.body.children[0].innerHTML);

        const instance = new FriendsInterface();
        instance.init();

        return instance;
    }

    constructor() {
        this.render = this.render.bind(this);
        this.onResize = this.onResize.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.camera_movement_x = 0;
        this.camera_movement_y = 0;
    }

    private getTexture(size: number = 32): THREE.Texture {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, 'rgba(180,180,180,1)');
        gradient.addColorStop(0.4, 'rgba(220,220,220,0.5)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    init() {
        this.canvas_container = document.getElementById("friends-canvas-container");
        this.canvas = document.getElementById("friends-threejs-canvas") as HTMLCanvasElement;

        if (!this.canvas || !this.canvas_container) return;

        // --- 1. LAYOUT ---
        this.canvas_container.style.position = "relative";
        this.canvas_container.style.overflow = "hidden";
        this.canvas_container.style.backgroundColor = "#ffffff";

        // --- 2. RENDERER ---
        this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: this.canvas, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0xffffff, 1);

        const width = this.canvas_container.clientWidth;
        const height = this.canvas_container.clientHeight;

        // --- 3. CAMERA (ASYMMETRY & ZOOM) ---
        this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);

        // ZOOM IN: Reduced Z from 40 to 22
        // ASYMMETRY: Moved X to -8 (Camera moves left -> Objects shift right)
        this.camera.position.set(0, 0, 8);
        this.camera.lookAt(0, 0, 0); // Look slightly off-center

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0xffffff, 0.015); // Heavier fog for depth

        // --- 4. INTERACTION SETUP ---
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2(9999, 9999); // Start off-screen
        this.planeArea = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // Plane facing Z axis
        this.mouse3D = new THREE.Vector3();

        // --- 5. PARTICLE DATA ---
        this.particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.particleCount * 3);
        this.force_offset = new Float32Array(this.particleCount * 3);
        this.orbitData = new Float32Array(this.particleCount * 4);

        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            const i4 = i * 4;

            positions[i3] = 0; positions[i3 + 1] = 0; positions[i3 + 2] = 0;

            // Radius: Tighter distribution (3 to 25)
            this.orbitData[i4] = 3 + i4/this.particleCount * 25;
            // Speed: faster (multiplied by 3.5)
            this.orbitData[i4 + 1] = (i4/this.particleCount - 0.5)*2;
            // Tilt
            this.orbitData[i4 + 2] = (i4/this.particleCount - 0.5) * 2 * Math.PI;
            this.orbitData[i4 + 3] = (i4/this.particleCount - 0.5) * 2 * Math.PI;
        }

        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const particleMaterial = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 1.1,
            map: this.getTexture(),
            blending: THREE.NormalBlending,
            transparent: true,
            opacity: 0.9,
            depthWrite: false
        });

        this.particlesMesh = new THREE.Points(this.particleGeometry, particleMaterial);
        this.scene.add(this.particlesMesh);

        // --- START ---
        this.renderer.setSize(width, height);

        // Listeners
        this.resize_observer = new ResizeObserver(this.onResize);
        this.resize_observer.observe(this.canvas_container);
        this.canvas_container.addEventListener('mousemove', this.onMouseMove);

        this.render(0);
    }

    onMouseMove(event: MouseEvent) {
        // Calculate mouse position in Normalized Device Coordinates (-1 to +1)
        // We must account for the canvas bounding box since it's inside a layout
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    onResize() {
        if (!this.canvas_container || !this.camera || !this.renderer) return;
        const width = this.canvas_container.clientWidth;
        const height = this.canvas_container.clientHeight;
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.render(this.scene, this.camera);
    }

    render(time: number) {
        time *= 0.001;

        // --- 1. CALCULATE MOUSE 3D POSITION ---
        // Raycast from camera to the mathematical Plane at Z=0
        this.raycaster.setFromCamera(this.mouse, this.camera);
        // Find where the ray intersects our invisible plane
        this.raycaster.ray.intersectPlane(this.planeArea, this.mouse3D);
        // console.log(this.mouse.x, this.mouse.y);
        if (this.particlesMesh && this.particleGeometry) {
            const positions = this.particleGeometry.attributes.position.array as Float32Array;
            for (let i = 0; i < this.particleCount; i++) {
                const i3 = i * 3;
                const i4 = i * 4;

                const radius = this.orbitData[i4];
                const speed = this.orbitData[i4 + 1];
                const tiltX = this.orbitData[i4 + 2];
                const tiltZ = this.orbitData[i4 + 3];

                const angle = time * speed + i;

                // --- A. ORBIT MATH ---
                let x = Math.cos(angle+Math.sin(angle)/2) * radius;
                let z = Math.sin(angle+Math.sin(angle)/2) * radius;
                let y = 0;

                // Apply Tilt X
                const y1 = y * Math.cos(tiltX) - z * Math.sin(tiltX);
                const z1 = y * Math.sin(tiltX) + z * Math.cos(tiltX);
                y = y1;
                z = z1;

                // Apply Tilt Z
                const x2 = x * Math.cos(tiltZ) - y * Math.sin(tiltZ);
                const y2 = x * Math.sin(tiltZ) + y * Math.cos(tiltZ);
                x = x2;
                y = y2;

                // --- B. INTERACTION MATH (FLEE) ---
                // Calculate distance between this particle's ideal position and the mouse
                const dx = x - this.mouse3D.x;
                const dy = y - this.mouse3D.y;
                const dz = z - this.mouse3D.z;

                // Simple squared distance check is faster than sqrt
                let distSq = dx * dx + dy * dy + dz * dz;
                const forceRadius = 8.0; // The size of the "push" bubble
                if (Math.abs(this.mouse.x) > 0.8 || this.mouse.y < -0.8 || this.mouse.y > 0.6) {
                    distSq = 99999999;
                }
                if (distSq < forceRadius * forceRadius) {
                    const dist = Math.sqrt(distSq);
                    // The closer, the stronger the push (0 to 1)
                    const force = (forceRadius - dist) / forceRadius;

                    // Push the particle away from the mouse
                    // We multiply by an arbitrary strength factor (e.g., 6)
                    this.force_offset[i3    ] += (dx / dist) * force * .1;
                    this.force_offset[i3 + 1] += (dy / dist) * force * .1;
                    this.force_offset[i3 + 2] += (dz / dist) * force * .1;
                    this.force_offset[i3    ] *= 1.01;
                    this.force_offset[i3 + 1] *= 1.01;
                    this.force_offset[i3 + 2] *= 1.01;
                } else {
                    // if(this.force_offset[i3] > 0) {
                        this.force_offset[i3    ] /= 1.05;
                    // }
                    // if(this.force_offset[i3 + 1] > 0) {
                        this.force_offset[i3 + 1] /= 1.05;
                    // }
                    // if(this.force_offset[i3 + 2] > 0) {
                        this.force_offset[i3 + 2] /= 1.05;
                    // }
                }

                positions[i3]     = x + this.force_offset[i3];
                positions[i3 + 1] = y + this.force_offset[i3 + 1];
                positions[i3 + 2] = z + this.force_offset[i3 + 2];
            }

            this.particleGeometry.attributes.position.needsUpdate = true;
            this.particlesMesh.rotation.y = time * 0.05;
        }
        if (Math.abs(this.mouse.x) > 0.8 || this.mouse.y < -0.8 || this.mouse.y > 0.6) {
            this.camera_movement_x/=1.01;
            this.camera_movement_y/=1.01;
        } else {
            this.camera_movement_x = (0.96)*this.camera_movement_x + 0.04*this.mouse.x
            this.camera_movement_y = (0.96)*this.camera_movement_y + 0.04*this.mouse.y
        }
        this.camera.position.set(this.camera_movement_x, this.camera_movement_y, 10);
        this.renderer.render(this.scene, this.camera);
        this.animationFrameId = requestAnimationFrame(this.render);
    }

    destroy() {
        cancelAnimationFrame(this.animationFrameId);
        if (this.resize_observer) this.resize_observer.disconnect();
        // Remove event listener to prevent leaks
        if (this.canvas_container) {
            this.canvas_container.removeEventListener('mousemove', this.onMouseMove);
        }

        if (this.renderer) this.renderer.dispose();
        if (this.particleGeometry) this.particleGeometry.dispose();
        if (this.particlesMesh && this.particlesMesh.material instanceof THREE.Material) {
            const mat = this.particlesMesh.material as THREE.PointsMaterial;
            if(mat.map) mat.map.dispose();
            mat.dispose();
        }
    }
}