import {HomepageDelegate} from "../apps/homepage/HomepageDelegate.js";
import {AppRequests} from "./AppRequests.js";
import {AppDelegate} from "./AppDelegate.js";
import {ArticleBrowserDelegate} from "../apps/article_browser/ArticleBrowserDelegate.js";
import {ContentLoaderInterface} from "./ContentLoaderInterface.js";

// Analyzing hyper ref.
let homepage_delegate = new HomepageDelegate();
let articlebr_delegate  = new ArticleBrowserDelegate();
let request = new AppRequests();
let app_delegates : AppDelegate[] = [homepage_delegate, articlebr_delegate];

let url_levels = window.location.href.split(/#|%23/)
try {
    if (url_levels.length === 1 || url_levels[1] === "") {
        request.app_name = "HOME"
    }
} catch (e) {
    console.log(e)
    request.app_name = "HOME"
}


// Url design:
// website.root#app_name#datafield
// ^ raw url.
// Then split them into
// [website.root, app_name, datafield1, datafield2, ...]


window.onload = async () => {
    for (const app_delegate of app_delegates) {
        if (url_levels[1] === app_delegate.name) {
            // Get the url level after the app name for app to extract data.
            // [website.root, app_name, [datafield1, datafield2, ...]]
            //                          ^ From here
            request.app_name = url_levels[1];
            request.app_data = await app_delegate.url_to_data(url_levels.slice(2).join("#"));
            break;
        }
    }
    window.postMessage(request);
    window.onload = ()=>{}
}

//
// let welcome_string = (navigator.platform==="Win32")?
//     "      ___           ___           ___           ___           ___                    ___           ___                    \n" +
//     "     /\\  \\         /\\  \\         /\\  \\         /\\  \\         /\\  \\                  /\\  \\         |\\__\\                   \n" +
//     "    /::\\  \\       /::\\  \\       /::\\  \\       /::\\  \\       /::\\  \\                /::\\  \\        |:|  |                  \n" +
//     "   /:/\\:\\  \\     /:/\\:\\  \\     /:/\\:\\  \\     /:/\\:\\  \\     /:/\\:\\  \\              /:/\\:\\  \\       |:|  |                  \n" +
//     "  /:/  \\:\\  \\   /:/  \\:\\  \\   /:/  \\:\\__\\   /::\\~\\:\\  \\   /:/  \\:\\__\\            /::\\~\\:\\__\\      |:|__|__                \n" +
//     " /:/__/ \\:\\__\\ /:/__/ \\:\\__\\ /:/__/ \\:|__| /:/\\:\\ \\:\\__\\ /:/__/ \\:|__|          /:/\\:\\ \\:|__|     /::::\\__\\               \n" +
//     " \\:\\  \\  \\/__/ \\:\\  \\ /:/  / \\:\\  \\ /:/  / \\:\\~\\:\\ \\/__/ \\:\\  \\ /:/  /          \\:\\~\\:\\/:/  /    /:/~~/~                  \n" +
//     "  \\:\\  \\        \\:\\  /:/  /   \\:\\  /:/  /   \\:\\ \\:\\__\\    \\:\\  /:/  /            \\:\\ \\::/  /    /:/  /                    \n" +
//     "   \\:\\  \\        \\:\\/:/  /     \\:\\/:/  /     \\:\\ \\/__/     \\:\\/:/  /              \\:\\/:/  /     \\/__/                     \n" +
//     "    \\:\\__\\        \\::/  /       \\::/__/       \\:\\__\\        \\::/__/                \\::/__/                                \n" +
//     "     \\/__/         \\/__/         ~~            \\/__/         ~~                     ~~                                    \n" +
//     "      ___           ___           ___           ___           ___           ___           ___           ___       ___     \n" +
//     "     /\\  \\         /\\__\\         /\\  \\         /\\__\\         /\\  \\         /\\  \\         /\\  \\         /\\__\\     /\\  \\    \n" +
//     "    /::\\  \\       /:/  /        /::\\  \\       /:/  /        /::\\  \\       /::\\  \\       /::\\  \\       /:/  /    /::\\  \\   \n" +
//     "   /:/\\:\\  \\     /:/  /        /:/\\:\\  \\     /:/__/        /:/\\:\\  \\     /:/\\:\\  \\     /:/\\:\\  \\     /:/  /    /:/\\:\\  \\  \n" +
//     "   \\:\\~\\:\\  \\   /:/  /  ___   /:/  \\:\\  \\   /::\\__\\____   /::\\~\\:\\  \\   /:/  \\:\\  \\   /:/  \\:\\  \\   /:/  /    /::\\~\\:\\  \\ \n" +
//     "    \\:\\ \\:\\__\\ /:/__/  /\\__\\ /:/__/ \\:\\__\\ /:/\\:::::\\__\\ /:/\\:\\ \\:\\__\\ /:/__/ \\:\\__\\ /:/__/ \\:\\__\\ /:/__/    /:/\\:\\ \\:\\__\\\n" +
//     "     \\:\\/:/  / \\:\\  \\ /:/  / \\:\\  \\ /:/  / \\/_|:|~~|~    \\:\\~\\:\\ \\/__/ \\:\\  \\  \\/__/ \\:\\  \\ /:/  / \\:\\  \\    \\/__\\:\\/:/  /\n" +
//     "      \\::/  /   \\:\\  /:/  /   \\:\\  /:/  /     |:|  |      \\:\\ \\:\\__\\    \\:\\  \\        \\:\\  /:/  /   \\:\\  \\        \\::/  / \n" +
//     "      /:/  /     \\:\\/:/  /     \\:\\/:/  /      |:|  |       \\:\\ \\/__/     \\:\\  \\        \\:\\/:/  /     \\:\\  \\       /:/  /  \n" +
//     "     /:/  /       \\::/  /       \\::/  /       |:|  |        \\:\\__\\        \\:\\__\\        \\::/  /       \\:\\__\\     /:/  /   \n" +
//     "     \\/__/         \\/__/         \\/__/         \\|__|         \\/__/         \\/__/         \\/__/         \\/__/     \\/__/    "
//     :
//     "⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n" +
//     "⠀⠀⠀⠀⠀⡜⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⠀⠀⡜⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⠀⠀⡜⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⠀⠀⡜⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⠀⠀⡜⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡜⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⢣⣀⣀⢣⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n" +
//     "⠀⠀⠀⠀⡜⣿⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⡜⣿⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⡜⣿⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⡜⣿⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⡜⣿⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡜⣿⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⢸⠀⠀⢸⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n" +
//     "⠀⠀⠀⡜⣿⡜⢣⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⡜⣿⡜⢣⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⡜⣿⡜⢣⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⡜⣿⡜⢣⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⡜⣿⡜⢣⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡜⣿⡜⢣⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⢸⣿⢸⠀⠀⢸⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n" +
//     "⠀⠀⡜⣿⡜⠀⠀⢣⣿⢣⠀⠀⢣⠀⠀⠀⡜⣿⡜⠀⠀⢣⣿⢣⠀⠀⢣⠀⠀⠀⡜⣿⡜⠀⠀⢣⣿⢣⣀⣀⢣⠀⠀⠀⡜⣿⣿⢣⠀⢣⣿⢣⠀⠀⢣⠀⠀⠀⡜⣿⡜⠀⠀⢣⣿⢣⣀⣀⢣⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡜⣿⣿⢣⠀⢣⣿⢣⣀⣀⢣⠀⠀⠀⠀⠀⠀⢸⣿⢸⣀⣀⢸⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n" +
//     "⠀⡜⣿⡜⣀⣀⡜⠀⢣⣿⢣⣀⣀⢣⠀⡜⣿⡜⣀⣀⡜⠀⢣⣿⢣⣀⣀⢣⠀⡜⣿⡜⣀⣀⡜⠀⢣⣿⢸⣀⣀⢸⠀⡜⣿⡜⢣⣿⢣⠀⢣⣿⢣⣀⣀⢣⠀⡜⣿⡜⣀⣀⡜⠀⢣⣿⢸⣀⣀⢸⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡜⣿⡜⢣⣿⢣⠀⢣⣿⢸⣀⣀⢸⠀⠀⠀⠀⠀⡜⣿⣿⣿⣿⢣⣀⣀⢣⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n" +
//     "⠀⢣⣿⢣⠀⠀⢣⠀⠀⢣⡜⣀⣀⡜⠀⢣⣿⢣⠀⠀⢣⠀⡜⣿⡜⠀⠀⡜⠀⢣⣿⢣⠀⠀⢣⠀⡜⣿⡜⠀⠀⡜⠀⢣⣿⢣⠀⢣⣿⢣⠀⢣⡜⣀⣀⡜⠀⢣⣿⢣⠀⠀⢣⠀⡜⣿⡜⠀⠀⡜⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢣⣿⢣⠀⢣⣿⢣⡜⣿⡜⠀⠀⡜⠀⠀⠀⠀⡜⣿⡜⠀⠀⡜⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n" +
//     "⠀⠀⢣⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⠀⢣⣿⢣⠀⠀⡜⣿⡜⠀⠀⡜⠀⠀⠀⢣⣿⢣⠀⠀⡜⣿⡜⠀⠀⡜⠀⠀⠀⢣⣿⢣⠀⢣⣿⢣⣀⣀⢣⠀⠀⠀⠀⢣⣿⢣⠀⠀⡜⣿⡜⠀⠀⡜⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢣⣿⢣⠀⢣⣿⣿⡜⠀⠀⡜⠀⠀⠀⠀⡜⣿⡜⠀⠀⡜⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n" +
//     "⠀⠀⠀⢣⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⠀⢣⣿⢣⡜⣿⡜⠀⠀⡜⠀⠀⠀⠀⠀⢣⣿⢣⡜⣿⡜⠀⠀⡜⠀⠀⠀⠀⠀⢣⣿⢣⠀⢣⡜⣀⣀⡜⠀⠀⠀⠀⠀⢣⣿⢣⡜⣿⡜⠀⠀⡜⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢣⣿⢣⡜⣿⡜⠀⠀⡜⠀⠀⠀⠀⠀⢣⡜⣀⣀⡜⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n" +
//     "⠀⠀⠀⠀⢣⣿⢣⣀⣀⢣⠀⠀⠀⠀⠀⠀⠀⠀⢣⣿⣿⡜⠀⠀⡜⠀⠀⠀⠀⠀⠀⠀⢣⣿⣿⡜⣀⣀⡜⠀⠀⠀⠀⠀⠀⠀⢣⣿⢣⣀⣀⢣⠀⠀⠀⠀⠀⠀⠀⠀⢣⣿⣿⡜⣀⣀⡜⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢣⣿⣿⡜⣀⣀⡜⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n" +
//     "⠀⠀⠀⠀⠀⢣⡜⣀⣀⡜⠀⠀⠀⠀⠀⠀⠀⠀⠀⢣⡜⣀⣀⡜⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢣⡜⣀⣀⡜⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n" +
//     "⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⠀⠀⠀⠀⠀\n" +
//     "⠀⠀⠀⠀⠀⡜⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⠀⠀⡜⢣⣀⣀⢣⠀⠀⠀⠀⠀⠀⠀⠀⠀⡜⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⠀⠀⡜⢣⣀⣀⢣⠀⠀⠀⠀⠀⠀⠀⠀⠀⡜⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⠀⠀⡜⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⠀⠀⡜⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⠀⠀⡜⢣⣀⣀⢣⠀⠀⠀⠀⠀⡜⢣⠀⠀⢣⠀⠀⠀⠀\n" +
//     "⠀⠀⠀⠀⡜⣿⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⡜⣿⡜⠀⠀⡜⠀⠀⠀⠀⠀⠀⠀⠀⡜⣿⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⡜⣿⡜⠀⠀⡜⠀⠀⠀⠀⠀⠀⠀⠀⡜⣿⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⡜⣿⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⡜⣿⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⡜⣿⡜⠀⠀⡜⠀⠀⠀⠀⡜⣿⣿⢣⠀⠀⢣⠀⠀⠀\n" +
//     "⠀⠀⠀⡜⣿⡜⢣⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⡜⣿⡜⠀⠀⡜⠀⠀⠀⠀⠀⠀⠀⠀⡜⣿⡜⢣⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⡜⣿⡜⣀⣀⡜⠀⠀⠀⠀⠀⠀⠀⠀⡜⣿⡜⢣⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⡜⣿⡜⢣⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⡜⣿⡜⢣⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⡜⣿⡜⠀⠀⡜⠀⠀⠀⠀⡜⣿⡜⢣⣿⢣⠀⠀⢣⠀⠀\n" +
//     "⠀⠀⠀⢣⣿⢣⠀⢣⣿⢣⠀⠀⢣⠀⠀⠀⡜⣿⡜⠀⠀⡜⠀⠀⣀⣀⣀⠀⠀⠀⡜⣿⡜⠀⠀⢣⣿⢣⠀⠀⢣⠀⠀⠀⡜⣿⣿⢣⣀⣀⢣⣀⣀⣀⣀⠀⠀⠀⡜⣿⣿⢣⠀⢣⣿⢣⠀⠀⢣⠀⠀⠀⡜⣿⡜⠀⠀⢣⣿⢣⠀⠀⢣⠀⠀⠀⡜⣿⡜⠀⠀⢣⣿⢣⠀⠀⢣⠀⠀⠀⡜⣿⡜⠀⠀⡜⠀⠀⠀⠀⡜⣿⣿⢣⠀⢣⣿⢣⠀⠀⢣⠀\n" +
//     "⠀⠀⠀⠀⢣⣿⢣⠀⢣⣿⢣⣀⣀⢣⠀⡜⣿⡜⣀⣀⡜⠀⠀⡜⢣⣀⣀⢣⠀⡜⣿⡜⣀⣀⡜⠀⢣⣿⢣⣀⣀⢣⠀⡜⣿⡜⢣⣿⣿⣿⣿⣿⢣⣀⣀⢣⠀⡜⣿⡜⢣⣿⢣⠀⢣⣿⢣⣀⣀⢣⠀⡜⣿⡜⣀⣀⡜⠀⢣⣿⢣⣀⣀⢣⠀⡜⣿⡜⣀⣀⡜⠀⢣⣿⢣⣀⣀⢣⠀⡜⣿⡜⣀⣀⡜⠀⠀⠀⠀⡜⣿⡜⢣⣿⢣⠀⢣⣿⢣⣀⣀⢣\n" +
//     "⠀⠀⠀⠀⠀⢣⣿⢣⡜⣿⡜⠀⠀⡜⠀⢣⣿⢣⠀⠀⢣⠀⡜⣿⡜⠀⠀⡜⠀⢣⣿⢣⠀⠀⢣⠀⡜⣿⡜⠀⠀⡜⠀⢣⡜⣀⢸⣿⢸⠀⠀⢸⠀⠀⠀⠀⠀⢣⣿⢣⠀⢣⣿⢣⠀⢣⡜⣀⣀⡜⠀⢣⣿⢣⠀⠀⢣⠀⠀⢣⡜⣀⣀⡜⠀⢣⣿⢣⠀⠀⢣⠀⡜⣿⡜⠀⠀⡜⠀⢣⣿⢣⠀⠀⢣⠀⠀⠀⠀⢣⡜⣀⣀⢣⣿⢣⡜⣿⡜⠀⠀⡜\n" +
//     "⠀⠀⠀⠀⠀⠀⢣⣿⣿⡜⠀⠀⡜⠀⠀⠀⢣⣿⢣⠀⠀⡜⣿⡜⠀⠀⡜⠀⠀⠀⢣⣿⢣⠀⠀⡜⣿⡜⠀⠀⡜⠀⠀⠀⠀⠀⢸⣿⢸⠀⠀⢸⠀⠀⠀⠀⠀⠀⢣⣿⢣⠀⢣⣿⢣⣀⣀⢣⠀⠀⠀⠀⢣⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⠀⢣⣿⢣⠀⠀⡜⣿⡜⠀⠀⡜⠀⠀⠀⢣⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⠀⢣⣿⣿⡜⠀⠀⡜⠀\n" +
//     "⠀⠀⠀⠀⠀⠀⡜⣿⡜⠀⠀⡜⠀⠀⠀⠀⠀⢣⣿⢣⡜⣿⡜⠀⠀⡜⠀⠀⠀⠀⠀⢣⣿⢣⡜⣿⡜⠀⠀⡜⠀⠀⠀⠀⠀⠀⢸⣿⢸⠀⠀⢸⠀⠀⠀⠀⠀⠀⠀⢣⣿⢣⠀⢣⡜⣀⣀⡜⠀⠀⠀⠀⠀⢣⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⠀⢣⣿⢣⡜⣿⡜⠀⠀⡜⠀⠀⠀⠀⠀⢣⣿⢣⠀⠀⢣⠀⠀⠀⠀⠀⠀⠀⡜⣿⡜⠀⠀⡜⠀⠀\n" +
//     "⠀⠀⠀⠀⠀⡜⣿⡜⠀⠀⡜⠀⠀⠀⠀⠀⠀⠀⢣⣿⣿⡜⠀⠀⡜⠀⠀⠀⠀⠀⠀⠀⢣⣿⣿⡜⠀⠀⡜⠀⠀⠀⠀⠀⠀⠀⢸⣿⢸⠀⠀⢸⠀⠀⠀⠀⠀⠀⠀⠀⢣⣿⢣⣀⣀⢣⠀⠀⠀⠀⠀⠀⠀⠀⢣⣿⢣⣀⣀⢣⠀⠀⠀⠀⠀⠀⠀⠀⢣⣿⣿⡜⠀⠀⡜⠀⠀⠀⠀⠀⠀⠀⢣⣿⢣⣀⣀⢣⠀⠀⠀⠀⠀⡜⣿⡜⠀⠀⡜⠀⠀⠀\n" +
//     "⠀⠀⠀⠀⠀⢣⡜⣀⣀⡜⠀⠀⠀⠀⠀⠀⠀⠀⠀⢣⡜⣀⣀⡜⠀⠀⠀⠀⠀⠀⠀⠀⠀⢣⡜⣀⣀⡜⠀⠀⠀⠀⠀⠀⠀⠀⠀⢣⢸⣀⣀⢸⠀⠀⠀⠀⠀⠀⠀⠀⠀⢣⡜⣀⣀⡜⠀⠀⠀⠀⠀⠀⠀⠀⠀⢣⡜⣀⣀⡜⠀⠀⠀⠀⠀⠀⠀⠀⠀⢣⡜⣀⣀⡜⠀⠀⠀⠀⠀⠀⠀⠀⠀⢣⡜⣀⣀⡜⠀⠀⠀⠀⠀⢣⡜⣀⣀⡜⠀⠀⠀⠀";
//
// console.log(welcome_string);
// console.log("For source code, please visit: https://github.com/QuokeCola/quokecola.com");