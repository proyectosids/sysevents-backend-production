"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.templateScreenshotRelativePath = templateScreenshotRelativePath;
exports.ensureTemplateScreenshot = ensureTemplateScreenshot;
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const promises_1 = __importDefault(require("fs/promises"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
function findChromeExecutable() {
    const candidates = [
        process.env.CHROME_PATH,
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path_1.default.join(os_1.default.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe'),
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
    ].filter(Boolean);
    return candidates.find((candidate) => {
        try {
            return (0, fs_1.existsSync)(candidate);
        }
        catch {
            return false;
        }
    }) ?? null;
}
function screenshotFileName(sourceFile) {
    return sourceFile
        .replace(/\\/g, '/')
        .replace(/[^a-z0-9._-]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/\.html?$/i, '')
        .slice(0, 120) || 'index';
}
function templateScreenshotRelativePath(sourceFile) {
    return `__sysevents_preview__/${screenshotFileName(sourceFile)}.png`;
}
async function ensureTemplateScreenshot(input) {
    const chromePath = findChromeExecutable();
    if (!chromePath)
        return null;
    const htmlPath = path_1.default.resolve(input.rootPath, input.sourceFile);
    const relativeScreenshotPath = templateScreenshotRelativePath(input.sourceFile);
    const outputPath = path_1.default.resolve(input.rootPath, relativeScreenshotPath);
    if (!input.force) {
        try {
            await promises_1.default.access(outputPath);
            return relativeScreenshotPath;
        }
        catch {
            // Generate below.
        }
    }
    await promises_1.default.mkdir(path_1.default.dirname(outputPath), { recursive: true });
    await new Promise((resolve, reject) => {
        const child = (0, child_process_1.spawn)(chromePath, [
            '--headless=new',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--hide-scrollbars',
            '--no-sandbox',
            '--allow-file-access-from-files',
            '--window-size=1440,900',
            '--virtual-time-budget=7000',
            `--screenshot=${outputPath}`,
            (0, url_1.pathToFileURL)(htmlPath).toString(),
        ], {
            windowsHide: true,
            stdio: 'ignore',
        });
        const timeout = setTimeout(() => {
            child.kill();
            reject(new Error('Template screenshot timed out'));
        }, 20000);
        child.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
        child.on('exit', (code) => {
            clearTimeout(timeout);
            if (code === 0) {
                resolve();
                return;
            }
            reject(new Error(`Template screenshot failed with exit code ${code}`));
        });
    });
    return relativeScreenshotPath;
}
//# sourceMappingURL=template-preview.service.js.map