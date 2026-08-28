#!/usr/bin/env node
/**
 * Playwright screenshot tool for the prototype.
 *
 * Captures a DOM element as a real-pixel PNG, an SVG-wrapped exact raster,
 * and a Playwright ARIA snapshot as `<name>.txt` (live text, so agents that
 * cannot view images can still verify the captured UI). Requires a running
 * dev host (see AGENTS.md).
 *
 * Usage:
 *   node scripts/screenshot.mjs --name <file> --selector <css> [options]
 *
 * Options:
 *   --name <file>      Output filename (without extension), saved under --out
 *   --selector <css>   CSS selector of the element to capture
 *   --flow vn|none     "vn" (default): advance the VN dialogue until the
 *                      report screen appears; "none": capture as-is
 *   --act <action>     Action sequence after reaching the report screen
 *                      (repeatable, in order):
 *                        plan:<taskId>       plan a task (aria-label title match)
 *                        propose:<n>         open proposal dialog for PROPOSALS[n]
 *                        evidence:<n>        toggle Nth proposal evidence checkbox
 *                        confirm             confirm the proposal dialog
 *                        advance             click the advance-time control
 *                        open-attachment:<n> open Nth attachment button inside
 *                                            an open result viewer window
 *                        open-result:<n>     open Nth result row's 열기 control
 *                        open-rawlog:<n>     open Nth raw-log button
 *                        drag-window:<n>,<dx>,<dy>
 *                                            drag Nth floating window by its
 *                                            title bar and verify it moved
 *                        drag-results:<dy>   drag the horizontal results resizer
 *                                            by dy pixels and verify it moved
 *                        dialogue-all        advance VN dialogue until report or
 *                                            vn-to-report field-log transition
 *                        scroll:<selector>   scroll the element to its bottom
 *                        wait:<ms>           wait milliseconds
 *                        wait-for:<selector> wait until selector appears
 *                        wait-visible:<selector> poll until selector is visible
 *                                            (for short-lived overlays)
 *   --url <url>        App URL (default: http://localhost:5173/beyond-the-screen-prototype/)
 *   --out <dir>        Output directory (default: docs/screenshots)
 *   --viewport <w,h>   Browser viewport (default: 1440,900)
 *   --theme <mode>      Seed saved theme before app startup (light|dark)
 *   --palette <id>      Seed saved palette before app startup
 */
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CHROME_CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

// Task ids used by --plan map to the plan button's aria-label, which contains
// the task title (see src/content/tasks/).
const TASK_TITLES = {
  powerAnalysis: "주 발전 계통 상태 분석",
  refrigerationAnalysis: "냉장 설비 상태 분석",
  terminalLocationSearch: "현장 단말기 위치 조사",
  terminalSearch: "단말기 후보 구역 수색",
};

function parseArgs(argv) {
  const args = {
    acts: [],
    flow: "vn",
    url: "http://localhost:5173/beyond-the-screen-prototype/",
    out: "docs/screenshots",
    viewport: "1440,900",
  };
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === "--name") args.name = value;
    else if (key === "--selector") args.selector = value;
    else if (key === "--flow") args.flow = value;
    else if (key === "--plan" && value) {
      args.acts.push(`plan:${value}`);
      i++;
    }
    else if (key === "--act" && value) {
      args.acts.push(value);
      i++;
    }
    else if (key === "--url") args.url = value;
    else if (key === "--out") args.out = value;
    else if (key === "--viewport") args.viewport = value;
    else if (key === "--theme") args.theme = value;
    else if (key === "--palette") args.palette = value;
  }
  return args;
}

function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      // try next candidate
    }
  }
  throw new Error("Chrome/Chromium not found. Set CHROME_PATH to point at the executable.");
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntilVisible(page, selector, timeout = 20000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const visible = await page.evaluate(
      (sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      },
      selector,
    );
    if (visible) return;
    await sleep(80);
  }
  console.warn(`WARN: wait-visible timed out: ${selector}`);
}

async function clickNth(page, selector, index) {
  const clicked = await page.evaluate(
    ({ selector, index }) => {
      const nodes = document.querySelectorAll(selector);
      if (!nodes[index]) return false;
      nodes[index].click();
      return true;
    },
    { selector, index },
  );
  if (!clicked) console.warn(`WARN: no element at [${selector}][${index}]`);
  await sleep(400);
}

async function dragFloatingWindow(page, value) {
  const [index = 0, dx = 64, dy = 32] = String(value ?? "").split(",").map(Number);
  const windowLocator = page.locator(".floating-window").nth(index);
  const titleBar = windowLocator.locator(".floating-window-header");
  const before = await windowLocator.boundingBox();
  const handle = await titleBar.boundingBox();
  if (!before || !handle) throw new Error(`Floating window ${index} is not visible`);

  const startX = handle.x + Math.min(32, Math.max(8, handle.width / 4));
  const startY = handle.y + handle.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + dx, startY + dy, { steps: 8 });
  await page.mouse.up();
  await sleep(250);

  const after = await windowLocator.boundingBox();
  if (!after || Math.abs(after.x - before.x) < 1 || Math.abs(after.y - before.y) < 1) {
    throw new Error(`Floating window ${index} did not move from its title bar`);
  }
}

async function dragResultsSeparator(page, value) {
  const dy = Number(value ?? 80) || 80;
  const handle = page.locator(".workspace-resizer--horizontal");
  const resultsPane = page.locator(".results-pane");
  const handleBox = await handle.boundingBox();
  const before = await resultsPane.boundingBox();
  if (!handleBox || !before) throw new Error("Results resizer or results pane is not visible");

  const startX = handleBox.x + handleBox.width / 2;
  const startY = handleBox.y + handleBox.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, startY + dy, { steps: 8 });
  await page.mouse.up();
  await sleep(250);

  const after = await resultsPane.boundingBox();
  if (!after || Math.abs(after.height - before.height) < 1) {
    throw new Error(`Results pane height did not change after dragging by ${dy}px`);
  }
}

