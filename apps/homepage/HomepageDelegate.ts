import {AppDelegate} from "../../framework/AppDelegate.js";
import {HomepageInterface} from "./HomepageInterface.js";
export class HomepageDelegate extends AppDelegate{
    app_data: any;
    name: string = "HOME";


    background_service(app_request: any): boolean {
        return true;
    }

    create_layout(app_data: any): boolean {
        HomepageInterface.create_layout()
        return true;
    }

    data_to_url(app_request: any): string {
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