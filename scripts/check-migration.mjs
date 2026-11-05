import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(process.argv[2] || "_site");
const config = await readFile(new URL("../_config.yml", import.meta.url), "utf8");
const legacy = process.argv.includes("--legacy") || /^legacy_redirect: true$/m.test(config);
const origin = "https://seitakayukawa.github.io";
function decodeEntities(value) {
  return value?.replace(/&(?:apos|quot|lt|gt|amp|#39);/g, (entity) => ({ "&apos;": "'", "&#39;": "'", "&quot;": '"', "&lt;": "<", "&gt;": ">", "&amp;": "&" })[entity]);
}
if (process.env.GITHUB_REPOSITORY?.toLowerCase() === "seitakayukawa/seitakayukawa.github.io") {
  assert(!legacy, "The canonical repository must never enable legacy_redirect");
}

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(file));
    else files.push(file);
  }
  return files;
}

const files = await walk(root);
let htmlCount = 0;
let redirectCases = 0;
for (const file of files.filter((f) => f.endsWith(".html"))) {
  const html = await readFile(file, "utf8");
  const pathname = "/" + path.relative(root, file).split(path.sep).join("/");
  const canonicalPath = pathname.replace(/index\.html$/, "");
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  assert.equal(canonical, origin + canonicalPath, `${pathname}: canonical`);
  const og = html.match(/<meta property="og:url" content="([^"]+)"/)?.[1];
  if (og) assert.equal(og, canonical, `${pathname}: og:url`);
  for (const match of html.matchAll(/\b(?:href|src|content)="([^"]*)"/g)) {
    assert(!/^https?:\/\/wotipati\.github\.io(?:[/?#]|$)/i.test(match[1]), `${pathname}: old-domain URL ${match[1]}`);
  }
  const script = html.match(/<script id="legacy-site-redirect">([\s\S]*?)<\/script>/)?.[1];
  if (!legacy) {
    assert.equal(script, undefined, `${pathname}: new site must not redirect`);
    assert(!/http-equiv="refresh"/i.test(html), `${pathname}: unexpected refresh`);
  } else {
    assert(script, `${pathname}: missing redirect`);
    const variants = [pathname];
    if (pathname.endsWith("index.html")) variants.push(canonicalPath);
    if (pathname === "/404.html") variants.push("/unknown/deep/path.html", "/%E6%97%A5%E6%9C%AC%E8%AA%9E.html", "//example.org/path");
    for (const testPath of variants) {
      for (const suffix of ["", "?q=a%20b&return=https%3A%2F%2Fexample.org#main-content", "?x=1&x=2#%E6%97%A5%E6%9C%AC%E8%AA%9E"]) {
        const url = new URL("https://wotipati.github.io" + testPath + suffix);
        const replaced = [];
        const location = { hostname: url.hostname, pathname: url.pathname, search: url.search, hash: url.hash, replace: (target) => replaced.push(target) };
        vm.runInNewContext(script, { window: { location } }, { timeout: 1000 });
        assert.deepEqual(replaced, [origin + url.pathname + url.search + url.hash], `${pathname}: path/query/fragment`);
        assert.equal(new URL(replaced[0]).origin, origin);
        for (const hostname of ["seitakayukawa.github.io", "localhost", "example.org"]) {
          replaced.length = 0;
          vm.runInNewContext(script, { window: { location: { ...location, hostname } } }, { timeout: 1000 });
          assert.equal(replaced.length, 0, `${pathname}: no loop or redirect on ${hostname}`);
        }
        redirectCases++;
      }
    }
    const refresh = decodeEntities(html.match(/<noscript><meta http-equiv="refresh" content="0; url=([^"]+)"><\/noscript>/)?.[1]);
    if (pathname === "/404.html") assert.equal(refresh, undefined, "Unknown paths need JavaScript, not a homepage redirect");
    else {
      assert.equal(refresh, canonical, `${pathname}: no-JS destination`);
      assert(decodeEntities(html).includes(`href="${canonical}">its new address</a>`), `${pathname}: manual fallback`);
    }
  }
  htmlCount++;
}
const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
for (const match of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)) {
  const url = decodeEntities(match[1]);
  assert(url.startsWith(origin + "/"), `sitemap URL: ${url}`);
  let file = path.join(root, decodeURIComponent(new URL(url).pathname));
  if (new URL(url).pathname.endsWith("/")) file = path.join(file, "index.html");
  assert(files.includes(file), `sitemap missing target: ${match[1]}`);
}
assert(!sitemap.includes("/404.html"), "404 must not appear in sitemap");
const robots = await readFile(path.join(root, "robots.txt"), "utf8");
assert.equal(robots.trim(), `Sitemap: ${origin}/sitemap.xml`, "robots.txt must advertise the canonical sitemap");
console.log(`Validated migration metadata for ${htmlCount} HTML files (${legacy ? `legacy, ${redirectCases} redirect cases and loop guards` : "new site, no redirects"}).`);
