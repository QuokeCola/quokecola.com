import {AppDelegate} from "../../framework/AppDelegate";
import {BlogRollInterface} from "./BlogRollInterface";
import {NavigationBarInterface} from "../../framework/NavigationBarInterface";
import {AppRequests} from "../../framework/AppRequests";
export class BlogRollDelegate extends AppDelegate{
    app_data: any;
    name: string = "BLOGROLL";
    friends_if: BlogRollInterface;
    constructor() {
        super();
        let app_request = new AppRequests()
        app_request.app_name = this.name;
        NavigationBarInterface.add_btn(this.name, app_request);
    }

    background_service(app_data: any): boolean {
        return true;
    }

    async create_layout(app_data: any):Promise<boolean> {
        this.friends_if = await BlogRollInterface.create_layout()
        return true;
    }

    data_to_url(app_data: any): string {
        return "";
    }

    url_to_data(url: string): any {
        return "";
    }

    async handle_app_requests(app_data: any): Promise<boolean> {
        if (app_data==="reload"){

        }
        return true;
    }

    async quit(app_data: any): Promise<boolean> {
        this.friends_if.destroy();
        return true;
    }

    async onload(app_data: any): Promise<boolean> {
        NavigationBarInterface.set_scroll_down_blur_behavior(NavigationBarInterface.ScrollDownBlurBehavior.scroll_down_blur);
        return false;
    }
}