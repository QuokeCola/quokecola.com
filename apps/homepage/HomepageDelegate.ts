import {AppDelegate} from "../../framework/AppDelegate.js";
import {ContentLoaderInterface} from "../../framework/ContentLoaderInterface.js";
export class HomepageDelegate extends AppDelegate{
    app_data: any;
    name: string = "HOME";

    background_service(app_request: any): boolean {
        return true;
    }

    create_layout(app_data: any): boolean {
        ContentLoaderInterface.set_app_customize_css('./apps/homepage/assets/css/homepage.css');
        let request = new XMLHttpRequest();
        request.open("GET","./apps/homepage/layout.html")
        request.send()
        request.onreadystatechange=(e) => {
            if (request.readyState==4&&request.status==200) {
                const parser = new DOMParser()
                let html_doc = parser.parseFromString(request.responseText,'text/html');
                ContentLoaderInterface.set_app_layout(html_doc.body.children[0].innerHTML)
            }
        }
        return true;
    }

    data_to_url(app_request: any): string {
        return "HOME";
    }

    url_to_data(url: string): any {
    }

    handle_app_requests(app_data: any): boolean {
        return true;
    }

    register_DOM(app_data: any): boolean {
        return true;
    }

    remove_layout(app_data: any): boolean {
        return true;
    }



}