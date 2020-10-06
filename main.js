const path = require('path');
const fs = require('fs');
const fg = require('fast-glob');
const puppeteer = require('puppeteer');
const express = require('express');

const generatePreviewImages = async (dir, options = {}) => {
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
            // ouputPath: (filePath, ext) => path.resolve(dir, `${filePath.replace('/', '___')}.${ext}`),
            // @TODO: export the default function from the module
            outputPath: (baseDir, filePath, ext) => path.resolve(
                baseDir,
                `${filePath.replace(/\.[a-zA-Z]+$/, `.${ext}`)}`
            ),
            removeOriginalFiles: false,
        },
        options
    );

    // use fast-glob to get a list of pages
    const pages = await fg(finalOptions.globPattern, {
        cwd: dir
    });

    // start a server to serve the both the HTML files as well as any static files such as CSS
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
        // @TODO: return list of files, object with original and output file, buffer or whatever?
        return file;
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

exports.default = generatePreviewImages;
exports.generatePreviewImages = generatePreviewImages;
