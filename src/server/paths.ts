// @ts-nocheck
const os = require('os');
const path = require('path');
const ROOT_DIR = path.join(__dirname, '..');
const PAGES_DIR = path.join(ROOT_DIR, 'pages');
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');
// keep outside the nginx web root (/vodalus) so try_files cannot serve them
const DATABASES_DIR = process.env.VODALUS_DATABASES_DIR || path.join(os.homedir(), 'vodalus-data');
module.exports = { ROOT_DIR, PAGES_DIR, ASSETS_DIR, DATABASES_DIR };
