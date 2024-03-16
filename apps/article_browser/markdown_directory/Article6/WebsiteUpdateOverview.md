# Website Update Overview

## Generate your website with json

Currently, you can generate your own website with .json file!

Here is my template for this website.
```json
{
  "title": "QuokeCola",
  "themeColor": "19,32,62",
  "complementaryColor" : "orangered",
  "subpages": [
    {
      "title": "HOME",
      "type": "introPage",
      "src": "/src/home/home.html"
    },
    {
      "title": "ARTICLES",
      "type": "contentPage",
      "src": "/comp/article_browser/article_browser.html"
    },
    {
      "title": "WEBSERVICE",
      "type": "introPage",
      "src": "/src/webSrv/webSrv.html"
    },
    {
      "title": "ABOUT",
      "type": "contentPage",
      "src": "/src/about/about.html"
    }
  ],
  "markdown_root": "/src/md/"
}
```
For `themeColor` option, please input the RGB value of your loved color.

## Templates

To create your own webpage, please use the CSS classes stored in `/comp/content_container/styles` to create your base template.
The base template will automatically adapt based on the aspect ratio of screen, generate different layouts. Please place your customized
CSS file in `<body>` tag. In the future I will add the supports for reading CSS added in `<head>`.

For `type`, currently `introPage` and `contentPage` are supported. Most of the `introPage` use the template in `layout-intro.css` with banner image
and chapters. `introPage` enables navigation bar's animation. `contentPage` will disable navigation bar's animation, and it will shrink on the top.

![Intro page](/apps/article_browser/markdown_directory/Article6/Screen%20Shot%202021-12-16%20at%201.55.21%20PM.png)
<center>A typical intro page</center>

![Intro page](/apps/article_browser/markdown_directory/Article6/Screen%20Shot%202021-12-16%20at%201.58.55%20PM.png)
<center>A typical content page</center>

You can look at my written html, like `/src/home/home.html` and `/src/about/about.html` for reference.

## Customize Javascript

If you have customized Javascript, you can add your code in `/content_container/scripts/script.js`, `handle_reload_CC_evt` function.
You can add your own events in it to wake up your own code when your page is loaded. Currently, it requires a lot of work to add your scripts,
but I will try to update the mechanism to make it simpler.