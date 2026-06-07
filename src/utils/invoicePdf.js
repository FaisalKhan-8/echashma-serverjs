const fs = require('fs');
const path = require('path');
const os = require('os');
const puppeteer = require('puppeteer');

/** @type {string | null | undefined} undefined = not resolved yet */
let cachedExecutablePath;

function fileExists(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function bundledExecutablePath() {
  try {
    return puppeteer.executablePath();
  } catch {
    return null;
  }
}

function getLinuxCandidates() {
  return [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    bundledExecutablePath(),
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
  ];
}

function getWindowsCandidates() {
  const localAppData = process.env.LOCALAPPDATA || '';
  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const programFilesX86 =
    process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

  return [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    bundledExecutablePath(),
    path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ];
}

function getDarwinCandidates() {
  return [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    bundledExecutablePath(),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ];
}

function getExecutableCandidates() {
  const platform = os.platform();
  let raw;
  if (platform === 'linux') {
    raw = getLinuxCandidates();
  } else if (platform === 'win32') {
    raw = getWindowsCandidates();
  } else if (platform === 'darwin') {
    raw = getDarwinCandidates();
  } else {
    raw = [process.env.PUPPETEER_EXECUTABLE_PATH, bundledExecutablePath()];
  }

  const seen = new Set();
  const candidates = [];
  for (const candidate of raw) {
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    if (fileExists(candidate)) {
      candidates.push(candidate);
    }
  }
  return candidates;
}

function getLaunchArgs() {
  const args = [
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--font-render-hinting=none',
  ];
  if (os.platform() === 'linux') {
    args.push('--no-sandbox', '--disable-setuid-sandbox');
  }
  return args;
}

async function tryLaunch(executablePath) {
  const options = {
    headless: true,
    args: getLaunchArgs(),
  };
  if (executablePath) {
    options.executablePath = executablePath;
  }
  return puppeteer.launch(options);
}

async function launchBrowser() {
  if (cachedExecutablePath !== undefined) {
    try {
      return await tryLaunch(cachedExecutablePath || undefined);
    } catch (error) {
      console.warn(
        `[invoicePdf] Cached Puppeteer path failed (${cachedExecutablePath || 'default'}): ${error.message}`
      );
      cachedExecutablePath = undefined;
    }
  }

  const candidates = getExecutableCandidates();
  const attempts = [...candidates, null];
  const errors = [];

  for (const executablePath of attempts) {
    const label = executablePath || 'puppeteer-default';
    try {
      const browser = await tryLaunch(executablePath || undefined);
      cachedExecutablePath = executablePath;
      console.log(`[invoicePdf] Puppeteer launched using: ${label}`);
      return browser;
    } catch (error) {
      errors.push(`${label}: ${error.message}`);
    }
  }

  throw new Error(
    `Failed to launch Puppeteer on ${os.platform()}. ${errors.join(' | ')}`
  );
}

async function setPageHtml(page, html) {
  try {
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 15_000,
    });
  } catch {
    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 15_000,
    });
  }
}

/**
 * Render invoice HTML to a PDF buffer (A4).
 */
async function generateInvoicePDF(html) {
  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await setPageHtml(page, html);
    const pdfUint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
    });
    return Buffer.from(pdfUint8Array);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = {
  generateInvoicePDF,
  launchBrowser,
  getExecutableCandidates,
};
