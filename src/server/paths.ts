// @ts-nocheck
const path = require('path');
const ROOT_DIR = path.join(__dirname, '..');
const PAGES_DIR = path.join(ROOT_DIR, 'pages');
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');
const DATABASES_DIR = path.join(ASSETS_DIR, 'databases');
module.exports = { ROOT_DIR, PAGES_DIR, ASSETS_DIR, DATABASES_DIR };
