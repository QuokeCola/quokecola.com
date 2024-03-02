import { AppRequests } from "./AppRequests.js";
import { ContentLoaderInterface } from "./ContentLoaderInterface.js";
import { NavigationBarInterface } from "./NavigationBarInterface.js";
/**
 * Base class for interface. This interface will automatically handle the requests based on app's name.
 * This interface is running in browser but not on Node.js (server side), and it is driven by the events
 * service provided by browser.
 * It will also automatically update the UI when different app is called.
 */
export class AppDelegate {
    /************************************************
     *  Prepared Methods
     ***********************************************/
    post_message(app_request) {
        window.postMessage(app_request);
    }
    /************************************************
     *  App Schedule Framework -- Auto Call
     ***********************************************/
    /**
     * When user is switching from other apps to current app
     * @param app_data The event send to application.
     * @return Whether successfully awake.
     * @private
     */
    awake(app_data) {
        return this.create_layout(app_data) && this.register_DOM(app_data);
    }
    /**
     * When browser is switching to other apps.
     * @return Whether successfully sleep.
     * @private
     */
    sleep(app_request) {
        this.last_session_app_data = this.current_session_app_data;
        return this.remove_layout(app_request.app_data);
    }
    /**
     * This is the main service for app delegate.
     * @param app_event
     * @param this_ref
     * @protected
     */
    listener_function(this_ref, app_event) {
        // Retrieve last app request from history
        let last_state_app_request = new AppRequests();
        if (window.history.state &&
            window.history.state.data &&
            window.history.state.data.website_identifier &&
            window.history.state.data.website_identifier === "c1cb7484-6975-4676-a573-d65fa63e641e") {
            if (app_event instanceof MessageEvent) {
                last_state_app_request = window.history.state.data;
            }
            else if (app_event instanceof PopStateEvent) {
                last_state_app_request = AppDelegate.current_app_request;
            }
        }
        // Retrieve current app request from event
        let app_request;
        if (app_event instanceof MessageEvent) {
            app_request = app_event.data;
        }
        else if (app_event instanceof PopStateEvent) {
            app_request = app_event.state.data;
        }
        else { // Unknown source
            app_request = new AppRequests();
        }
        if (app_request.website_identifier === "c1cb7484-6975-4676-a573-d65fa63e641e") {
            if (app_request.app_name === this_ref.name) { // If user is using current app
                if (last_state_app_request.app_name !== this_ref.name) { // If user is switching from other apps
                    this_ref.awake(app_request.app_data); // Create layout & register DOM
                    setTimeout(() => {
                        ContentLoaderInterface.set_loading_status(false);
                    }, 1000);
                }
                this_ref.handle_app_requests(app_request.app_data);
                this_ref.current_session_app_data = app_request.app_data;
                if (!(app_event instanceof PopStateEvent)) {
                    history.pushState(app_request, this_ref.data_to_url(app_request.app_data)); // Update history
                }
                AppDelegate.current_app_request = app_request;
            }
            else if (last_state_app_request.app_name === this_ref.name &&
                app_request.app_name !== this_ref.name) { // If user is quitting current app
                ContentLoaderInterface.set_loading_status(true);
                setTimeout(() => {
                    this_ref.sleep(app_request.app_data);
                }, 400);
            }
            else { // Background service (If any)
                this_ref.background_service(app_request.app_data);
            }
        }
    }
    constructor() {
        ContentLoaderInterface.initialize();
        NavigationBarInterface.initialize();
        window.addEventListener("message", (evt) => {
            this.listener_function(this, evt);
        }, false);
        window.addEventListener("popstate", (evt) => {
            this.listener_function(this, evt);
        }, false);
    }
}