async function advanceToReport(page) {
  for (let i = 0; i < 60; i++) {
    const hasReport = await page.evaluate(() =>
      Boolean(document.querySelector(".planning-pane")),
    );
    if (hasReport) return true;
    const hasFieldLogTransition = await page.evaluate(() =>
      Boolean(document.querySelector(".presentation-vn-to-report-field-log")),
    );
    if (hasFieldLogTransition) return "field-log";
    await page.evaluate(() => {
      const shell = document.querySelector(".vn-shell");
      if (shell) shell.click();
    });
    await sleep(250);
  }
  return false;
}

async function runAct(page, act) {
  const [kind, value] = act.split(":");
  switch (kind) {
    case "plan":
      await clickNth(page, `button[aria-label*="${TASK_TITLES[value] ?? value}"]`, 0);
      return;
    case "propose":
      await clickNth(page, ".proposal-start-button", Number(value ?? 0));
      return;
    case "evidence":
      await clickNth(page, ".proposal-evidence-option input", Number(value ?? 0));
      return;
    case "confirm":
      await clickNth(page, ".proposal-confirm-button", 0);
      return;
    case "advance":
      await clickNth(page, ".advance-time-control", 0);
      return;
    case "open-attachment":
      await clickNth(page, ".result-viewer-evidence button", Number(value ?? 0));
      return;
    case "open-result":
      await clickNth(page, ".results-table tbody .results-open-button", Number(value ?? 0));
      return;
    case "open-rawlog":
      await clickNth(page, ".proposal-raw-log-button", Number(value ?? 0));
      return;
    case "drag-window":
      await dragFloatingWindow(page, value);
      return;
    case "drag-results":
      await dragResultsSeparator(page, value);
      return;
    case "dialogue-all":
      for (let i = 0; i < 60; i++) {
        const hasReport = await page.evaluate(() =>
          Boolean(document.querySelector(".planning-pane")),
        );
        if (hasReport) return;
        const hasFieldLogTransition = await page.evaluate(() =>
          Boolean(document.querySelector(".presentation-vn-to-report-field-log")),
        );
        if (hasFieldLogTransition) return;
        await page.evaluate(() => {
          const shell = document.querySelector(".vn-shell");
          if (shell) shell.click();
        });
        await sleep(250);
      }
      return;
    case "scroll":
      await page.evaluate((selector) => {
        const el = document.querySelector(selector);
        if (el) el.scrollTop = el.scrollHeight;
      }, value ?? ".document-scroll");
      await sleep(300);
      return;
    case "wait":
      await sleep(Number(value ?? 0));
      return;
    case "wait-for":
      try {
        await page.waitForSelector(value, { timeout: 8000 });
      } catch {
        console.warn(`WARN: wait-for selector never appeared: ${value}`);
      }
      return;
    case "wait-visible":
      await waitUntilVisible(page, value);
      return;
    default:
      console.warn(`WARN: unknown act "${act}"`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.name || !args.selector) {
    console.error(
      "Usage: node scripts/screenshot.mjs --name <file> --selector <css> [--flow vn|none] [--act <action> ...]",
    );
    process.exit(1);
  }

  const [width, height] = args.viewport.split(",").map(Number);

  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || findChrome(),
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });

  try {
    const page = await browser.newPage({ viewport: { width, height } });
    if (args.theme || args.palette) {
      await page.addInitScript(
        ({ theme, palette }) => {
          if (theme) localStorage.setItem("oasis.theme.mode", theme);
          if (palette) localStorage.setItem("oasis.theme.palette", palette);
        },
        { theme: args.theme, palette: args.palette },
      );
    }
    await page.goto(args.url, { waitUntil: "networkidle0" });
    await sleep(1200);

    if (args.flow === "vn") {
      const reached = await advanceToReport(page);
      if (reached !== true) {
        console.error("FAIL: report screen not reached after advancing dialogue");
        process.exit(1);
      }
    }

    for (const act of args.acts) {
      await runAct(page, act);
    }

    const locator = page.locator(args.selector).first();
    if ((await locator.count()) === 0) {
      console.error(`FAIL: no element matches selector "${args.selector}"`);
      process.exit(1);
    }

    const outDir = resolve(ROOT, args.out);
    await mkdir(outDir, { recursive: true });
    const pngPath = join(outDir, `${args.name}.png`);
    const svgPath = join(outDir, `${args.name}.svg`);
    const txtPath = join(outDir, `${args.name}.txt`);

    const bounds = await locator.boundingBox();
    if (!bounds) {
      console.error(`FAIL: selector "${args.selector}" has no visible bounds`);
      process.exit(1);
    }
    const png = await locator.screenshot({ animations: "disabled" });
    await writeFile(pngPath, png);
    const svgWidth = Math.max(1, Math.round(bounds.width));
    const svgHeight = Math.max(1, Math.round(bounds.height));
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">`,
      `<image width="${svgWidth}" height="${svgHeight}" href="data:image/png;base64,${png.toString("base64")}"/>`,
      "</svg>",
    ].join("");
    await writeFile(svgPath, svg, "utf8");
    const ariaSnapshot = await locator.ariaSnapshot();
    await writeFile(txtPath, ariaSnapshot, "utf8");

    console.log(`Saved ${pngPath}`);
    console.log(`Saved ${svgPath}`);
    console.log(`Saved ${txtPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
