# Generate preview images

This is a utility package that allows you to find HTML files in a directory and programmatically take screenshots of them. This is intended mainly for static site generators to generate preview images for social media. Files are served using a static express server, the screenshots are taken through a headless Chrome instance using Puppeteer.

**WARNING: Work in Progress.** This is an unstable alpha release. Not all options are implemented yet.

## Installation

@TODO

## Script usage

```js
// run this AFTER the build step of your static site generator
const path = require('path');
const { generatePreviewImages } = require('/path/to/generate-preview-images/main');

generatePreviewImages(
    // absolute path to your build target directory
    path.resolve(__dirname, '../dist/'),
    // object with options
    {
        // glob pattern to find files to take screenshots of
        globPattern: '**/*.{html,htm}',
        // ...
    }
)
.then(() => process.exit(0))
.catch(e => {
    console.log(e);
    process.exit(1);
});
```

@TODO

## CLI usage

Not implemented yet.

## Usage examples

@TODO
