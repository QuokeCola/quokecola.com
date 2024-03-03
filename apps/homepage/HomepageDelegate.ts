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
        app_request.url      = this.data_to_url("");
        app_request.app_data = null;
        NavigationBarInterface.add_btn(this.name, app_request);
    }
    background_service(app_data: any): boolean {
        return true;
    }

    create_layout(app_data: any): boolean {
        HomepageInterface.create_layout()
        return true;
    }

    data_to_url(app_data: any): string {
        return ""
    }

    url_to_data(url: string): any {
    }

    handle_app_requests(app_data: any): boolean {
        return true;
    }

    remove_layout(app_data: any): boolean {
        HomepageInterface.remove_layout();
        return true;
    }
}