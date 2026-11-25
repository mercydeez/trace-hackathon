// Renders guide.html to submissions/TRACE-presenter-guide.pdf with headless Edge or Chrome.
// Usage: node submissions/presenter-guide/build.mjs [live-link]
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const link = process.argv[2] ?? "Added after deployment: ask Atharva";
const tmp = join(here, "_render.html");
writeFileSync(tmp, readFileSync(join(here, "guide.html"), "utf8").replace("{{LIVE_LINK}}", link));

const browsers = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
];
const browser = browsers.find(existsSync);
if (!browser) throw new Error("No Edge or Chrome found to print the PDF.");
const out = resolve(here, "..", "TRACE-presenter-guide.pdf");
try {
  execFileSync(browser, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", `--print-to-pdf=${out}`, pathToFileURL(tmp).href], { stdio: "ignore" });
} finally {
  rmSync(tmp, { force: true });
}
console.log(`Wrote ${out}`);
