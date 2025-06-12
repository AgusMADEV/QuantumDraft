const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    // No baseUrl, para usar archivos file:// en lugar de http://
    supportFile: false,
    specPattern: 'cypress/e2e/**/*.spec.js'
  }
});