import {AppRequests} from "./AppRequests.js";
import {ContentLoaderInterface} from "./ContentLoaderInterface";

export class NavigationBarInterface {
    private static nav_obj = document.getElementById("navigation-bar");
    private static content_obj = document.getElementById("content-screen");
    private static menu_panel_obj = document.getElementById("nav-menuPanel");
    private static logo_panel_obj = document.getElementById("nav-logoPanel");
    private static loading_status = document.getElementById("loading-status");
    private static link_panel_status = document.getElementById("nav-panel-status");
    private static initialized = false;
    static initialize(){
        if (!this.initialized) {
            this.initialized = true;
            if (this.content_obj) {
                this.content_obj.addEventListener("scroll", ()=>{
                    this.scrollEventHandler();
                });
            }
        }
    }
    /**
     * @brief   Create a link button for navigation bar panel
     * @var
     */
    static add_btn(title:string, button_request: AppRequests) {
        let btn = document.createElement("div");
        btn.classList.add("nav-menu-items");
        btn.innerText = title;
        btn.onclick = function () {
            window.postMessage(button_request);
                if (NavigationBarInterface.link_panel_status instanceof HTMLInputElement) {
                    NavigationBarInterface.link_panel_status.checked = false;
                }
        }
        if (this.menu_panel_obj) {
            this.menu_panel_obj.appendChild(btn);
        }
    }

    /**
     * @brief Controls the navigation bar transparency in scroll.
     */
    static scrollEventHandler() {
        if (this.content_obj&&this.nav_obj) {
            if(this.content_obj.scrollTop > 0.25*this.content_obj.clientHeight) {
                this.nav_obj.classList.add("nav-scrollDown");
            } else{
                this.nav_obj.classList.remove("nav-scrollDown");
            }
        }
    }
}