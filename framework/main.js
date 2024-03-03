import { HomepageDelegate } from "../apps/homepage/HomepageDelegate.js";
import { AppRequests } from "./AppRequests.js";
// Analyzing hyper ref.
let homepage_delegate = new HomepageDelegate();
let request = new AppRequests();
let app_delegates = [homepage_delegate];
request.url = "#404";
let url_levels = window.location.href.split("#");
if (url_levels.length === 1) {
    request.app_name = "HOME";
}
for (const app_delegate of app_delegates) {
    if (url_levels[1] === app_delegate.name) {
        request.app_name = url_levels[1];
        request.app_data = app_delegate.url_to_data(window.location.href);
        request.url = app_delegate.data_to_url(request.app_data);
        break;
    }
}
window.postMessage(request);
