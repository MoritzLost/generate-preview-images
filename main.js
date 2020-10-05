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
            viewport: { width: 480, height: 360 },
            screenshotOptions: {
                type: 'png',
                fullPage: false,
            },
            screenshotElementSelector: false,
            pageWaitUntil: 'networkidle0',
            // ouputPath: (filePath, ext) => path.resolve(dir, `${filePath.replace('/', '___')}.${ext}`),
            outputPath: (baseDir, filePath, ext) => path.resolve(
                baseDir,
                `${filePath.replace(/\.[a-zA-Z]+$/, `.${ext}`)}`
            ),
            removeOriginalFiles: false,
        },
        options
    );
    const pages = await fg(finalOptions.globPattern, {
        cwd: dir
    });
    const browser = await puppeteer.launch({
        headless: true,
    });

    // start a server to serve the both the HTML files as well as any static files such as CSS
    const app = express();
    app.use(express.static(dir));
    const server = app.listen(finalOptions.serverPort);

    for (const file of pages) {
        // create a browser page and set it's viewport to the specified dimensions
        const page = await browser.newPage();
        await page.setViewport(finalOptions.viewport);
        // navigate to the current page
        await page.goto(
            `http://localhost:${finalOptions.serverPort}/${file}`,
            { waitUntil: finalOptions.pageWaitUntil }
        );
        const screenshotBase = finalOptions.screenshotElementSelector
            ? await page.$(finalOptions.screenshotElementSelector)
            : page;
        // use callback to generate the output path
        const outputPath = finalOptions.outputPath(
            dir,
            file,
            finalOptions.screenshotOptions.type || 'png'
        );
        // create the directory recursively (if it doesn't exist already)
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        // take a screenshot
        const buffer = await screenshotBase.screenshot({
            path: outputPath,
            ...finalOptions.screenshotOptions
        });
        if (finalOptions.removeOriginalFiles) {
            fs.unlinkSync(path.resolve(dir, file));
        }
    }
    server.close();
    await browser.close();
    // @TODO: return list of files or whatever?
}

exports.default = generatePreviewImages;
exports.generatePreviewImages = generatePreviewImages;
