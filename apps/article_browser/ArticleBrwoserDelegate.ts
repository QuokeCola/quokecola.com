import {AppDelegate} from "../../framework/AppDelegate.js";
import {ArticleBrowserRequestData} from "./ArticleBrowserData.js";
import {AppRequests} from "../../framework/AppRequests.js";
import {NavigationBarInterface} from "../../framework/NavigationBarInterface.js";
import {ContentLoaderInterface} from "../../framework/ContentLoaderInterface.js";

export class ArticleBrwoserDelegate extends AppDelegate{
    app_data: ArticleBrowserRequestData = {request_type: ArticleBrowserRequestData.RequestType.default, article_source: null, page_index: null, selected_tags: null};
    name = "ARTICLES";

    document_info : any;

    constructor() {
        super();
        let app_request = new AppRequests()
        let app_data : ArticleBrowserRequestData = {
            request_type: ArticleBrowserRequestData.RequestType.load_browser,
            article_source: null,
            selected_tags: [],
            page_index: 1
        }
        app_request.app_name = this.name;
        app_request.app_data = app_data;
        NavigationBarInterface.add_btn(this.name, app_request);

        let json = new XMLHttpRequest()
        json.open("get", "./apps/article_browser/markdown_directory/article_list.json");
        let _this_ref = this;
        json.onload = function () {
            if (json.status === 200) {
                _this_ref.document_info = JSON.parse(json.responseText);
            }
        }
        json.send(null);
    }

    background_service(app_data: typeof this.app_data): boolean {
        return false;
    }

    create_layout(app_data: typeof this.app_data): boolean {
        ContentLoaderInterface.set_app_layout("<div style='background-color: red; width: 100%;height: 100%'></div>>")
        return false;
    }

    data_to_url(app_data: typeof this.app_data): string {
        switch (app_data.request_type) {
            case ArticleBrowserRequestData.RequestType.load_article:
                return app_data.article_source!.replace("$","^").replace("#","*");
            case ArticleBrowserRequestData.RequestType.load_browser:
                return ["","$"+app_data.selected_tags!.join("$"), app_data.page_index!.toString()].join("#");
            case ArticleBrowserRequestData.RequestType.default:
                // Pass through
            default:
                return "";
        }
    }

    handle_app_requests(app_data: typeof this.app_data): boolean {
        switch (app_data.request_type) {
            case ArticleBrowserRequestData.RequestType.load_article:
                break;
            case ArticleBrowserRequestData.RequestType.load_browser:
                break;
            case ArticleBrowserRequestData.RequestType.default:
                // Pass through, default situation means to handle a request with no data inside, bring up default interface.
            default:

        }
        return false;
    }

    quit(app_data: typeof this.app_data): boolean {
        ContentLoaderInterface.set_app_layout("");
        return false;
    }

    url_to_data(url: string): any {
        let parsed_data : ArticleBrowserRequestData={request_type: ArticleBrowserRequestData.RequestType.default, article_source: null, page_index: null, selected_tags: null};
        let url_levels = url.split("#")
        for(let url_level of url_levels) {
            if(url_level.match("/^[1-9][0-9]*$/")) {
                parsed_data.page_index = Number(url_level);
                parsed_data.request_type = ArticleBrowserRequestData.RequestType.load_browser;
                if (!parsed_data.selected_tags) {
                    parsed_data.selected_tags = [];
                }
            } else if(url_level.includes("$")) {
                parsed_data.selected_tags = url_level.split("$");
                parsed_data.selected_tags.filter(function (tags: string) {
                    return tags !== "";
                });
                parsed_data.request_type = ArticleBrowserRequestData.RequestType.load_browser;
                if (!parsed_data.page_index) {
                    parsed_data.page_index = 1;
                }
            } else {
                parsed_data.article_source = url_level;
                parsed_data.request_type   = ArticleBrowserRequestData.RequestType.load_article;
            }
        }
    }

    onload(app_data: any): boolean {
        return false;
    }

}