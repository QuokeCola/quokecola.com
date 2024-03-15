type ArticleBrowserData = {
    /**
     * The id or url of article
     * Null means it is not in reading but in browser page.
     */
    article_source : string|null;

    /**
     * For browser page, user can select tags to filter the results.
     */
    selected_tags : string[];

    /**
     * For browser page, means the current page that user is browsing.
     */
    page_index : number;
}