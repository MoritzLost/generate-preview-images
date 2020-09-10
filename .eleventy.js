const generatePreviewImages = require('./generate-preview-images');

module.exports = function(eleventyConfig) {
    eleventyConfig.addFilter('generate-preview-images', generatePreviewImages);
};
