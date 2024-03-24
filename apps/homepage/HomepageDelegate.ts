import {AppDelegate} from "../../framework/AppDelegate.js";
import {HomepageInterface} from "./HomepageInterface.js";
import {NavigationBarInterface} from "../../framework/NavigationBarInterface.js";
import {AppRequests} from "../../framework/AppRequests.js";
export class HomepageDelegate extends AppDelegate{
    app_data: any;
    name: string = "HOME";
    constructor() {
        super();
        let app_request = new AppRequests()
        app_request.app_name = this.name;
        app_request.app_data = "reload";
        NavigationBarInterface.add_btn(this.name, app_request);
    }
    background_service(app_data: any): boolean {
        return true;
    }

    async create_layout(app_data: any):Promise<boolean> {
        await HomepageInterface.create_layout()
        return true;
    }

    data_to_url(app_data: any): string {
        return ""
    }

    url_to_data(url: string): any {
        return "";
    }

    async handle_app_requests(app_data: any): Promise<boolean> {
        if (app_data==="reload"){
            HomepageInterface.reload_banner();
            HomepageInterface.reload_selfie_imgs();
            HomepageInterface.reload_tiles_imgs();
        }
        return true;
    }

    async quit(app_data: any): Promise<boolean> {
        return true;
    }

    async onload(app_data: any): Promise<boolean> {
        HomepageInterface.reload_banner();
        HomepageInterface.reload_tiles_imgs();
        HomepageInterface.reload_selfie_imgs();
        NavigationBarInterface.set_scroll_down_blur_behavior(NavigationBarInterface.ScrollDownBlurBehavior.scroll_down_blur);
        return false;
    }
}