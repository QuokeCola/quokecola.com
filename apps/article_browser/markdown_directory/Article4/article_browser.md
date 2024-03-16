# ArticleBrowser

This is the integrated article browser for this website. [quokecola.com](https://www.quokecola.com)
The project sourcecode is stored on [GitHub](https://github.com/QuokeCola/ArticleBrowser).

To add your articles, please revise the `psglists.json`

Format for psglists.json is simple.

Markdown Rendering and Code Highlighting are based on [markedjs](https://marked.js.org) and [highlightjs](https://highlightjs.org), but slightly revised the code for better visual style and for iFrame hyperlink jump.

```json
[
  {
    "title": "3D printer extruder",
    "pic": "/src/md/Psg2/Remove3.jpg",
    "time": "12-11-2021 8:00",
    "src": "/src/md/Psg2/Extruder.md",
    "class": [
      "3D printer",
      "Mechanical Design"
    ]
  },
  {
    "title": "Hello, World!",
    "pic": "/src/Psg1/title_pic.jpeg",
    "time": "12-09-2021 14:34",
    "src": "/src/Psg1/HelloWorld.md",
    "class": [
      "website",
      "javascript"
    ]
  }
]
```
Each each struct have the properties including `title`, `pic`, `time`, `src`, `class`.

`title` will change the title showed on blocks

`pic` is for the picture showed on blocks. When the article is loaded, it will also showed on the background blurry.

`time` can be the published time of your article. The latter versions may take the support of arrange by time.

`src` The path to your markdown file.

`class` would be the tags for sorting, it will showed on sidebar for search.

The source code was a little messy, but


![If it works, it works](/apps/article_browser/markdown_directory/Article4/If%20it%20works,%20it%20works.jpg "If it works, it works")

<center>Don't worry, I will tide them up one day :D</center>