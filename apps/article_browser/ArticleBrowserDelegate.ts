import {AppDelegate} from "../../framework/AppDelegate";
import {ArticleBrowserArticleData, ArticleBrowserAppData} from "./ArticleBrowserData";
import {AppRequests} from "../../framework/AppRequests";
import {NavigationBarInterface} from "../../framework/NavigationBarInterface";
import {ContentLoaderInterface} from "../../framework/ContentLoaderInterface";
import {ArticleBrowserInterface} from "./ArticleBrowserInterface";


export class ArticleBrowserDelegate extends AppDelegate{
    app_data: ArticleBrowserAppData = {request_type: ArticleBrowserAppData.RequestType.default, article_data: null, page_index: null, selected_tags: null};
    name = "BLOG";

    document_info : ArticleBrowserArticleData[]=[];
    list_page_num : number = 8;
    tag_list : string[] = [];

    constructor() {
        super();
        let app_request = new AppRequests()
        let app_data : ArticleBrowserAppData = {
            request_type: ArticleBrowserAppData.RequestType.load_browser,
            article_data: null,
            selected_tags: [],
            page_index: 1
        }
        app_request.app_name = this.name;
        app_request.app_data = app_data;
        NavigationBarInterface.add_btn(this.name, app_request);
    }

    background_service(app_data: typeof this.app_data): boolean {
        return false;
    }

    async load_json() {
        let response = await fetch("./apps/article_browser/markdown_directory/article_list.json")
        while (!response.ok) {
            response = await fetch("./apps/article_browser/markdown_directory/article_list.json")
        }
	this.document_info = JSON.parse(await response.text());
    }

    async create_layout(app_data: typeof this.app_data): Promise<boolean> {
        await this.load_json();
        await ArticleBrowserInterface.create_layouts();
        await this.handle_app_requests(app_data);
        let tags:string[] = [];
        for (let document_i of this.document_info) {
            for(let tag of document_i.tags) {
                if (tags.indexOf(tag) < 0) {
                    tags.push(tag);
                }
            }
        }
        if (app_data.selected_tags){
            ArticleBrowserInterface.write_tags(tags, app_data.selected_tags);
        }
        this.tag_list = tags;
        return false;
    }

    data_to_url(app_data: typeof this.app_data): string {
        switch (app_data.request_type) {
            case ArticleBrowserAppData.RequestType.load_article:
                if (app_data.article_data) {
                    let url_level = app_data.article_data.src.split("/");
                    let article_title = url_level[url_level.length-1];
                    return article_title.replace("$","^").replace("#","*").replace(" ","-");
                } else {
                    return ""
                }

            case ArticleBrowserAppData.RequestType.load_browser:
                if (app_data.selected_tags) {
                    return ["$"+app_data.selected_tags.join("$"), app_data.page_index!.toString()].join("#");
                } else {
                    return ["$", app_data.page_index!.toString()].join("#");
                }

            case ArticleBrowserAppData.RequestType.default:
                // Pass through
            default:
                return "";
        }
    }

    async handle_app_requests(app_data: typeof this.app_data): Promise<boolean> {
        switch (app_data.request_type) {
            case ArticleBrowserAppData.RequestType.load_article:
                if (app_data.article_data) {
                    await ArticleBrowserInterface.load_article(app_data.article_data);
                    let recommendation_index = Math.floor(Math.random()*this.document_info.length);
                    ArticleBrowserInterface.set_recommendation_article(this.document_info[recommendation_index]);
                }
                break;
            case ArticleBrowserAppData.RequestType.load_browser:
                let start_index = 0;
                let end_index = 0;
                let list_document = [];
                // Filter the candidate documents
                if (!app_data.selected_tags) {
                    list_document = this.document_info;
                } else {
                    if (app_data.selected_tags.length === 0) {
                        list_document = this.document_info
                    } else {
                        for (let document_data of this.document_info) {
                            if (app_data.selected_tags.every(function (val) {
                                return document_data.tags.indexOf(val) >= 0;
                            })) {
                                list_document.push(document_data);
                            }
                        }
                    }
                }
                // Get indexes
                let total_index_number = Math.ceil(list_document.length / this.list_page_num);
                if(total_index_number === 0){
                    app_data.page_index = 1;
                } else if (!app_data.page_index || app_data.page_index > total_index_number) {
                    end_index = Math.min(list_document.length, this.list_page_num);
                    app_data.page_index = 1
                } else {
                    start_index = (app_data.page_index - 1) * this.list_page_num;
                    end_index = Math.min(list_document.length, (app_data.page_index) * this.list_page_num);
                }
                list_document = list_document.slice(start_index, end_index);
                await ArticleBrowserInterface.load_list(list_document);
                ArticleBrowserInterface.set_index(total_index_number, app_data.page_index);
                if (this.tag_list.length > 0 && app_data.selected_tags) {
                    ArticleBrowserInterface.write_tags(this.tag_list, app_data.selected_tags);
                }
                break;
            case ArticleBrowserAppData.RequestType.default:
                // Pass through, default situation means to handle a request with no data inside, bring up default interface.
            default:
        }
        return false;
    }

    async quit(app_data: typeof this.app_data): Promise<boolean> {
        // ContentLoaderInterface.set_app_layout("");
        return false;
    }

    async url_to_data(url: string): Promise<ArticleBrowserAppData> {
        await this.load_json();
        let parsed_data: ArticleBrowserAppData = {
            request_type: ArticleBrowserAppData.RequestType.load_browser,
            article_data: null,
            page_index: null,
            selected_tags: null
        };
        let url_levels = url.split("#")
        for (let url_level of url_levels) {
            if (url_level.match("^[1-9]\\d*$")) {
                parsed_data.page_index = Number(url_level);
                parsed_data.request_type = ArticleBrowserAppData.RequestType.load_browser;
                if (!parsed_data.selected_tags) {
                    parsed_data.selected_tags = [];
                }
            } else if (url_level.includes("$")) {
                parsed_data.selected_tags = url_level.split("$");
                parsed_data.selected_tags = parsed_data.selected_tags.filter(function (tags: string) {
                    return tags !== "";
                });
                for (let i = 0; i < parsed_data.selected_tags.length; i++) {
                    parsed_data.selected_tags[i] = parsed_data.selected_tags[i].replace("%20"," ")
                }
                parsed_data.request_type = ArticleBrowserAppData.RequestType.load_browser;
                if (!parsed_data.page_index) {
                    parsed_data.page_index = 1;
                }
            } else {
                let article_file_name = url_level
                    .replace("-", " ")
                    .replace("*", "#")
                    .replace("^", "$");
                if (article_file_name !== "") {
                    for (let article_info of this.document_info) {
                        if (article_info.src.includes(article_file_name)) {
                            parsed_data.article_data = article_info;
                            parsed_data.request_type = ArticleBrowserAppData.RequestType.load_article;
                        }
                    }
                }
            }
        }
        return parsed_data;
    }

    async onload(app_data: any): Promise<boolean> {
        if (app_data.article_source) {
            NavigationBarInterface.set_scroll_down_blur_behavior(NavigationBarInterface.ScrollDownBlurBehavior.scroll_down_blur);
        } else {
            NavigationBarInterface.set_scroll_down_blur_behavior(NavigationBarInterface.ScrollDownBlurBehavior.clear);
        }
        return false;
    }

}
