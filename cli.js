#!/usr/bin/env node

const { generatePreviewImages } = require('./main');
const path = require('path');

generatePreviewImages(path.join(__dirname, '../dist'), {
    globPattern: 'preview-images/**/*.{html,htm}'
}).then(console.log);
