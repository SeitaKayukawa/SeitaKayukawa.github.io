import { existsSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const siteRoot = path.resolve(repositoryRoot, process.argv[2] || "_site");
const errors = [];
const configSource = await readFile(path.join(repositoryRoot, "_config.yml"), "utf8");
const siteUrlMatch = configSource.match(/^url:\s*["']?([^\s"']+)["']?\s*$/m);
const siteOrigin = siteUrlMatch ? new URL(siteUrlMatch[1]).origin : null;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolutePath));
    if (entry.isFile()) files.push(absolutePath);
  }
  return files;
}

function report(file, message) {
  errors.push(`${path.relative(repositoryRoot, file)}: ${message}`);
}

function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

function plainText(html) {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function decodePath(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function resolveLocalReference(sourceFile, reference) {
  const [pathAndQuery, fragment = ""] = reference.split("#", 2);
  const pathname = decodePath(pathAndQuery.split("?", 1)[0]);
  let target = pathname.startsWith("/")
    ? path.join(siteRoot, pathname.slice(1))
    : path.resolve(path.dirname(sourceFile), pathname || path.basename(sourceFile));

  if (existsSync(target) && (await stat(target)).isDirectory()) target = path.join(target, "index.html");
  return { target, fragment: decodePath(fragment) };
}

const htmlFiles = (await walk(siteRoot)).filter((file) => file.endsWith(".html"));
const idCache = new Map();

async function idsFor(file) {
  if (idCache.has(file)) return idCache.get(file);
  const html = await readFile(file, "utf8");
  const ids = new Set([
    ...[...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]),
    ...[...html.matchAll(/<a\b[^>]*\bname\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]),
  ]);
  idCache.set(file, ids);
  return ids;
}

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const activeHtml = stripComments(html);

  if (/\{[{%]/.test(activeHtml)) report(file, "contains an unresolved Liquid expression");
  if (!/<html\b[^>]*\blang=["'][a-z]{2}(?:-[A-Za-z0-9-]+)?["']/i.test(activeHtml)) {
    report(file, "is missing a valid html lang attribute");
  }
  if (/target=["']_blanck["']/i.test(activeHtml)) report(file, "contains target=\"_blanck\"");

  const ids = [...activeHtml.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  for (const id of duplicateIds) report(file, `contains duplicate id #${id}`);

  for (const match of activeHtml.matchAll(/<iframe\b([^>]*)>/gi)) {
    if (!/\btitle\s*=\s*["'][^"']+["']/i.test(match[1])) report(file, "contains an iframe without a title");
  }

  for (const match of activeHtml.matchAll(/<img\b([^>]*)>/gi)) {
    if (!/\balt\s*=\s*["'][^"']*["']/i.test(match[1])) report(file, "contains an image without an alt attribute");
  }

  for (const match of activeHtml.matchAll(/\b(?:href|src|poster)\s*=\s*(["'])(.*?)\1/gi)) {
    const reference = match[2].trim();
    if (!reference || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(reference)) continue;

    const { target, fragment } = await resolveLocalReference(file, reference);
    if (!existsSync(target)) {
      report(file, `missing local reference ${reference}`);
      continue;
    }
    if (fragment && target.endsWith(".html") && !(await idsFor(target)).has(fragment)) {
      report(file, `missing fragment #${fragment} in ${path.relative(siteRoot, target)}`);
    }
  }

  for (const match of activeHtml.matchAll(/\bstyle\s*=\s*(["'])(.*?)\1/gi)) {
    for (const urlMatch of match[2].matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/gi)) {
      const reference = urlMatch[2].trim();
      if (!reference || /^(?:data:|#|[a-z][a-z0-9+.-]*:|\/\/)/i.test(reference)) continue;
      const { target } = await resolveLocalReference(file, reference);
      if (!existsSync(target)) report(file, `missing inline background ${reference}`);
    }
  }

  for (const match of activeHtml.matchAll(/<meta\b([^>]*)>/gi)) {
    const property = match[1].match(/\bproperty\s*=\s*["']([^"']+)["']/i)?.[1];
    const content = match[1].match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1];
    if (property !== "og:image" || !content || !siteOrigin) continue;
    const imageUrl = new URL(content, siteOrigin);
    if (imageUrl.origin === siteOrigin) {
      const target = path.join(siteRoot, decodePath(imageUrl.pathname).replace(/^\//, ""));
      if (!existsSync(target)) report(file, `missing Open Graph image ${content}`);
    }
  }

  for (const match of activeHtml.matchAll(/<a\b([^>]*\btarget=["']_blank["'][^>]*)>/gi)) {
    if (!/\brel=["'][^"']*\bnoopener\b[^"']*["']/i.test(match[1])) {
      report(file, "contains target=\"_blank\" without rel=\"noopener\"");
    }
  }
}

const projects = JSON.parse(await readFile(path.join(repositoryRoot, "_data/projects.json"), "utf8"));
const publications = JSON.parse(await readFile(path.join(repositoryRoot, "_data/publications.json"), "utf8"));
const resourceTypes = JSON.parse(await readFile(path.join(repositoryRoot, "_data/resource_types.json"), "utf8"));
const seenIds = new Set();
const allowedPublicationGroups = ["full", "selected", "other_international", "other_domestic"];

for (const group of allowedPublicationGroups) {
  if (!Array.isArray(publications[group])) report(path.join(repositoryRoot, "_data/publications.json"), `missing publication group ${group}`);
}
for (const group of Object.keys(publications)) {
  if (!allowedPublicationGroups.includes(group)) report(path.join(repositoryRoot, "_data/publications.json"), `unknown publication group ${group}`);
}

const publicationEntries = Object.values(publications).filter(Array.isArray).flat();
const publicationById = new Map(publicationEntries.map((publication) => [publication.id, publication]));

for (const project of projects) {
  for (const key of ["id", "publication_id", "url", "thumbnail", "venue_label"]) {
    if (!project[key]) report(path.join(repositoryRoot, "_data/projects.json"), `${project.id || "project"} is missing ${key}`);
  }
  if (seenIds.has(project.id)) report(path.join(repositoryRoot, "_data/projects.json"), `duplicate id ${project.id}`);
  seenIds.add(project.id);
  if (project.thumbnail?.startsWith("/") && !existsSync(path.join(repositoryRoot, project.thumbnail.slice(1)))) {
    report(path.join(repositoryRoot, "_data/projects.json"), `${project.id} has a missing thumbnail ${project.thumbnail}`);
  }
  if (project.publication_id && !publicationById.has(project.publication_id)) {
    report(path.join(repositoryRoot, "_data/projects.json"), `${project.id} references unknown publication ${project.publication_id}`);
  }
  if (typeof project.image_opacity !== "number" || project.image_opacity < 0 || project.image_opacity > 1) {
    report(path.join(repositoryRoot, "_data/projects.json"), `${project.id} has invalid image_opacity`);
  }
}

for (const [group, entries] of Object.entries(publications)) {
  if (!Array.isArray(entries)) {
    report(path.join(repositoryRoot, "_data/publications.json"), `${group} is not an array`);
    continue;
  }
  for (const publication of entries) {
    if (!publication.id || !publication.title || !publication.authors || !publication.year || !publication.venue || !publication.citation_html || !Array.isArray(publication.resources)) {
      report(path.join(repositoryRoot, "_data/publications.json"), `${publication.id || group} is incomplete`);
    }
    if (seenIds.has(publication.id)) report(path.join(repositoryRoot, "_data/publications.json"), `duplicate id ${publication.id}`);
    seenIds.add(publication.id);
    if (!["en", "ja"].includes(publication.language)) {
      report(path.join(repositoryRoot, "_data/publications.json"), `${publication.id} has unsupported language ${publication.language}`);
    }
    const renderedCitation = plainText(publication.citation_html || "");
    for (const key of ["authors", "title", "year", "venue"]) {
      if (publication[key] && !renderedCitation.includes(plainText(String(publication[key])))) {
        report(path.join(repositoryRoot, "_data/publications.json"), `${publication.id} has ${key} that differs from citation_html`);
      }
    }
    for (const resource of publication.resources) {
      if (!resource.label) {
        report(path.join(repositoryRoot, "_data/publications.json"), `${publication.id} has a resource without a label`);
      } else if (!resourceTypes[resource.kind]) {
        report(path.join(repositoryRoot, "_data/publications.json"), `${publication.id} uses unknown resource type ${resource.kind}`);
      }
    }
  }
}

if (errors.length) {
  console.error(`Site validation failed with ${errors.length} error(s):\n`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${htmlFiles.length} HTML files, ${projects.length} projects, and ${publicationEntries.length} publications.`);
}
