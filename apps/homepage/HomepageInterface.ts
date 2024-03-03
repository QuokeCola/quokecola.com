import {ContentLoaderInterface} from "../../framework/ContentLoaderInterface.js";
export class HomepageInterface {
    static home_banner_subtitle : HTMLElement|null;
    static home_banner_title : HTMLElement|null;
    static home_banner_abstract : HTMLElement|null;
    static home_banner_imgs : HTMLElement|null;
    static home_banner_button: HTMLElement|null;
    static home_banner_imgs_url:string = "./apps/homepage/assets/images/banner_img.JPG"

    static css_url: string = "./apps/homepage/layout.html"
    static create_layout() {
        ContentLoaderInterface.set_app_customize_css('./apps/homepage/assets/css/homepage.css');
        let request = new XMLHttpRequest();
        request.open("GET", this.css_url)
        request.send()
        request.onreadystatechange=(e) => {
            if (request.readyState==4&&request.status==200) {
                const parser = new DOMParser()
                let html_doc = parser.parseFromString(request.responseText,'text/html');
                ContentLoaderInterface.set_app_layout(html_doc.body.children[0].innerHTML)
                this.register_DOM()
            }
        }
    }

    static register_DOM() {
        this.home_banner_subtitle = document.getElementById("home-banner-subtitle");
        this.home_banner_title    = document.getElementById("home-banner-title");
        this.home_banner_abstract = document.getElementById("home-banner-abstract");
        this.home_banner_imgs     = document.getElementById("home-banner-imgs");
        this.home_banner_button   = document.getElementById("home-banner-button");
        var image = new Image();
        image.addEventListener('load', function() {
            if (HomepageInterface.home_banner_imgs)
            HomepageInterface.home_banner_imgs.style.backgroundImage = 'url(' + HomepageInterface.home_banner_imgs_url + ')';
            HomepageInterface.home_banner_subtitle?.classList.remove("loading-components-dark")
            HomepageInterface.home_banner_title?.classList.remove("loading-components-dark")
            HomepageInterface.home_banner_abstract?.classList.remove("loading-components-dark")
            HomepageInterface.home_banner_imgs?.classList.remove("loading-components-light")

            HomepageInterface.home_banner_subtitle?.classList.add("loaded-components-dark")
            HomepageInterface.home_banner_title?.classList.add("loaded-components-dark")
            HomepageInterface.home_banner_abstract?.classList.add("loaded-components-dark")
            HomepageInterface.home_banner_imgs?.classList.add("loaded-components-light")
        });
        image.src = HomepageInterface.home_banner_imgs_url;
    }

    static remove_layout() {
        ContentLoaderInterface.remove_app_customize_css(this.css_url);
        ContentLoaderInterface.set_app_layout("");
    }
}