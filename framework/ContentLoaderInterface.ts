export class ContentLoaderInterface {
    /************************************************
     *  DOM objects
     *  These objects will always be on screen.
     ***********************************************/
    private static loading_status = document.getElementById("loading-status");
    private static content_window_obj = document.getElementById("content-screen");
    private static loading_grid_obj = document.getElementById("loading-grid");
    private static organization_name_obj = document.getElementById("loading-orgName");
    private static vert_half_line_count = 0;
    private static horz_half_line_count = 0;
    private static initialized = false
    private static app_customized_css = new Map()
    private static app_loading_callback :(()=> any) = () => {};
    private static app_onload_callback : (()=> any) = () => {};
    private static content_loader_state: ContentLoaderInterface.ContentLoaderStates = 2;
    public static initialize() {
        if (!this.initialized) {
            ContentLoaderInterface.update_grid();
            window.addEventListener('resize',()=>{
                this.update_grid();
            });
            window.addEventListener('orientationchange',()=>{
                this.update_grid();
            });
            this.initialized = true;
            this.set_loading_status(true);
            if (this.content_window_obj) {
                this.content_window_obj.addEventListener("transitionend", async (ev) => {
                    if (ev.target === this.content_window_obj && ev.propertyName === "transform") {
                        if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
                            setTimeout(async ()=>{
                                if (ContentLoaderInterface.content_loader_state == 0 ||
                                    ContentLoaderInterface.get_loading_status()) {
                                    ContentLoaderInterface.content_loader_state = 1;
                                    await ContentLoaderInterface.app_loading_callback();
                                    ContentLoaderInterface.set_loading_status(false);
                                } else if (ContentLoaderInterface.content_loader_state == 1) {
                                    await ContentLoaderInterface.app_onload_callback();
                                    ContentLoaderInterface.content_loader_state = 2;
                                }
                            },200)
                        } else {
                            if (ContentLoaderInterface.content_loader_state == 0 ||
                                ContentLoaderInterface.get_loading_status()) {
                                ContentLoaderInterface.content_loader_state = 1;
                                await ContentLoaderInterface.app_loading_callback();
                                ContentLoaderInterface.set_loading_status(false);
                            } else if (ContentLoaderInterface.content_loader_state == 1) {
                                await ContentLoaderInterface.app_onload_callback();
                                ContentLoaderInterface.content_loader_state = 2;
                            }
                        }
                    }
                })
            }
        }
    }

    /**
     * Set the customized css for app.
     * @param url url for css code for the app.
     */
    public static set_app_customize_css(url:string) {
        let head = document.head || document.getElementsByTagName('head')[0];
        let style = document.createElement("link");
        style.href = url;
        style.type = "text/css"
        style.rel  = "stylesheet"

        head.appendChild(style);
        this.app_customized_css.set(url,style)
    }
    public static remove_app_customize_css(url:string) {
        if (this.app_customized_css.has(url)) {
            let head = document.head || document.getElementsByTagName('head')[0];
            head.removeChild(this.app_customized_css.get(url))
            this.app_customized_css.delete(url)
        }
    }

    public static clear_app_customized_css() {
        for (let css_link of this.app_customized_css.keys()) {
            let head = document.head || document.getElementsByTagName('head')[0];
            head.removeChild(this.app_customized_css.get(css_link))
            this.app_customized_css.delete(css_link)
        }
    }

    /**
     * Set the layout for app.
     * @param html_code
     */
    public static set_app_layout(html_code:string) {
        if (ContentLoaderInterface.content_window_obj) {
            ContentLoaderInterface.content_window_obj.innerHTML = html_code;
        }
    }

    /**
     * Make the main screen load or not
     * @param status True: loading, False: Show content
     */
    private static set_loading_status(status: boolean) {
        if (ContentLoaderInterface.loading_status instanceof HTMLInputElement) {
            ContentLoaderInterface.loading_status.checked = status;
        }
    }

    /**
     * Get the checkbox status.
     * @private
     */
    private static get_loading_status():boolean {
        if (ContentLoaderInterface.loading_status instanceof HTMLInputElement) {
            return ContentLoaderInterface.loading_status.checked;
        } else {
            return true;
        }
    }

    /**
     * Update the grid when resizing and orientation change
     * @private
     */
    private static update_grid() {
        if (ContentLoaderInterface.content_window_obj) {
            let property = getComputedStyle(ContentLoaderInterface.content_window_obj);
            let width = parseFloat(property.width.replace("px",""));
            let height = parseFloat(property.height.replace("px",""))
            let grid_size = ((width/8 > height/5) ? width/8: height/5);
            let new_vert_half_line_count = width/2/grid_size-0.5;
            let new_horz_half_line_count = height/2/grid_size - 0.5;
            if(new_vert_half_line_count !== ContentLoaderInterface.vert_half_line_count){
                ContentLoaderInterface.vert_half_line_count = new_vert_half_line_count;
                ContentLoaderInterface.generate_grid();
            }
            if(new_horz_half_line_count !== ContentLoaderInterface.horz_half_line_count){
                ContentLoaderInterface.horz_half_line_count = new_horz_half_line_count;
                ContentLoaderInterface.generate_grid();
            }
            document.documentElement.style.setProperty("--loading-grid-index-offset-vert", ContentLoaderInterface.vert_half_line_count.toString());
            document.documentElement.style.setProperty("--loading-grid-index-offset-horz", ContentLoaderInterface.horz_half_line_count.toString());
            document.documentElement.style.setProperty("--loading-grid-active-size",grid_size+"px");
            document.documentElement.style.setProperty("--loading-grid-idle-size",grid_size*2+"px");

        }
    }

    /**
     * @brief Generate grid background in loading view
     * @detain Removes all children in #grid-bg element and regenerate lines.
     */
    private static generate_grid(){
        if (ContentLoaderInterface.loading_grid_obj) {
            while (ContentLoaderInterface.loading_grid_obj.lastChild!==null){
                ContentLoaderInterface.loading_grid_obj.removeChild(ContentLoaderInterface.loading_grid_obj.lastChild);
            }
            for (let i = -Math.floor(ContentLoaderInterface.vert_half_line_count); i <= 0; i++){
                let left_line = document.createElement("vert-line");
                left_line.setAttribute('style', "--index: ("+String(i-0.5)+")");
                let right_line = document.createElement("vert-line");
                right_line.setAttribute('style', "--index: ("+String(-i+0.5)+")");
                ContentLoaderInterface.loading_grid_obj.appendChild(left_line);
                ContentLoaderInterface.loading_grid_obj.appendChild(right_line);
            }
            for (let i = -Math.floor(ContentLoaderInterface.horz_half_line_count); i <= 0; i++) {
                let top_line = document.createElement("horz-line");
                top_line.setAttribute('style', "--index: ("+String(i-0.5)+")");
                let bottom_line = document.createElement("horz-line");
                bottom_line.setAttribute('style', "--index: ("+String(-i+0.5)+")");
                ContentLoaderInterface.loading_grid_obj.appendChild(top_line);
                ContentLoaderInterface.loading_grid_obj.appendChild(bottom_line);
            }
        }
    }

    /**
     * @brief Call the function to load app interface.
     * @param callback function to load the app layout.
     */
    static load_app_layout(callback:(()=> any)) {
        if (ContentLoaderInterface.content_loader_state == 2) {
            ContentLoaderInterface.content_loader_state = 0;
            ContentLoaderInterface.set_loading_status(true);
            ContentLoaderInterface.app_loading_callback = callback;
        }
    }
    /**
     * @brief Call the function when app onload
     * @param callback Callback function after the app is onload.
     */
    static app_onload(callback:(()=> any)) {
        ContentLoaderInterface.app_onload_callback = callback;
    }

    /**
     * Get Content loader's state.
     */
    static get_content_loader_state() {
        return this.content_loader_state;
    }

    public static to_top() {
        if (ContentLoaderInterface.content_window_obj) {
            let c = ContentLoaderInterface.content_window_obj.scrollTop;
            if (c > 0) {
                ContentLoaderInterface.content_window_obj.scrollTo({left: 0, top: c-c/8, behavior: "instant"});
                window.requestAnimationFrame(()=>{ContentLoaderInterface.to_top()});
            }
        }
    }
}

export namespace ContentLoaderInterface {
    export enum ContentLoaderStates{
        LOADING_ANIMATION_PLAYING,
        LOADED_ANIMATION_PLAYING,
        READY
    }
}