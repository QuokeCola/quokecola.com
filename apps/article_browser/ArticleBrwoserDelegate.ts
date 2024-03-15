import {AppDelegate} from "../../framework/AppDelegate.js";
import {ArticleBrowserData} from "./ArticleBrowserData.js";

class ArticleBrwoserDelegate extends AppDelegate{
    app_data: ArticleBrowserData = {request_type: ArticleBrowserData.RequestType.default, article_source: null, page_index: null, selected_tags: null};
    name = "ARTICLES";

    background_service(app_data: typeof this.app_data): boolean {
        return false;
    }

    create_layout(app_data: typeof this.app_data): boolean {
        return false;
    }

    data_to_url(app_data: typeof this.app_data): string {
        switch (app_data.request_type) {
            case ArticleBrowserData.RequestType.load_article:
                return app_data.article_source!.replace("$","^").replace("#","*");
            case ArticleBrowserData.RequestType.load_browser:
                return ["","$"+app_data.selected_tags!.join("$"), app_data.page_index!.toString()].join("#");
            case ArticleBrowserData.RequestType.default:
                // Pass through
            default:
                return "";
        }
    }

    handle_app_requests(app_data: typeof this.app_data): boolean {
        switch (app_data.request_type) {
            case ArticleBrowserData.RequestType.load_article:
                break;
            case ArticleBrowserData.RequestType.load_browser:
                break;
            case ArticleBrowserData.RequestType.default:
                // Pass through, default situation means to handle a request with no data inside, bring up default interface.
            default:

        }
        return false;
    }

    remove_layout(app_data: typeof this.app_data): boolean {
        return false;
    }

    url_to_data(url: string): any {
        let parsed_data : ArticleBrowserData={request_type: ArticleBrowserData.RequestType.default, article_source: null, page_index: null, selected_tags: null};
        let url_levels = url.split("#")
        for(let url_level of url_levels) {
            if(url_level.match("/^[1-9][0-9]*$/")) {
                parsed_data.page_index = Number(url_level);
                parsed_data.request_type = ArticleBrowserData.RequestType.load_browser;
                if (!parsed_data.selected_tags) {
                    parsed_data.selected_tags = [];
                }
            } else if(url_level.includes("$")) {
                parsed_data.selected_tags = url_level.split("$");
                parsed_data.selected_tags.filter(function (tags) {
                    return tags !== "";
                });
                parsed_data.request_type = ArticleBrowserData.RequestType.load_browser;
                if (!parsed_data.page_index) {
                    parsed_data.page_index = 1;
                }
            } else {
                parsed_data.article_source = url_level;
                parsed_data.request_type   = ArticleBrowserData.RequestType.load_article;
            }
        }
    }

}