import {AppRequests} from "../../framework/AppRequests.js";
import {ArticleBrowserRequestData} from "./ArticleBrowserData.js";
import {ContentLoaderInterface} from "../../framework/ContentLoaderInterface.js";

export class ArticleBrowserInterface {
    // Defines how many entries for a page
    static page_item_number = 6;
    // Defines how many recommendation article slots shown on sidebar.
    static recommendation_number = 3;

    // Load tags from database
    static tags : string[];
    // Selected tag for article browser filter
    static selected_tags : string[];

    static html_url = "./apps/article_browser/layout.html";
    static css_urls = [
        "./apps/article_browser/assets/css/article_browser_article_card.css",
        "./apps/article_browser/assets/css/article_browser_layout.css",
        "./apps/article_browser/assets/css/article_browser_side_panel.css"];


    static async create_layouts() {
        for (let url of this.css_urls) {
            ContentLoaderInterface.set_app_customize_css(url);
        }
        const response = await fetch(this.html_url);
        const parser = new DOMParser()
        let html_doc = parser.parseFromString(await response.text(), 'text/html');
        ContentLoaderInterface.set_app_layout(html_doc.body.children[0].innerHTML)
    }
    static reload_tags(tags: string[]) {
        let tag_panel = document.getElementById("article-tags-content")
        if (!(tag_panel)) return
        let this_ref = this;
        this.tags = tags;
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

    static insert_recommendation() {

    }
}