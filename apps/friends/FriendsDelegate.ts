import {AppDelegate} from "../../framework/AppDelegate";
import {FriendsInterface} from "./FriendsInterface";
import {NavigationBarInterface} from "../../framework/NavigationBarInterface";
import {AppRequests} from "../../framework/AppRequests";
export class FriendsDelegate extends AppDelegate{
    app_data: any;
    name: string = "HELLO_3JS";
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
        await FriendsInterface.create_layout()
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

        }
        return true;
    }

    async quit(app_data: any): Promise<boolean> {
        return true;
    }

    async onload(app_data: any): Promise<boolean> {
        NavigationBarInterface.set_scroll_down_blur_behavior(NavigationBarInterface.ScrollDownBlurBehavior.scroll_down_blur);
        return false;
    }
}