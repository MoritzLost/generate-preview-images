#!/usr/bin/env node

// NODE: CLI options not implemented yet

const { generatePreviewImages } = require('./main');

generatePreviewImages(process.cwd(), {})
    .then(() => {
        process.exit(0);
    })
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
