import {AppRequests} from "../../framework/AppRequests.js";
import {ArticleBrowserArticleData, ArticleBrowserAppData} from "./ArticleBrowserData.js";
import {ContentLoaderInterface} from "../../framework/ContentLoaderInterface.js";
import {NavigationBarInterface} from "../../framework/NavigationBarInterface.js";
import {marked_wrapper} from "../../framework/dependencies/marked_min_wrapper.js";

export class ArticleBrowserInterface {
    // Defines how many entries for a page
    static page_item_number = 6;
    // Defines how many recommendation article slots shown on sidebar.
    static recommendation_number = 3;

    // Load tags from database
    private static tags : string[];
    // Selected tag for article browser filter
    private static selected_tags : string[] = [];
    private static current_index : number = 1;
    static markdown_directory = "./apps/article_browser/markdown_directory/"
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


    private static article_page_obj: HTMLElement|null;
    private static article_container_obj:HTMLElement|null;
    private static article_recommendation_card:HTMLElement|null;
    private static article_banner: HTMLElement|null;
    private static article_container_content:Element;
    private static article_banner_src:string;
    private static back_button_obj:HTMLElement|null;

    private static list_grid_content:HTMLElement[];
    private static list_tag_container_obj : HTMLElement|null;
    private static list_grid_obj: HTMLElement|null;
    private static list_index_container_obj: HTMLElement|null;

