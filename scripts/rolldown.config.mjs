import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(process.cwd());
const OUTPUT_MANIFEST = resolve(ROOT, ".cache/ts-iife-outputs.txt");
const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".github",
  ".cache",
  "node_modules",
  "dist",
  "build",
  "coverage",
]);

function walk(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".well-known") continue;

    const absolute = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) files.push(...walk(absolute));
      continue;
    }

    if (
      entry.isFile() &&
      entry.name.endsWith(".ts") &&
      !entry.name.endsWith(".d.ts") &&
      !entry.name.endsWith(".config.ts") &&
      !entry.name.endsWith(".test.ts") &&
      !entry.name.endsWith(".spec.ts")
    ) {
      files.push(absolute);
    }
  }

  return files;
}

function readDirective(source, name) {
  const match = source.match(new RegExp(`^\\s*//\\s*@${name}\\s+([^\\r\\n]+)`, "mi"));
  return match?.[1]?.trim() || null;
}

function toPascalCase(value) {
  const converted = value
    .replace(/\.user$/i, "")
    .split(/[^A-Za-z0-9_$]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  return converted || "Tool";
}

function validateGlobalName(value, file) {
  if (!/^[A-Za-z_$][\w$]*$/.test(value)) {
    throw new Error(`Invalid @global name "${value}" in ${relative(ROOT, file)}`);
  }

  return value;
}

function makeEntry({ sourceFile, globalName }) {
  const sourceUrl = pathToFileURL(sourceFile).href;
  const virtualId = `\0rod-iife-entry:${sourceFile}`;

  return {
    name: `rod-iife-entry:${relative(ROOT, sourceFile)}`,
    resolveId(id) {
      if (id === virtualId) return id;
      return null;
    },
    load(id) {
      if (id !== virtualId) return null;

      return `
import * as __module from ${JSON.stringify(sourceUrl)};

const __keys = Object.keys(__module);
const __hasExports = __keys.length > 0;
const __existing = globalThis[${JSON.stringify(globalName)}];
const __value = Object.prototype.hasOwnProperty.call(__module, "default")
  ? __module.default
  : Object.prototype.hasOwnProperty.call(__module, ${JSON.stringify(globalName)})
    ? __module[${JSON.stringify(globalName)}]
    : __hasExports
      ? __module
      : __existing;

if (__value !== undefined) {
  globalThis[${JSON.stringify(globalName)}] = __value;
  if (typeof window !== "undefined") window[${JSON.stringify(globalName)}] = __value;
}

export default __value;
`;
    },
    virtualId,
  };
}

const sourceFiles = walk(ROOT).sort();
const outputs = [];
const configs = sourceFiles.map(sourceFile => {
  const source = readFileSync(sourceFile, "utf8");
  const stem = basename(sourceFile, extname(sourceFile));
  const globalName = validateGlobalName(readDirective(source, "global") || toPascalCase(stem), sourceFile);
  const outputDirective = readDirective(source, "outfile");
  const outputFile = outputDirective
    ? resolve(dirname(sourceFile), outputDirective)
    : resolve(dirname(sourceFile), `${stem}.js`);

  if (!outputFile.startsWith(`${ROOT}/`)) {
    throw new Error(`@outfile must stay inside the repository: ${relative(ROOT, sourceFile)}`);
  }

  const entry = makeEntry({ sourceFile, globalName });
  outputs.push(relative(ROOT, outputFile));

  return {
    input: entry.virtualId,
    plugins: [entry],
    output: {
      file: outputFile,
      format: "iife",
      name: globalName,
      exports: "default",
      sourcemap: false,
      minify: true,
      banner: `/* Generated from ${relative(ROOT, sourceFile)}. Do not edit directly. */`,
    },
    treeshake: true,
  };
});

mkdirSync(dirname(OUTPUT_MANIFEST), { recursive: true });
writeFileSync(OUTPUT_MANIFEST, outputs.join("\n") + (outputs.length ? "\n" : ""));

if (configs.length === 0) {
  console.warn("No TypeScript entry files found.");
}

export default configs;
