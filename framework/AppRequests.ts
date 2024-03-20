export class AppRequests {
    /**
     * Target app name
     */
    app_name:string="";

    /**
     * Request parsed data
     */
    app_data:any;

    /**
     * Unique uuid to identify the website. If history contains the page from other websites,
     * this will help to identify if this is our website.
     */
    website_identifier: string = "c1cb7484-6975-4676-a573-d65fa63e641e";
}