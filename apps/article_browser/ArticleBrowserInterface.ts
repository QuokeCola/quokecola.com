import {AppRequests} from "../../framework/AppRequests.js";
import {ArticleBrowserRequestData} from "./ArticleBrowserData.js";
import {ContentLoaderInterface} from "../../framework/ContentLoaderInterface.js";
import {marked} from "marked";
import {NavigationBarInterface} from "../../framework/NavigationBarInterface.js";

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
        "./apps/article_browser/assets/css/article_browser_list_page_card.css",
        "./apps/article_browser/assets/css/article_browser_list_page_tags.css",
        "./apps/article_browser/assets/css/article_browser_list_page_index.css",
        "./apps/article_browser/assets/css/article_browser_list_page_layout.css",
        "./apps/article_browser/assets/css/article_browser_article_layout.css",
        "./apps/article_browser/assets/css/article_browser_article_container.css",
        "./apps/article_browser/assets/css/article_browser_article_side_container.css",
        "./apps/article_browser/assets/css/article_browser_article_back_button.css",
        "./apps/article_browser/assets/css/article_browser_layout.css"];
    private static list_page_obj: HTMLElement|null;
    private static load_article_status_obj : HTMLElement|null;
    private static tag_container_obj : HTMLElement|null;
    private static list_grid_obj: HTMLElement|null;
    private static index_container_obj: HTMLElement|null;
    private static article_page_obj: HTMLElement|null;
    private static md_container_obj:HTMLElement|null;
    private static recommendation_card:HTMLElement|null;
    private static back_button_obj:HTMLElement|null;

    private static state : ArticleBrowserInterface.ArticleBrowserStates = 0;


    static async create_layouts() {
        for (let url of this.css_urls) {
            ContentLoaderInterface.set_app_customize_css(url);
        }
        const response = await fetch(this.html_url);
        const parser = new DOMParser()
        let html_doc = parser.parseFromString(await response.text(), 'text/html');
        ContentLoaderInterface.set_app_layout(html_doc.body.children[0].innerHTML);
        // UI there are two screens, one is list page that has tile to show all articles, another is article page show the specified article.
        // List page.
        ArticleBrowserInterface.list_page_obj = document.getElementById("article-browser-list-page");
        // The handler to switch between different pages
        ArticleBrowserInterface.load_article_status_obj = document.getElementById("article-browser-load-article-status");
        // List page: tag container to filter articles.
        ArticleBrowserInterface.tag_container_obj = document.getElementById("article-browser-list-tag-container");
        // List page: grid container that contains the article thumbnails.
        ArticleBrowserInterface.list_grid_obj = document.getElementById("article-browser-list-grid-container");
        // List page: page index for grid container.
        ArticleBrowserInterface.index_container_obj = document.getElementById("article-browser-list-index");
        // Article page.
        ArticleBrowserInterface.article_page_obj = document.getElementById("article-browser-article-page");
        // Article page: where show the markdown.
        ArticleBrowserInterface.md_container_obj = document.getElementById("article-browser-article-md-container");
        // Article page: side panel recommendation reading.
        ArticleBrowserInterface.recommendation_card = document.getElementById("article-browser-article-recommendation-card");
        // Article page: back button to go back to list page.
        ArticleBrowserInterface.back_button_obj = document.getElementById("article-browser-article-back-button");
    }

    static reload_tags(tags: string[]) {
        if (!ArticleBrowserInterface.tag_container_obj) return;
        ArticleBrowserInterface.tags = tags;
        // Clear all HTML
        ArticleBrowserInterface.tag_container_obj.innerHTML="";
        for (let tag of tags) {
            let tag_btn = document.createElement("button")
            tag_btn.innerText = tag
            if (tags.includes(tag)) tag_btn.classList.add("article-tag-selected");
            tag_btn.onclick = function () {
                if(tag_btn.classList.contains("article-tag-selected")) {
                    // If tag has been selected, deselect it and remove it from list
                    tag_btn.classList.remove("article-tag-selected")
                    let remove_index = ArticleBrowserInterface.selected_tags.indexOf(tag);
                    ArticleBrowserInterface.selected_tags = (remove_index === -1)?
                        ArticleBrowserInterface.selected_tags: ArticleBrowserInterface.selected_tags.splice(remove_index,1)
                } else { // If tag has not been selected, select it and push it into list
                    tag_btn.classList.add("article-tag-selected")
                    let index = ArticleBrowserInterface.selected_tags.indexOf(tag);
                    if (index === -1) {
                        ArticleBrowserInterface.selected_tags.push(tag);
                    }
                }
                let request = new AppRequests();
                request.app_data={
                    article_source: null,
                    page_index: 1,
                    request_type: ArticleBrowserRequestData.RequestType.load_browser,
                    selected_tags: ArticleBrowserInterface.selected_tags
                }
                request.app_name="BLOG"
                window.postMessage(request);
            }
            ArticleBrowserInterface.tag_container_obj.appendChild(tag_btn);
        }
    }

    static load_article(article_HTML: Element) {
        NavigationBarInterface.set_scroll_down_blur_behavior(NavigationBarInterface.ScrollDownBlurBehavior.scroll_down_blur);
        // DOM check
        if (!(ArticleBrowserInterface.load_article_status_obj instanceof HTMLInputElement) ||
            !(ArticleBrowserInterface.md_container_obj) ||
            !(ArticleBrowserInterface.article_page_obj)) {
            return;
        }

        // Check HTML, replace all img labels with wrapper for loading optimization.
        let img_instances = article_HTML.querySelectorAll("img");
        img_instances.forEach((img_instance) => {
            let parent_instance = img_instance.parentElement;
            let img_wrapper_instance = document.createElement("div");
            if (parent_instance) parent_instance.replaceChild(img_wrapper_instance, img_instance);
            img_wrapper_instance.classList.add("loading-components-light");
            img_wrapper_instance.classList.add("article-browser-article-md-container-images");
            img_wrapper_instance.appendChild(img_instance);

            let image_src = new Image();
            image_src.addEventListener("load", ()=> {
                img_wrapper_instance.classList.replace("loading-components-light","loaded-components-light");
            });
            image_src.src = img_instance.src;
        })
        // Loader state machine
        switch (ArticleBrowserInterface.state) {
            // Normal load.
            case ArticleBrowserInterface.ArticleBrowserStates.LIST_READY:
                // Replace md_container content;
                ArticleBrowserInterface.md_container_obj.innerHTML=""
                article_HTML.childNodes.forEach((node)=> {
                    ArticleBrowserInterface.md_container_obj?.appendChild(node);
                })

                ArticleBrowserInterface.article_page_obj.addEventListener("transitionend",(ev)=>{
                    if (ev.target === ArticleBrowserInterface.article_page_obj && ev.propertyName === "left") {
                        ArticleBrowserInterface.state = ArticleBrowserInterface.ArticleBrowserStates.ARTICLE_READY;
                    }
                });
                ArticleBrowserInterface.load_article_status_obj.checked = true;
                ArticleBrowserInterface.state = ArticleBrowserInterface.ArticleBrowserStates.LIST_TO_ARTICLE;
                break;
            case ArticleBrowserInterface.ArticleBrowserStates.LIST_TO_ARTICLE:
            case ArticleBrowserInterface.ArticleBrowserStates.ARTICLE_READY:

                break;
            case ArticleBrowserInterface.ArticleBrowserStates.ARTICLE_TO_LIST:
                ArticleBrowserInterface.load_article_status_obj.checked = true;
                break;
        }
    }

    static load_list() {
        NavigationBarInterface.set_scroll_down_blur_behavior(NavigationBarInterface.ScrollDownBlurBehavior.clear);
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

export namespace ArticleBrowserInterface {
    export enum ArticleBrowserStates{
        LIST_READY,
        LIST_TO_ARTICLE,
        ARTICLE_READY,
        ARTICLE_TO_LIST
    }
    export enum MdContainerStates {
        READY,
        FADE_IN,
        FADED,
        FADE_OUT
    }
}