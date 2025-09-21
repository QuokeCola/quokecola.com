import {ContentLoaderInterface} from "../../framework/ContentLoaderInterface";
import {AppRequests} from "../../framework/AppRequests";
import {ArticleBrowserAppData, ArticleBrowserArticleData} from "../article_browser/ArticleBrowserData";
import RequestType = ArticleBrowserAppData.RequestType;
import * as THREE from 'three';

export class FriendsInterface {
    static html_url = "./apps/friends/layout.html"
    static css_urls: string[] = [
        "./apps/friends/assets/css/friends_layout.css"]
    private static canvas : HTMLElement;
    private static canvas_container;
    private static renderer;
    private static camera;
    private static scene;
    private static cube;

    private static boxWidth ;
    private static boxHeight;
    private static boxDepth ;
    private static geometry ;
    private static material ;

    private static edges;
    private static edgeLines;
    private static resize_observer;
    static async create_layout() {
        for (let url of this.css_urls) {
            ContentLoaderInterface.set_app_customize_css(url);
        }
        const response = await fetch(this.html_url);
        const parser = new DOMParser();
        let html_doc = parser.parseFromString(await response.text(), 'text/html');
        ContentLoaderInterface.set_app_layout(html_doc.body.children[0].innerHTML);
        this.canvas_container = document.getElementById("friends-canvas-container")
        this.canvas = document.getElementById("friends-threejs-canvas");
        const canvas = this.canvas as HTMLCanvasElement;
        /// ThreeJS Start
        this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0xffffff, 1);  // Set background to white

        const fov = 75;
        const aspect = canvas.clientWidth / canvas.clientHeight;
        const near = 0.1;
        const far = 5;

        this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        this.camera.position.z = 2;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xffffff);  // Background white

        // Create the cube with semi-transparent material
        this.boxWidth = 1;
        this.boxHeight = 1;
        this.boxDepth = 1;
        this.geometry = new THREE.BoxGeometry(this.boxWidth, this.boxHeight, this.boxDepth);
        this.material = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,    // Enable transparency
            opacity: 0.8          // Set opacity to 50% (semi-transparent)
        });

        this.cube = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.cube);

        // Create edges for the cube
        this.edges = new THREE.EdgesGeometry(this.geometry);  // Extract edges from the geometry
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });  // Edge color (black)
        this.edgeLines = new THREE.LineSegments(this.edges, lineMaterial);
        this.scene.add(this.edgeLines);  // Add edges to the scene

        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(this.render.bind(this));

        /// ThreeJS End

        /// THREE JS Resize
        this.resize_observer = new ResizeObserver(()=>{
            FriendsInterface.renderer.setSize(FriendsInterface.canvas_container.clientWidth, FriendsInterface.canvas_container.clientHeight);
            FriendsInterface.renderer.setPixelRatio(window.devicePixelRatio);
            FriendsInterface.camera.aspect = FriendsInterface.canvas_container.clientWidth / FriendsInterface.canvas_container.clientHeight;
            FriendsInterface.camera.updateProjectionMatrix();
            FriendsInterface.renderer.render(this.scene, this.camera);
            console.log("Resized!");
        })
        this.resize_observer.observe(this.canvas_container)
    }
    /// ThreeJS Start
    static render(time) {
        time *= 0.001;  // convert time to seconds

        this.cube.rotation.x = time;
        this.cube.rotation.y = time;
        this.edgeLines.rotation.x = time;
        this.edgeLines.rotation.y = time;
        this.renderer.render(this.scene, this.camera);

        requestAnimationFrame(this.render.bind(this));
    }
    /// ThreeJS End

}