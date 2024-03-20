export interface ArticleBrowserRequestData {

    request_type : ArticleBrowserRequestData.RequestType
    /**
     * The id or url of article
     * Null means it is not in reading but in browser page.
     */
    article_source : string|null;

    /**
     * For browser page, user can select tags to filter the results.
     */
    selected_tags : string[]|null;

    /**
     * For browser page, means the current page that user is browsing.
     */
    page_index : number|null;
}

export namespace ArticleBrowserRequestData
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