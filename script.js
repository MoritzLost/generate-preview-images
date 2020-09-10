const generatePreviewImage = require('./generate-preview-images');
const path = require('path');

generatePreviewImages(path.join(__dirname, 'dist'))
    .then(process.exit, process.exit);
