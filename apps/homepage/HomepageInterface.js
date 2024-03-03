import { ContentLoaderInterface } from "../../framework/ContentLoaderInterface.js";
export class HomepageInterface {
    static create_layout() {
        ContentLoaderInterface.set_app_customize_css('./apps/homepage/assets/css/homepage.css');
        let request = new XMLHttpRequest();
        request.open("GET", this.css_url);
        request.send();
        request.onreadystatechange = (e) => {
            if (request.readyState == 4 && request.status == 200) {
                const parser = new DOMParser();
                let html_doc = parser.parseFromString(request.responseText, 'text/html');
                ContentLoaderInterface.set_app_layout(html_doc.body.children[0].innerHTML);
                this.register_DOM();
            }
        };
    }
    static register_DOM() {
        this.home_banner_subtitle = document.getElementById("home-banner-subtitle");
        this.home_banner_title = document.getElementById("home-banner-title");
        this.home_banner_abstract = document.getElementById("home-banner-abstract");
        this.home_banner_imgs = document.getElementById("home-banner-imgs");
        this.home_banner_button = document.getElementById("home-banner-button");
        var image = new Image();
        image.addEventListener('load', function () {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            if (HomepageInterface.home_banner_imgs)
                HomepageInterface.home_banner_imgs.style.backgroundImage = 'url(' + HomepageInterface.home_banner_imgs_url + ')';
            (_a = HomepageInterface.home_banner_subtitle) === null || _a === void 0 ? void 0 : _a.classList.remove("loading-components-dark");
            (_b = HomepageInterface.home_banner_title) === null || _b === void 0 ? void 0 : _b.classList.remove("loading-components-dark");
            (_c = HomepageInterface.home_banner_abstract) === null || _c === void 0 ? void 0 : _c.classList.remove("loading-components-dark");
            (_d = HomepageInterface.home_banner_imgs) === null || _d === void 0 ? void 0 : _d.classList.remove("loading-components-light");
            (_e = HomepageInterface.home_banner_subtitle) === null || _e === void 0 ? void 0 : _e.classList.add("loaded-components-dark");
            (_f = HomepageInterface.home_banner_title) === null || _f === void 0 ? void 0 : _f.classList.add("loaded-components-dark");
            (_g = HomepageInterface.home_banner_abstract) === null || _g === void 0 ? void 0 : _g.classList.add("loaded-components-dark");
            (_h = HomepageInterface.home_banner_imgs) === null || _h === void 0 ? void 0 : _h.classList.add("loaded-components-light");
        });
        image.src = HomepageInterface.home_banner_imgs_url;
    }
    static remove_layout() {
        ContentLoaderInterface.remove_app_customize_css(this.css_url);
        ContentLoaderInterface.set_app_layout("");
    }
}
HomepageInterface.home_banner_imgs_url = "./apps/homepage/assets/images/banner_img.JPG";
HomepageInterface.css_url = "./apps/homepage/layout.html";
