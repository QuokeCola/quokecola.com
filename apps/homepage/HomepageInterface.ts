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
                this.goto_banner_page(this.current_banner_idx - 1, 'backward');
                setTimeout(() => this.start_banner_autoplay(), 10000);
            };
        }
        if (next_btn) {
            next_btn.onclick = () => {
                this.stop_banner_autoplay();
                this.goto_banner_page(this.current_banner_idx + 1, 'forward');
                setTimeout(() => this.start_banner_autoplay(), 10000);
            };
        }

        let dots_container = document.getElementById("home-banner-dots");
        if (dots_container) {
            this.banner_pages.forEach((_, i) => {
                let dot = document.createElement("span");
                dot.className = "home-banner-dot" + (i === 0 ? " home-banner-dot-active" : "");
                dot.onclick = () => {
                    const dir = i > this.current_banner_idx ? 'forward' : 'backward';
                    this.stop_banner_autoplay();
                    this.goto_banner_page(i, dir);
                    setTimeout(() => this.start_banner_autoplay(), 10000);
                };
                dots_container!.appendChild(dot);
            });
        }
    }

    static goto_banner_page(idx: number, direction: 'forward' | 'backward' | 'none' = 'forward') {
        this.current_banner_idx = ((idx % this.banner_pages.length) + this.banner_pages.length) % this.banner_pages.length;
        const page = this.banner_pages[this.current_banner_idx];

        let banner_subtitle = document.getElementById("home-banner-subtitle");
        let banner_title    = document.getElementById("home-banner-title");
        let banner_abstract = document.getElementById("home-banner-abstract");
        let banner_imgs     = document.getElementById("home-banner-imgs");
        let banner_button   = document.getElementById("home-banner-button");

        const text_els = [banner_subtitle, banner_title, banner_abstract].filter(Boolean) as HTMLElement[];
        text_els.forEach(el => el.classList.replace("loaded-components-light", "loading-components-light"));
        if (banner_subtitle) banner_subtitle.textContent = page.subtitle;
        if (banner_title)    banner_title.textContent    = page.title;
        if (banner_abstract) banner_abstract.textContent = page.abstract;

        if (banner_imgs) {
            this.slide_to_img(banner_imgs, page.img, direction, () => {
                text_els.forEach(el => el.classList.replace("loading-components-light", "loaded-components-light"));
            });
        }

        if (banner_button) {
            banner_button.onclick = page.onLearnMore;
        }

        document.querySelectorAll(".home-banner-dot").forEach((dot, i) => {
            dot.classList.toggle("home-banner-dot-active", i === this.current_banner_idx);
        });
    }

    static slide_to_img(container: HTMLElement, new_url: string, direction: 'forward' | 'backward' | 'none', onComplete: () => void) {
        const DURATION = 500;
        const old_slides = Array.from(container.querySelectorAll<HTMLElement>('.home-banner-slide'));

        const new_slide = document.createElement('div');
        new_slide.className = 'home-banner-slide';
        new_slide.style.backgroundImage = `url(${new_url})`;
        if (direction === 'none') {
            new_slide.style.opacity = '0';
        } else {
            new_slide.style.transform = direction === 'forward' ? 'translateX(100%)' : 'translateX(-100%)';
        }
        container.appendChild(new_slide);

        const image = new Image();
        image.onload = () => {
            container.classList.replace("loading-components-light", "loaded-components-light");
            new_slide.getBoundingClientRect(); // force reflow before animating

            const easing = `cubic-bezier(0.4, 0, 0.2, 1)`;
            if (direction === 'none') {
                new_slide.style.transition = `opacity ${DURATION}ms ${easing}`;
                new_slide.style.opacity = '1';
            } else {
                new_slide.style.transition = `transform ${DURATION}ms ${easing}`;
                new_slide.style.transform = 'translateX(0)';
                old_slides.forEach(s => {
                    s.style.transition = `transform ${DURATION}ms ${easing}`;
                    s.style.transform = direction === 'forward' ? 'translateX(-100%)' : 'translateX(100%)';
                });
            }

            onComplete();

            setTimeout(() => {
                old_slides.forEach(s => { if (s.parentNode === container) container.removeChild(s); });
            }, DURATION);
        };
        image.src = new_url;
    }

    static start_banner_autoplay() {
        this.stop_banner_autoplay();
        this.banner_timer = setInterval(() => {
            this.goto_banner_page(this.current_banner_idx + 1, 'forward');
        }, 5000);
    }

    static stop_banner_autoplay() {
        if (this.banner_timer !== null) {
            clearInterval(this.banner_timer);
            this.banner_timer = null;
        }
    }

    static reload_banner() {
        this.goto_banner_page(0, 'none');
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
