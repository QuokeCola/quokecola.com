import {AppDelegate} from "../../framework/AppDelegate.js";

class ArticleBrwoserDelegate extends AppDelegate{
    app_data: ArticleBrowserData = {article_source: null, page_index: 0, selected_tags: []};
    name = "ARTICLES";

    background_service(app_data: typeof this.app_data): boolean {
        return false;
    }

    create_layout(app_data: typeof this.app_data): boolean {
        return false;
    }

    data_to_url(app_data: typeof this.app_data): string {
        let url = "";

        return "";
    }

    handle_app_requests(app_data: typeof this.app_data): boolean {
        return false;
    }

    remove_layout(app_data: typeof this.app_data): boolean {
        return false;
    }

    url_to_data(app_data: string): any {
    }

}