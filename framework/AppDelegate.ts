import {AppRequests} from "./AppRequests.js";
import {ContentLoaderInterface} from "./ContentLoaderInterface.js";
import {NavigationBarInterface} from "./NavigationBarInterface.js";
import ContentLoaderStates = ContentLoaderInterface.ContentLoaderStates;

/**
 * Base class for interface. This interface will automatically handle the requests based on app's name.
 * This interface is running in browser but not on Node.js (server side), and it is driven by the events
 * service provided by browser.
 * It will also automatically update the UI when different app is called.
 */
export abstract class AppDelegate{

    /************************************************
     *  App info
     ***********************************************/
    /**
     * To identify the app.
     */
    abstract name: string;

    /**
     * App customized data
     */
    abstract app_data: any;

    /************************************************
     *  App Service Functions
     ***********************************************/
    /**
     * Here implements when app is awake, re-creates the layout for continue operation
     * @param app_data The event send to application.
     * @return Whether successfully create layout
     */
    abstract create_layout(app_data: typeof this.app_data) : boolean;

    /**
     * When the app interface is loaded, the delegate will call this function.
     * @param app_data
     */
    abstract onload(app_data: typeof this.app_data) : boolean;

    /**
     * Here implements the main logic of the app. Operating DOM to behave.
     * @return whether successfully handle request
     */
    abstract handle_app_requests(app_data: typeof this.app_data) : boolean;

    /**
     * Here implements when user switch to other apps, release resources.
     * @return Whether successfully sleep
     */
    abstract quit(app_data: typeof this.app_data) : boolean;

    /**
     * Here implements the background service for the app.
     * @param app_data
     */
    abstract background_service(app_data: any): boolean

    /**
     * Here implements convert user data to url.
     * @param app_data
     */
    abstract data_to_url(app_data: typeof this.app_data) : string;

    /**
     * Here implements the method that parse url to user data
     * @param url The url.
     */
    abstract url_to_data(url: string) : typeof this.app_data;

    /************************************************
     *  App Cache
     ***********************************************/
    /**
     * The global variable that records the current app's request
     */
    static current_app_request : AppRequests;
    /**
     * The global variable that records the last app's request
     */
    static last_app_request : AppRequests;
    /**
     * Here stores the current app data (For buffer and reference).
     * @protected
     */
    protected current_session_app_data : typeof this.app_data;

    /**
     * Here stores the session data when app sleeps.
     */
    protected last_session_app_data : typeof this.app_data;


    /************************************************
     *  App Schedule Framework -- Auto Call
     ***********************************************/

    /**
     * This is the main service for app delegate.
     * @param app_event
     * @param this_ref
     * @protected
     */
    private listener_function(this_ref: typeof this, app_event: MessageEvent|PopStateEvent) {
        // Initial start, there is no last app request.
        if (!AppDelegate.last_app_request) {
            AppDelegate.last_app_request = new AppRequests();
        }

        // Retrieve current app request from event
        if(app_event instanceof MessageEvent) {
            AppDelegate.current_app_request = app_event.data;
        } else if (app_event instanceof PopStateEvent && app_event.state) {
            AppDelegate.current_app_request = app_event.state;
        } else { // Unknown source
            AppDelegate.current_app_request = new AppRequests();
        }

        if(AppDelegate.current_app_request.website_identifier === "c1cb7484-6975-4676-a573-d65fa63e641e") {
            // Block out the repeated requests when it's loading
            if (ContentLoaderInterface.get_content_loader_state()!==ContentLoaderStates.READY) {return}
            if( AppDelegate.current_app_request.app_name === this_ref.name){ // If user is using current app
                // If user is switching from other apps
                if(AppDelegate.last_app_request.app_name !== this_ref.name) {
                    ContentLoaderInterface.load_app_layout(()=> { // Loading screen lift
                        // Clear screen and customized css.
                        ContentLoaderInterface.set_app_layout("");
                        ContentLoaderInterface.clear_app_customized_css();
                        this_ref.create_layout(AppDelegate.current_app_request.app_data); // Create layout
                    });
                    ContentLoaderInterface.app_onload(()=>{
                        this_ref.current_session_app_data = AppDelegate.current_app_request.app_data;
                        this_ref.onload(AppDelegate.current_app_request.app_data);
                        document.title = this_ref.name;
                        if (!(app_event instanceof PopStateEvent)){
                            let url_levels = window.location.href.split("#");
                            let url = url_levels[0];
                            url = url + "#"+this_ref.name+"#"+this_ref.data_to_url(AppDelegate.current_app_request.app_data); // Get url.
                            window.history.pushState(AppDelegate.current_app_request, "", url);
                        }
                        this.last_session_app_data = this.current_session_app_data;
                        AppDelegate.last_app_request = AppDelegate.current_app_request;
                    })
                    return;
                }
                // Update session data
                this_ref.current_session_app_data = AppDelegate.current_app_request.app_data;

                // Handle app request, only app data needed
                this_ref.handle_app_requests(AppDelegate.current_app_request.app_data);

                /// Update history
                if (!(app_event instanceof PopStateEvent)){
                    // Get base url
                    let url_levels = window.location.href.split("#");
                    let url = url_levels[0];
                    // Compose new url based on app data.
                    url = url + "#"+this_ref.name+"#"+this_ref.data_to_url(AppDelegate.current_app_request.app_data); // Get url.
                    window.history.pushState(AppDelegate.current_app_request, "", url);
                }
                this.last_session_app_data = this.current_session_app_data;
                AppDelegate.last_app_request = AppDelegate.current_app_request;
            } else if (
                AppDelegate.last_app_request.app_name === this_ref.name &&
                AppDelegate.current_app_request.app_name !== this_ref.name){ // If user is quitting current app
                this_ref.quit(this.app_data);
            } else { // Background service (If any)
                this_ref.background_service(AppDelegate.current_app_request.app_data)
            }
        }
    }
    protected constructor() {
        ContentLoaderInterface.initialize();
        NavigationBarInterface.initialize();
        window.addEventListener("message", (evt) => {
            this.listener_function(this,evt);
        },false);
        window.addEventListener("popstate",(evt) => {
            this.listener_function(this,evt);
        }, false);
    }
}