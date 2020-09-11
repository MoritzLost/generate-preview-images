const path = require('path');
const fg = require('fast-glob');
const puppeteer = require('puppeteer');
const express = require('express');

const generatePreviewImages = async (dir, options = {}) => {
    const finalOptions = Object.assign(
        {
            globPattern: '**/*.{html.html}'
        },
        options
    );

    const pages = await fg(finalOptions.globPattern, {
        cwd: dir
    });
    const browser = await puppeteer.launch({
        headless: true,
    });

    // https://github.com/puppeteer/puppeteer/issues/1643#issuecomment-353387148
    const app = express();
    app.use(express.static(dir));
    const server = app.listen(3000);

    for (const file of pages) {
        console.log(file);
        const page = await browser.newPage();
        await page.setViewport({ width: 480, height: 360 });
        await page.goto(`http://localhost:3000/${file}`);
        const buffer = await page.screenshot({path: `images/${file.replace('/', '___')}.png`});
        console.log(buffer);
    }
    server.close();
}

exports.default = generatePreviewImages;
exports.generatePreviewImages = generatePreviewImages;
