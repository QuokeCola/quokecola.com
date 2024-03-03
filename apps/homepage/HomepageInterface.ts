import {ContentLoaderInterface} from "../../framework/ContentLoaderInterface.js";
export class HomepageInterface {
    static home_banner_subtitle : HTMLElement|null;
    static home_banner_title : HTMLElement|null;
    static home_banner_abstract : HTMLElement|null;
    static home_banner_imgs : HTMLElement|null;
    static home_banner_button: HTMLElement|null;
    static home_banner_imgs_url:string = "./apps/homepage/assets/images/banner_img.JPG"
    static html_url = "./apps/homepage/layout.html"
    static css_urls: string[] = [
        "./apps/homepage/assets/css/homepage_layout.css",
        "./apps/homepage/assets/css/homepage_banner.css",
        "./apps/homepage/assets/css/homepage_biography.css",
        "./apps/homepage/assets/css/homepage_works.css"]
    static works_images_url: string[] = [
        "./apps/homepage/assets/images/project_therm_calc_tile_pic.png",
        "./apps/homepage/assets/images/project_terminal_tile_pic.png",
        "./apps/homepage/assets/images/project_pcb_tile_pic.png"
    ]
    static create_layout() {
        for(let url of this.css_urls) {
            ContentLoaderInterface.set_app_customize_css(url);
        }
        let request = new XMLHttpRequest();
        request.open("GET", this.html_url)
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
        let tiles= document.querySelectorAll(".home-quarter-size-tile")
        for (let idx = 0; idx < 3; idx++) {
            var github_images = new Image();
            github_images.addEventListener('load', function() {
                let img_obj = tiles.item(idx+1).querySelector("div")
                if (img_obj) img_obj.style.backgroundImage = 'url('+HomepageInterface.works_images_url[idx]+')';
                img_obj?.classList.remove("loading-components-light")
                img_obj?.classList.add("loaded-components-light")
                let title_obj = tiles.item(idx+1).querySelector("h1")
                title_obj?.classList.remove("loading-components-light")
                title_obj?.classList.add("loaded-components-light")
                let p_obj = tiles.item(idx+1).querySelector("p")
                p_obj?.classList.remove("loading-components-light")
                p_obj?.classList.add("loaded-components-light")
            });
            github_images.src = HomepageInterface.works_images_url[idx];
        }

        var banner_image = new Image();
        banner_image.addEventListener('load', function() {
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
        banner_image.src = HomepageInterface.home_banner_imgs_url;
        var selfie_image = new Image();
        banner_image.addEventListener('load', function() {
            let selfie_img_obj: HTMLImageElement|null = document.querySelector(".home-half-size-tile > img");
            if (selfie_img_obj) selfie_img_obj.src="./apps/homepage/assets/images/selfie.jpeg";
            selfie_img_obj?.classList.remove("loading-components-light");
            selfie_img_obj?.classList.add("loadedcomponents-light");
        });
        selfie_image.src = HomepageInterface.home_banner_imgs_url;
    }

    static remove_layout() {
        for(let url of this.css_urls) {
            ContentLoaderInterface.remove_app_customize_css(url);
        }
        ContentLoaderInterface.set_app_layout("");
    }
}