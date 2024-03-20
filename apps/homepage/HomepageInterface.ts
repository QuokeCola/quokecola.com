import {ContentLoaderInterface} from "../../framework/ContentLoaderInterface.js";
export class HomepageInterface {
    static home_banner_imgs_url:string = "./apps/homepage/assets/images/banner_img.JPG"
    static home_selfie_img_url:string = "./apps/homepage/assets/images/selfie.jpeg"
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
            }
        }
    }

    static reload_banner() {
        let banner_subtitle = document.getElementById("home-banner-subtitle");
        let banner_title    = document.getElementById("home-banner-title");
        let banner_abstract = document.getElementById("home-banner-abstract");
        let banner_imgs     = document.getElementById("home-banner-imgs");
        if (banner_imgs && banner_subtitle && banner_title && banner_abstract) {
            this.load_img_with_children(banner_imgs, this.home_banner_imgs_url,
                [banner_subtitle,banner_title,banner_abstract,banner_imgs]);
        }
    }
    static reload_tiles_imgs() {
        let tiles= document.querySelectorAll(".home-quarter-size-tile")
        for (let idx = 0; idx < 3; idx++) {
            let img_obj = tiles.item(idx+1).querySelector("div")
            let title_obj = tiles.item(idx+1).querySelector("h1")
            let p_obj = tiles.item(idx+1).querySelector("p")
            if (img_obj&&title_obj&&p_obj)
                this.load_img_with_children(img_obj,HomepageInterface.works_images_url[idx],[img_obj,title_obj,p_obj])
        }
    }

    static reload_selfie_imgs() {
        // let selfie_img_obj:HTMLImageElement|null = document.querySelector(".home-half-size-tile > picture > img");
        let pic : HTMLElement|null = document.getElementById("home-selfie");
        let pic_wrapper : HTMLElement|null = document.getElementById("home-selfie-wrapper");
        if (pic && pic_wrapper)
            this.load_img_with_children(pic,HomepageInterface.home_selfie_img_url,[pic_wrapper]);
    }

    static load_img_with_children(img_obj:HTMLElement|HTMLImageElement, img_url:string, children:HTMLElement[],) {
        let wait_time = 10;
        let image = new Image();

        for (let element of children) {
            element.classList.replace("loaded-components-light", "loading-components-light")
        }

        setTimeout(()=> {
            image.addEventListener('load', function() {
                if (img_obj instanceof HTMLImageElement){
                    img_obj.src = img_url;
                } else {
                    img_obj.style.backgroundImage = 'url(' + img_url + ')';
                }
                for (let element of children) {
                    element.classList.replace("loading-components-light", "loaded-components-light")
                }
            });
            image.src = img_url;
        }, wait_time);
    }
}