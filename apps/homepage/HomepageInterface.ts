import {ContentLoaderInterface} from "../../framework/ContentLoaderInterface";
import {AppRequests} from "../../framework/AppRequests";
import {ArticleBrowserAppData, ArticleBrowserArticleData} from "../article_browser/ArticleBrowserData";
import RequestType = ArticleBrowserAppData.RequestType;

interface BannerPage {
    img: string;
    subtitle: string;
    title: string;
    abstract: string;
    onLearnMore: () => void;
}

export class HomepageInterface {
    static banner_pages: BannerPage[] = [
        {
            img: "./apps/homepage/assets/images/banner_img.JPG",
            subtitle: "Project",
            title: "Haptic Device",
            abstract: "Wearable Haptic Device for Shape and Weight Rendering.",
            onLearnMore: () => {
                let request = new AppRequests();
                let document_data: ArticleBrowserArticleData = {
                    abstract: "Loft to death QwQ",
                    pic: "Article10/mech_render.jpeg",
                    src: "Article10/SeniorDesign.md",
                    tags: ["Mechanical Design", "Electrical Design", "ChibiOS", "STM32"],
                    time: "08-12-2022 14:30",
                    title: "Haptic Device II"
                };
                let app_data: ArticleBrowserAppData = {
                    article_data: document_data,
                    page_index: null,
                    request_type: RequestType.load_article,
                    selected_tags: null
                };
                request.app_name = "BLOG";
                request.app_data = app_data;
                window.postMessage(request);
            }
        },
        {
            img: "./apps/homepage/assets/images/project_therm_calc_tile_pic.png",
            subtitle: "iOS App",
            title: "Thermal Calculator",
            abstract: "A iOS application for calculating substance properties.",
            onLearnMore: () => { window.open('https://github.com/QuokeCola/ThermoCalculator', '_blank', 'noopener,noreferrer'); }
        },
        {
            img: "./apps/homepage/assets/images/project_terminal_tile_pic.png",
            subtitle: "Software",
            title: "Meta Terminal 2",
            abstract: "Adjust vehicle PID parameters through a visualized terminal.",
            onLearnMore: () => { window.open('https://github.com/QuokeCola/MetaTerminal', '_blank', 'noopener,noreferrer'); }
        }
    ];

    static current_banner_idx: number = 0;
    static banner_timer: ReturnType<typeof setInterval> | null = null;

    static home_selfie_img_url: string = "./apps/homepage/assets/images/selfie.jpeg"
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

    static async create_layout() {
        for (let url of this.css_urls) {
            ContentLoaderInterface.set_app_customize_css(url);
        }
        const response = await fetch(this.html_url);
        const parser = new DOMParser()
        let html_doc = parser.parseFromString(await response.text(), 'text/html');
        ContentLoaderInterface.set_app_layout(html_doc.body.children[0].innerHTML)

        let prev_btn = document.getElementById("home-banner-prev");
        let next_btn = document.getElementById("home-banner-next");
        if (prev_btn) {
            prev_btn.onclick = () => {
                this.stop_banner_autoplay();
                this.goto_banner_page(this.current_banner_idx - 1);
                setTimeout(() => this.start_banner_autoplay(), 10000);
            };
        }
        if (next_btn) {
            next_btn.onclick = () => {
                this.stop_banner_autoplay();
                this.goto_banner_page(this.current_banner_idx + 1);
                setTimeout(() => this.start_banner_autoplay(), 10000);
            };
        }

        let dots_container = document.getElementById("home-banner-dots");
        if (dots_container) {
            this.banner_pages.forEach((_, i) => {
                let dot = document.createElement("span");
                dot.className = "home-banner-dot" + (i === 0 ? " home-banner-dot-active" : "");
                dot.onclick = () => {
                    this.stop_banner_autoplay();
                    this.goto_banner_page(i);
                    setTimeout(() => this.start_banner_autoplay(), 10000);
                };
                dots_container!.appendChild(dot);
            });
        }
    }

    static goto_banner_page(idx: number) {
        this.current_banner_idx = ((idx % this.banner_pages.length) + this.banner_pages.length) % this.banner_pages.length;
        const page = this.banner_pages[this.current_banner_idx];

        let banner_subtitle = document.getElementById("home-banner-subtitle");
        let banner_title    = document.getElementById("home-banner-title");
        let banner_abstract = document.getElementById("home-banner-abstract");
        let banner_imgs     = document.getElementById("home-banner-imgs");
        let banner_button   = document.getElementById("home-banner-button");

        if (banner_imgs && banner_subtitle && banner_title && banner_abstract) {
            banner_subtitle.textContent = page.subtitle;
            banner_title.textContent = page.title;
            banner_abstract.textContent = page.abstract;
            this.load_img_with_children(banner_imgs, page.img,
                [banner_subtitle, banner_title, banner_abstract, banner_imgs]);
        }

        if (banner_button) {
            banner_button.onclick = page.onLearnMore;
        }

        document.querySelectorAll(".home-banner-dot").forEach((dot, i) => {
            dot.classList.toggle("home-banner-dot-active", i === this.current_banner_idx);
        });
    }

    static start_banner_autoplay() {
        this.stop_banner_autoplay();
        this.banner_timer = setInterval(() => {
            this.goto_banner_page(this.current_banner_idx + 1);
        }, 5000);
    }

    static stop_banner_autoplay() {
        if (this.banner_timer !== null) {
            clearInterval(this.banner_timer);
            this.banner_timer = null;
        }
    }

    static reload_banner() {
        this.goto_banner_page(0);
        this.start_banner_autoplay();
    }

    static reload_tiles_imgs() {
        let tiles = document.querySelectorAll(".home-quarter-size-tile")
        for (let idx = 0; idx < 3; idx++) {
            let img_obj   = tiles.item(idx + 1).querySelector("div")
            let title_obj = tiles.item(idx + 1).querySelector("h1")
            let p_obj     = tiles.item(idx + 1).querySelector("p")
            if (img_obj && title_obj && p_obj)
                this.load_img_with_children(img_obj, HomepageInterface.works_images_url[idx], [img_obj, title_obj, p_obj])
        }
    }

    static reload_selfie_imgs() {
        let pic: HTMLElement | null         = document.getElementById("home-selfie");
        let pic_wrapper: HTMLElement | null = document.getElementById("home-selfie-wrapper");
        if (pic && pic_wrapper)
            this.load_img_with_children(pic, HomepageInterface.home_selfie_img_url, [pic_wrapper]);
    }

    static load_img_with_children(img_obj: HTMLElement | HTMLImageElement, img_url: string, children: HTMLElement[]) {
        let wait_time = 10;
        let image = new Image();

        for (let element of children) {
            element.classList.replace("loaded-components-light", "loading-components-light")
        }

        setTimeout(() => {
            image.addEventListener('load', function () {
                if (img_obj instanceof HTMLImageElement) {
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
