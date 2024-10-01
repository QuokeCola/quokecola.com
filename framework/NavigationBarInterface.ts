import {AppRequests} from "./AppRequests";
import {ContentLoaderInterface} from "./ContentLoaderInterface";

export class NavigationBarInterface {
    private static nav_obj = document.getElementById("navigation-bar");
    private static content_obj = document.getElementById("content-screen");
    private static menu_panel_obj = document.getElementById("nav-menuPanel");
    private static logo_panel_obj = document.getElementById("nav-logoPanel");
    private static loading_status = document.getElementById("loading-status");
    private static link_panel_status = document.getElementById("nav-panel-status");
    private static initialized = false;
    private static enable_scroll_down_blur_behavior : NavigationBarInterface.ScrollDownBlurBehavior = 0;
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
            ContentLoaderInterface.to_top();
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
            if (this.enable_scroll_down_blur_behavior) {
                if(this.content_obj.scrollTop > 0.25*this.content_obj.clientHeight) {
                    this.nav_obj.classList.add("nav-scrollDown");
                } else{
                    this.nav_obj.classList.remove("nav-scrollDown");
                }
            }
        }
    }

    static set_scroll_down_blur_behavior(behavior: NavigationBarInterface.ScrollDownBlurBehavior) {
        this.enable_scroll_down_blur_behavior = behavior;
        if (this.nav_obj) {
            switch (behavior) {
                case NavigationBarInterface.ScrollDownBlurBehavior.clear:
                    this.nav_obj.classList.remove("nav-scrollDown");
                    break;
                case NavigationBarInterface.ScrollDownBlurBehavior.blur:
                    if(!this.nav_obj.classList.contains("nav-scrollDown")){
                        this.nav_obj.classList.add("nav-scrollDown");
                    }
                    break;
                case NavigationBarInterface.ScrollDownBlurBehavior.scroll_down_blur:
                    if (this.content_obj&&this.nav_obj) {
                        if(this.content_obj.scrollTop > 0.25*this.content_obj.clientHeight) {
                            this.nav_obj.classList.add("nav-scrollDown");
                        } else{
                            this.nav_obj.classList.remove("nav-scrollDown");
                        }
                    }
                    break;
            }
        }
    }

}

export namespace NavigationBarInterface {
    export enum ScrollDownBlurBehavior {
        clear,
        blur,
        scroll_down_blur
    }
}