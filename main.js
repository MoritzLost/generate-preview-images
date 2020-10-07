const path = require('path');
const fs = require('fs');
const fg = require('fast-glob');
const puppeteer = require('puppeteer');
const express = require('express');


const outputPathReplaceExtension = (baseDir, filePath, ext) => path.resolve(
    baseDir,
    `${filePath.replace(/\.[a-zA-Z0-9]+$/, `.${ext}`)}`
);

/**
 * Find all HTML (or other, see options) files in the specified directory and
 * take screenshots of them. Files are found based on the passed glob pattern.
 * The files are served by a static express server. Screenshots are taken with
 * Puppeteer using a headless Chromium instance. Use the options below to
 * configure how the screenshots are taken and stored.
 *
 * @param {String} dir      Base directory for the fast-glob pattern and the static express server.
 * @param {Object} options  Additional configuration to override the defaults. See below for possible options.
 * @param {String} options.globPattern                  Glob pattern used to find files to take screenshots of. Defaults to all .html/.html files in any subdirectory.
 * @param {Number} options.serverPort                   Port to use for the static express server. Default = 3000.
 * @param {Object} options.viewport                     Viewport options to pass to page.setViewport. Default is 1920x1080. @see https://pptr.dev/#?product=Puppeteer&version=v5.3.1&show=api-pagesetviewportviewport
 * @param {Object} options.screenshotOptions            Options to pass to pass to page.screenshot or elementHandle.setScreenshot. Default is a regular PNG screenshot. @see https://pptr.dev/#?product=Puppeteer&version=v5.3.1&show=api-pagescreenshotoptions
 * @param {String} options.screenshotElementSelector    You may take a screenshot of a specific node instead of the entire viewport by passing a selector for that element here. @see https://pptr.dev/#?product=Puppeteer&version=v5.3.1&show=api-pageselector
 * @param {String} options.pageWaitUntil                How long to wait before taking the screenshot. Defaults to network idle for 500ms. @see https://pptr.dev/#?product=Puppeteer&version=v5.3.1&show=api-pagegotourl-options
 * @param {Function} options.outputPath                 Callback that returns the output path for the screenshot. Defaults to replacing the existing extension with the appropriate image extension. Gets passed (1) path of the base directory (2) original filename relative to the base directory (3) extension of the generated screenshot. Return false to disable automatic file generation.
 * @param {Boolean} options.removeOriginalFiles         Remove the found files after taking the screenhot. WARNING: Destructive, use with
 * @returns {Promise} Promise resolving to array of objects describing the found files and generated screenshots.
 */
const generatePreviewImages = async (dir, options = {}) => {
    // merge options with defaults
    const finalOptions = Object.assign(
        {
            globPattern: '**/*.{html,htm}',
            serverPort: 3000,
            viewport: { width: 1920, height: 1080 },
            screenshotOptions: {
                type: 'png',
                fullPage: false,
            },
            screenshotElementSelector: false,
            pageWaitUntil: 'networkidle0',
            outputPath: outputPathReplaceExtension,
            removeOriginalFiles: false,
        },
        options
    );

    // use fast-glob to get a list of pages
    const pages = await fg(finalOptions.globPattern, {
        cwd: dir
    });

    // start a server to serve both the HTML files as well as any static files such as CSS
    const app = express();
    app.use(express.static(dir));
    const server = app.listen(finalOptions.serverPort);

    // start a headless browser instance to take screenshots
    const browser = await puppeteer.launch({
        headless: true,
    });

    // using map with an async callback allows the files to be processed in
    // parallel, which is useful because by default we wait for networkidle0
    // before taking the screenshot, which waits at least 500ms
    const screenshotPromises = pages.map(async file => {
        // create a browser page and set it's viewport to the specified dimensions
        const page = await browser.newPage();
        await page.setViewport(finalOptions.viewport);
        // navigate to the current page using the express server
        await page.goto(
            `http://localhost:${finalOptions.serverPort}/${file}`,
            { waitUntil: finalOptions.pageWaitUntil }
        );
        // the screenshot may include the entire page or just the specified element
        const screenshotBase = finalOptions.screenshotElementSelector
            ? await page.$(finalOptions.screenshotElementSelector)
            : page;
        // use callback to generate the output path for this screenshot
        // @TODO: allow outputpath to return false, cancelling this screenshot?
        const outputPath = finalOptions.outputPath(
            dir,
            file,
            finalOptions.screenshotOptions.type || 'png'
        );
        // create the directory recursively (if it doesn't exist already)
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        // take the screenshot using the specified options
        const buffer = await screenshotBase.screenshot({
            path: outputPath,
            ...finalOptions.screenshotOptions
        });
        // remove the original file if that option is active
        if (finalOptions.removeOriginalFiles) {
            fs.unlinkSync(path.resolve(dir, file));
        }
        return {
            original: file,
            output: outputPath,
            // @TODO: make buffer return conditional?
            screenshot: buffer,
        };
    })
    // wait until all promises have completed
    // @TODO: handle rejections gracefully? use allSettled?
    const results = await Promise.all(screenshotPromises);
    // shutdown the server and the browser
    server.close();
    await browser.close();
    // return the list of results
    return results;
}

// export main function
exports.generatePreviewImages = generatePreviewImages;
exports.default = generatePreviewImages;
// export utility methods
exports.outputPathReplaceExtension = outputPathReplaceExtension;