    private static tag_collection: HTMLElement[];

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
        ArticleBrowserInterface.list_tag_container_obj = document.getElementById("article-browser-list-tag-container");
        // List page: grid container that contains the article thumbnails.
        ArticleBrowserInterface.list_grid_obj = document.getElementById("article-browser-list-grid-container");
        // List page: page index for grid container.
        ArticleBrowserInterface.list_index_container_obj = document.getElementById("article-browser-list-index");
        // Article page.
        ArticleBrowserInterface.article_page_obj = document.getElementById("article-browser-article-page");
        // Article page: where show the markdown.
        ArticleBrowserInterface.article_container_obj = document.getElementById("article-browser-article-md-container");
        // Article page: side panel recommendation reading.
        ArticleBrowserInterface.article_recommendation_card = document.getElementById("article-browser-article-recommendation-card");
        // Article page: back button to go back to list page.
        ArticleBrowserInterface.back_button_obj = document.getElementById("article-browser-article-back-button");
        // Article page: banner image.
        ArticleBrowserInterface.article_banner = document.getElementById("article-browser-article-article-banner");
        if (ArticleBrowserInterface.article_page_obj) {
            ArticleBrowserInterface.article_page_obj.ontransitionend = (ev)=>{
                if (ev.target === ArticleBrowserInterface.article_page_obj && ev.propertyName === "left"
                    && ArticleBrowserInterface.load_article_status_obj instanceof HTMLInputElement) {
                    if (ArticleBrowserInterface.load_article_status_obj.checked) {
                        ArticleBrowserInterface.state = ArticleBrowserInterface.ArticleBrowserStates.ARTICLE_READY
                    } else {
                        ArticleBrowserInterface.state = ArticleBrowserInterface.ArticleBrowserStates.LIST_READY;
                        if (ArticleBrowserInterface.article_container_obj) {
                            ArticleBrowserInterface.clear_element_content(ArticleBrowserInterface.article_container_obj);
                        }
                    }
                }
            };
        }
        if (ArticleBrowserInterface.back_button_obj) {
            ArticleBrowserInterface.back_button_obj.onclick = () => {
                let app_data : ArticleBrowserAppData = {
                    request_type: ArticleBrowserAppData.RequestType.load_browser,
                    article_source: null,
                    selected_tags: ArticleBrowserInterface.selected_tags,
                    page_index: ArticleBrowserInterface.current_index
                }
                ArticleBrowserInterface.post_data(app_data);
            }
        }
    }

    static write_tags(tags: string[]) {
        if (!ArticleBrowserInterface.list_tag_container_obj) return;
        ArticleBrowserInterface.tags = tags;
        // Clear all HTML
        ArticleBrowserInterface.clear_element_content(ArticleBrowserInterface.list_tag_container_obj);
        ArticleBrowserInterface.tag_collection = [];
        for (let tag of tags) {
            let tag_btn = document.createElement("button")
            tag_btn.innerText = tag;
            tag_btn.classList.add("article-tag")
            if (ArticleBrowserInterface.selected_tags.includes(tag)) tag_btn.classList.add("article-tag-selected");
            tag_btn.onclick = function () {
                if(tag_btn.classList.contains("article-tag-selected")) {
                    // If tag has been selected, deselect it and remove it from list
                    tag_btn.classList.remove("article-tag-selected")
                } else { // If tag has not been selected, select it and push it into list
                    tag_btn.classList.add("article-tag-selected");
                }
                let selected_tags = [];
                for (let tag_b of ArticleBrowserInterface.tag_collection) {
                    if (tag_b.classList.contains("article-tag-selected")) {
                        selected_tags.push(tag_b.innerText);
                    }
                }
                ArticleBrowserInterface.selected_tags = selected_tags;
                let request = new AppRequests();
                request.app_data={
                    article_source: null,
                    page_index: 1,
                    request_type: ArticleBrowserAppData.RequestType.load_browser,
                    selected_tags: ArticleBrowserInterface.selected_tags
                }
                request.app_name="BLOG"
                window.postMessage(request);
            }
            ArticleBrowserInterface.tag_collection.push(tag_btn);
            ArticleBrowserInterface.list_tag_container_obj.appendChild(tag_btn);
        }
    }

    static async load_article(article_data: ArticleBrowserArticleData) {
        NavigationBarInterface.set_scroll_down_blur_behavior(NavigationBarInterface.ScrollDownBlurBehavior.scroll_down_blur);
        ContentLoaderInterface.to_top();
        // DOM check
        if (!(ArticleBrowserInterface.load_article_status_obj instanceof HTMLInputElement) ||
            !(ArticleBrowserInterface.article_container_obj) ||
            !(ArticleBrowserInterface.article_page_obj) ||
            !(ArticleBrowserInterface.article_banner)) {
            return;
        }

        // Update Banner Image
        if (!ArticleBrowserInterface.article_banner.classList.contains("loading-components-light")&&
            !ArticleBrowserInterface.article_banner.classList.contains("loaded-components-light")) {
            ArticleBrowserInterface.article_banner.classList.add("loading-components-light");
        }
        if(ArticleBrowserInterface.article_banner.classList.contains("loaded-components-light")) {
            ArticleBrowserInterface.article_banner.classList.replace("loaded-components-light",
                "loading-components-light");
        }
        let banner_image_loader = new Image()
        banner_image_loader.onload = () => {
            if(ArticleBrowserInterface.article_banner && banner_image_loader.src === ArticleBrowserInterface.article_banner_src) {
                ArticleBrowserInterface.article_banner.style.backgroundImage = "url("+banner_image_loader.src+")";
            }
            ArticleBrowserInterface.article_banner?.classList.replace("loading-components-light",
                "loaded-components-light");
        }
        banner_image_loader.src = ArticleBrowserInterface.markdown_directory + article_data.pic;
        ArticleBrowserInterface.article_banner_src = banner_image_loader.src;
        ArticleBrowserInterface.article_container_content = await ArticleBrowserInterface.generate_article_content(article_data);

        // Loader state machine, load content.
        switch (ArticleBrowserInterface.state) {
            // Normal load.
            case ArticleBrowserInterface.ArticleBrowserStates.LIST_READY:
                // Replace md_container content;
                ArticleBrowserInterface.write_article_content(ArticleBrowserInterface.article_container_content);
                ArticleBrowserInterface.load_article_status_obj.checked = true;
                ArticleBrowserInterface.state = ArticleBrowserInterface.ArticleBrowserStates.LIST_TO_ARTICLE;
                break;
            case ArticleBrowserInterface.ArticleBrowserStates.ARTICLE_TO_LIST:
                ArticleBrowserInterface.load_article_status_obj.checked = true;
                ArticleBrowserInterface.state = ArticleBrowserInterface.ArticleBrowserStates.LIST_TO_ARTICLE;
                // Fall through to load content.
            case ArticleBrowserInterface.ArticleBrowserStates.LIST_TO_ARTICLE:
                // Fall through for list to article and article ready to load content.
            case ArticleBrowserInterface.ArticleBrowserStates.ARTICLE_READY:
                if (!ArticleBrowserInterface.article_container_obj.classList.contains("article-browser-fade")){
                    ArticleBrowserInterface.article_container_obj.classList.add("article-browser-fade");
                }
                // Monitor the css, preventing stuck situation.
                let style = window.getComputedStyle(ArticleBrowserInterface.article_container_obj,':before');
                if (style['backgroundColor']==="rgb(255, 255, 255)" ) {
                    ArticleBrowserInterface.write_article_content(ArticleBrowserInterface.article_container_content);
                    ArticleBrowserInterface.article_container_obj.classList.remove("article-browser-fade");
                    ArticleBrowserInterface.article_container_obj.ontransitionend = ()=> {}
                } else {
                    ArticleBrowserInterface.article_container_obj.ontransitionend = (ev)=>{
                        // Replace md_container content;
                        if (ev.propertyName==="background-color"&&ev.target===ArticleBrowserInterface.article_container_obj &&
                            ArticleBrowserInterface.article_container_obj) {
                            ArticleBrowserInterface.write_article_content(ArticleBrowserInterface.article_container_content);
                            ArticleBrowserInterface.article_container_obj.classList.remove("article-browser-fade");
                            ArticleBrowserInterface.article_container_obj.ontransitionend = ()=> {}
                        }
                    }
                }
                break;
        }
    }

    static async load_list(article_data_array: ArticleBrowserArticleData[]) {
        NavigationBarInterface.set_scroll_down_blur_behavior(NavigationBarInterface.ScrollDownBlurBehavior.clear);
        ContentLoaderInterface.to_top();
        if (!(ArticleBrowserInterface.load_article_status_obj instanceof HTMLInputElement) ||
            !ArticleBrowserInterface.article_container_obj ||
            !ArticleBrowserInterface.list_page_obj ||
            !ArticleBrowserInterface.list_grid_obj) {
            return
        }
        ArticleBrowserInterface.list_grid_content = ArticleBrowserInterface.generate_article_cards(article_data_array);

        switch (ArticleBrowserInterface.state) {
            case ArticleBrowserInterface.ArticleBrowserStates.LIST_TO_ARTICLE:
                ArticleBrowserInterface.load_article_status_obj.checked = false;
                ArticleBrowserInterface.state = ArticleBrowserInterface.ArticleBrowserStates.ARTICLE_TO_LIST;
                // Fall through
            case ArticleBrowserInterface.ArticleBrowserStates.ARTICLE_TO_LIST:
                // Fall through
            case ArticleBrowserInterface.ArticleBrowserStates.LIST_READY:
                if (!ArticleBrowserInterface.list_page_obj.classList.contains("article-browser-fade")){
                    ArticleBrowserInterface.list_page_obj.classList.add("article-browser-fade");
                }
                // Monitor the css, preventing stuck situation.
                let style = window.getComputedStyle(ArticleBrowserInterface.list_page_obj,':before');
                if (style['backgroundColor']==="rgb(255, 255, 255)") {
                    ArticleBrowserInterface.write_list_content(ArticleBrowserInterface.list_grid_content);
                    ArticleBrowserInterface.list_page_obj.classList.remove("article-browser-fade");
                    ArticleBrowserInterface.list_page_obj.ontransitionend = ()=> {}
                } else {
                    ArticleBrowserInterface.list_page_obj.ontransitionend = (ev)=>{
                        // Replace md_container content;
                        if (ev.propertyName==="background-color"&&ev.target===ArticleBrowserInterface.list_page_obj
                            && ArticleBrowserInterface.list_page_obj) {
                            ArticleBrowserInterface.write_list_content(ArticleBrowserInterface.list_grid_content);
                            ArticleBrowserInterface.list_page_obj.classList.remove("article-browser-fade");
                            ArticleBrowserInterface.list_page_obj.ontransitionend = ()=> {}
                        }
                    }
                }
                break;
            case ArticleBrowserInterface.ArticleBrowserStates.ARTICLE_READY:
                ArticleBrowserInterface.write_list_content(ArticleBrowserInterface.list_grid_content);
                ArticleBrowserInterface.load_article_status_obj.checked = false;
                ArticleBrowserInterface.state = ArticleBrowserInterface.ArticleBrowserStates.ARTICLE_TO_LIST;
                break;
        }
    }

    static set_index(total_index: number, current_index: number) {
        if (!ArticleBrowserInterface.list_index_container_obj) {
            return;
        }
        ArticleBrowserInterface.current_index = current_index;
        ArticleBrowserInterface.clear_element_content(ArticleBrowserInterface.list_index_container_obj);
        let left_btn = document.createElement("div");
        left_btn.innerText = "<"
        left_btn.onclick = ()=>{
            if (current_index > 1) {
                let app_data : ArticleBrowserAppData = {
                    request_type: ArticleBrowserAppData.RequestType.load_browser,
                    article_source: null,
                    selected_tags: ArticleBrowserInterface.selected_tags,
                    page_index: current_index - 1
                }
                this.post_data(app_data)
            }
        }
        let right_btn = document.createElement("div")
        right_btn.innerText = ">"
        right_btn.onclick = () => {
            if (current_index < total_index) {
                let app_data : ArticleBrowserAppData = {
                    request_type: ArticleBrowserAppData.RequestType.load_browser,
                    article_source: null,
                    selected_tags: ArticleBrowserInterface.selected_tags,
                    page_index: current_index + 1
                }
                this.post_data(app_data)
            }
        }
        ArticleBrowserInterface.list_index_container_obj.appendChild(left_btn)
        for (let i = 0; i < total_index; i++) {
            let index_btn = document.createElement("div");
            index_btn.innerText = (i+1).toString();
            if (i+1===current_index) {
                index_btn.classList.add("article-browser-list-index-selected");
            }
            index_btn.onclick = ()=>{
                let app_data : ArticleBrowserAppData = {
                    request_type: ArticleBrowserAppData.RequestType.load_browser,
                    article_source: null,
                    selected_tags: ArticleBrowserInterface.selected_tags,
                    page_index: i+1
                }
                ArticleBrowserInterface.post_data(app_data);
            }
            ArticleBrowserInterface.list_index_container_obj.appendChild(index_btn);
        }
        ArticleBrowserInterface.list_index_container_obj.appendChild(right_btn);
    }

    static get_selected_tags() {
        return ArticleBrowserInterface.selected_tags;
    }

    static get_tags() {
        return ArticleBrowserInterface.tags;
    }

    private static async generate_article_content(article_data: ArticleBrowserArticleData) : Promise<Element> {
        const response = await fetch(ArticleBrowserInterface.markdown_directory+article_data.src);
        let parser = new DOMParser();
        let html_doc = parser.parseFromString(await marked_wrapper.parse(await response.text()),'text/html').body;
        // Check HTML, replace all img labels with wrapper for loading optimization.
        let img_instances = html_doc.querySelectorAll("img");
        for(let img_instance of img_instances) {
            let parent_instance = img_instance.parentElement;
            let img_wrapper_instance = document.createElement("div");
            if (parent_instance) parent_instance.replaceChild(img_wrapper_instance, img_instance);
            img_wrapper_instance.classList.add("loading-components-light");
            img_wrapper_instance.classList.add("article-browser-article-md-container-images");
            img_wrapper_instance.appendChild(img_instance);
            let image_loader = new Image();
            image_loader.addEventListener("load", () => {
                img_wrapper_instance.classList.replace("loading-components-light", "loaded-components-light");
            });
            image_loader.src = img_instance.src;
        }
        return html_doc;
    }

    private static write_article_content(html_element: Element) {
        if (ArticleBrowserInterface.article_container_obj) {
            ArticleBrowserInterface.clear_element_content(ArticleBrowserInterface.article_container_obj);
            for (let child of html_element.childNodes) {
                ArticleBrowserInterface.article_container_obj.appendChild(child);
            }
        }
    }

    private static generate_article_cards(article_data_array: ArticleBrowserArticleData[]): HTMLElement[] {
        let article_link_content:HTMLElement[] = [];
        for (let article_data of article_data_array) {
            let card_instance = document.createElement("div");
            card_instance.classList.add("article-browser-list-quarter-tile");
            let image_instance = document.createElement("div");
            card_instance.appendChild(image_instance)
            let title_instance = document.createElement("h1");
            title_instance.innerText = article_data.title;
            title_instance.classList.add("loading-components-light")
            card_instance.appendChild(title_instance)

            let detail_instance = document.createElement("div");
            detail_instance.classList.add("article-browser-list-detail");
            let time_instance = document.createElement("span");
            time_instance.innerText = article_data.time;
            detail_instance.appendChild(time_instance)
            let abstract_instance = document.createElement("p");
            abstract_instance.innerText = article_data.abstract;
            detail_instance.appendChild(abstract_instance)
            detail_instance.classList.add("loading-components-light")
            for (let tag of article_data.tags) {
                let tag_instance = document.createElement("button");
                tag_instance.innerText = tag;
                tag_instance.classList.add("article-browser-list-card-tags");
                detail_instance.appendChild(tag_instance);
            }
            card_instance.appendChild(detail_instance);
            image_instance.classList.add("article-browser-list-card-img");
            image_instance.classList.add("loading-components-light");
            let image_loader = new Image();
            image_loader.addEventListener("load",()=>{
                title_instance.classList.replace("loading-components-light","loaded-components-light");
                detail_instance.classList.replace("loading-components-light","loaded-components-light");
                image_instance.classList.replace("loading-components-light","loaded-components-light");
                image_instance.style.backgroundImage = "url("+image_loader.src+")"
            });
            card_instance.onclick = ()=>{
                let app_data:ArticleBrowserAppData = {
                    article_source: article_data,
                    page_index: null,
                    request_type: ArticleBrowserAppData.RequestType.load_article,
                    selected_tags: null
                };
                ArticleBrowserInterface.post_data(app_data);
            }
            article_link_content.push(card_instance);
            image_loader.src = ArticleBrowserInterface.markdown_directory + article_data.pic;
        }
        return article_link_content;
    }

    private static write_list_content(html_element: HTMLElement[]) {
        if (ArticleBrowserInterface.list_grid_obj) {
            ArticleBrowserInterface.clear_element_content(ArticleBrowserInterface.list_grid_obj);
            for (let child of html_element) {
                ArticleBrowserInterface.list_grid_obj.appendChild(child);
            }
        }
    }

    private static clear_element_content(element : HTMLElement) {
        while (element.lastElementChild) {
            element.removeChild(element.lastElementChild);
        }
    }

    private static post_data(app_data: ArticleBrowserAppData) {
        let app_request = new AppRequests()
        app_request.app_name = "BLOG";
        app_request.app_data = app_data;
        window.postMessage(app_request)
    }
}

export namespace ArticleBrowserInterface {
    export enum ArticleBrowserStates{
        LIST_READY,
        LIST_TO_ARTICLE,
        ARTICLE_READY,
        ARTICLE_TO_LIST
    }
}