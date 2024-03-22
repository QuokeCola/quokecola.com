import {AppRequests} from "../../framework/AppRequests.js";
import {ArticleBrowserRequestData} from "./ArticleBrowserData.js";
import {ContentLoaderInterface} from "../../framework/ContentLoaderInterface.js";

export class ArticleBrowserInterface {
    // Defines how many entries for a page
    static page_item_number = 6;
    // Defines how many recommendation article slots shown on sidebar.
    static recommendation_number = 3;

    // Load tags from database
    private static tags : string[];
    // Selected tag for article browser filter
    private static selected_tags : string[];

    static html_url = "./apps/article_browser/layout.html";
    static css_urls = [
        "./apps/article_browser/assets/css/article_browser_card.css",
        "./apps/article_browser/assets/css/article_browser_tags.css",
        "./apps/article_browser/assets/css/article_browser_layout.css"];

    static title_wrapper : HTMLElement|null;
    static title_content: HTMLElement|null;
    static main_content: HTMLElement|null;
    static tag_wrapper: HTMLElement|null;
    static tag_content: HTMLElement|null;
    static index_wrapper: HTMLElement|null;
    static index_content: HTMLElement|null;
    static recommend_wrapper : HTMLElement|null;
    static recommend_content : HTMLElement|null;


    static async create_layouts() {
        for (let url of this.css_urls) {
            ContentLoaderInterface.set_app_customize_css(url);
        }
        const response = await fetch(this.html_url);
        const parser = new DOMParser()
        let html_doc = parser.parseFromString(await response.text(), 'text/html');
        ContentLoaderInterface.set_app_layout(html_doc.body.children[0].innerHTML)
        ArticleBrowserInterface.title_wrapper = document.getElementById("article-title-wrapper")
        ArticleBrowserInterface.title_content = document.getElementById("article-title-content")
        ArticleBrowserInterface.main_content = document.getElementById("article-main-content")
        ArticleBrowserInterface.tag_wrapper = document.getElementById("article-tags-wrapper")
        ArticleBrowserInterface.tag_content = document.getElementById("article-tags-content")
        ArticleBrowserInterface.index_wrapper = document.getElementById("article-index-wrapper")
        ArticleBrowserInterface.index_content = document.getElementById("article-index-content")
        ArticleBrowserInterface.recommend_wrapper = document.getElementById("article-recommendations-wrapper")
        ArticleBrowserInterface.recommend_content = document.getElementById("article-recommendations-content")
    }

    static reload_tags(tags: string[]) {
        let tag_panel = document.getElementById("article-tags-content")
        if (!(tag_panel)) return
        let this_ref = this;
        ArticleBrowserInterface.tags = tags;
        for (let tag of tags) {
            let tag_btn = document.createElement("button")
            tag_btn.innerText = tag
            if (tags.includes(tag)) tag_btn.classList.add("article-tag-selected");
            tag_btn.onclick = function () {
                if(tag_btn.classList.contains("article-tag-selected")) {
                    // If tag has been selected, deselect it and remove it from list
                    tag_btn.classList.remove("article-tag-selected")
                    let remove_index = this_ref.selected_tags.indexOf(tag);
                    this_ref.selected_tags = (remove_index === -1)?
                        this_ref.selected_tags: this_ref.selected_tags.splice(remove_index,1)
                } else { // If tag has not been selected, select it and push it into list
                    tag_btn.classList.add("article-tag-selected")
                    let index = this_ref.selected_tags.indexOf(tag);
                    if (index === -1) {
                        this_ref.selected_tags.push(tag);
                    }
                }
                let request = new AppRequests();
                request.app_data={
                    article_source: null,
                    page_index: 1,
                    request_type: ArticleBrowserRequestData.RequestType.load_browser,
                    selected_tags: this_ref.selected_tags
                }
                request.app_name="BLOG"
                window.postMessage(request);
            }
            tag_panel.appendChild(tag_btn);
        }
    }

    static show_browser_layout() {

    }

    static show_article_layout() {

    }

    static add_recommendations() {
    }

    static add_articles(){
    }

    static get_selected_tags() {
        return ArticleBrowserInterface.selected_tags;
    }

    static get_tags() {
        return ArticleBrowserInterface.tags;
    }
}