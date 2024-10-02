export interface ArticleBrowserAppData {

    request_type : ArticleBrowserAppData.RequestType
    /**
     * The id or url of article
     * Null means it is not in reading but in browser page.
     */
    article_data : ArticleBrowserArticleData|null;

    /**
     * For browser page, user can select tags to filter the results.
     */
    selected_tags : string[]|null;

    /**
     * For browser page, means the current page that user is browsing.
     */
    page_index : number|null;
}

export namespace ArticleBrowserAppData
{
    export enum RequestType
    {
        default,
        load_article,
        load_browser
    }
}

export interface ArticleBrowserArticleData {
    "title": string,
    "pic": string,
    "time": string,
    "src": string,
    "abstract": string,
    "tags": string[]
}