# Hello world!  

Nice to meet you! This is my first post of this blog. Thanks for visiting my website!
In the future I will post more interesting things about what I am doing on here.
If you are interested in the website and how I set up, please visit the <https://github.com/QuokeCola/quokecola.com>
to get access to the source code.

## Markdown Renderer
[marked.js](https://marked.js.org) and [highlight.js](https://highlightjs.org) was integrated in this website, while it 
provide perfect render effects, including code highlights.
Here are some examples.
### Python
```python
print("Hello world!")
```

### C++
```cpp
cout << "hello world";
class hello {
    static char[] world;
}
```

## CSS

Most animation of this website are pure css, which means it can be interrupted and provides seamless experience.
To load different pages, iframe was used.

## Implement

The project was built with pure Javascript and CSS, which means you almost don't need to configure any environment. Just clone,
copy to your source folder for nginx and the website should be deployed.

## Future work
As this is my first javascript project, some early modules were not well designed, make it hard to modify. In the future 
these modules (like navigation bar) might be refactored.