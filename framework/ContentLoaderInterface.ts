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

    /**
     * Set the layout for app.
     * @param html_code
     */
    public static set_app_layout(html_code:string) {
        console.log(ContentLoaderInterface.content_window_obj)
        if (ContentLoaderInterface.content_window_obj) {
            console.log("loo")
            ContentLoaderInterface.content_window_obj.innerHTML = html_code;
        }
    }

    /**
     * Make the main screen load or not
     * @param status True: loading, False: Show content
     */
    public static set_loading_status(status: boolean) {
        if (ContentLoaderInterface.loading_status instanceof HTMLInputElement) {
            ContentLoaderInterface.loading_status.checked = status;
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
}