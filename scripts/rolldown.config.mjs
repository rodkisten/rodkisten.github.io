import {
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(process.cwd());
const OUTPUT_MANIFEST = resolve(ROOT, ".cache/ts-build-outputs.txt");

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".github",
  ".cache",
  "node_modules",
  "dist",
  "build",
  "coverage",
]);

/**
 * Procura entradas TypeScript no repositório.
 *
 * Arquivos ignorados:
 * - declarações `.d.ts`;
 * - configurações `*.config.ts`;
 * - testes `*.test.ts` e `*.spec.ts`;
 * - diretórios de build, cache e dependências.
 */
function walk(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".well-known") {
      continue;
    }

    const absolute = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) {
        files.push(...walk(absolute));
      }
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

/**
 * Lê diretivas no início ou no corpo do arquivo TypeScript.
 *
 * Exemplos aceitos:
 *
 *   // @global RodObjectInspector
 *   // @outfile dist/object-inspector.js
 */
function readDirective(source, name) {
  const escapedName = String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `^\\s*//\\s*@${escapedName}\\s+([^\\r\\n]+)`,
    "mi",
  );
  const match = source.match(pattern);
  return match?.[1]?.trim() || null;
}

function toPascalCase(value) {
  const converted = value
    .replace(/\.user$/i, "")
    .split(/[^A-Za-z0-9_$]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  return converted || "Tool";
}

function validateGlobalName(value, file) {
  if (!/^[A-Za-z_$][\w$]*$/.test(value)) {
    throw new Error(
      `Invalid @global name "${value}" in ${relative(ROOT, file)}`,
    );
  }

  return value;
}

/**
 * Evita o bug de usar `startsWith(ROOT)`, que falha no Windows e também pode
 * aceitar caminhos com prefixos parecidos, como `/repo` e `/repo-backup`.
 */
function assertInsideRepository(file, sourceFile) {
  const repositoryRelativePath = relative(ROOT, file);
  const escapesRepository =
    repositoryRelativePath === ".." ||
    repositoryRelativePath.startsWith(`..${sep}`) ||
    isAbsolute(repositoryRelativePath);

  if (escapesRepository) {
    throw new Error(
      `@outfile must stay inside the repository: ${relative(ROOT, sourceFile)}`,
    );
  }

  return file;
}

/**
 * `@outfile` representa sempre o arquivo JavaScript normal.
 *
 * Exemplo:
 *
 *   // @outfile dist/object-inspector.js
 *
 * Gera:
 *
 *   dist/object-inspector.js
 *   dist/object-inspector.iife.js
 *   dist/object-inspector.iife.min.js
 */
function resolveOutputFiles(sourceFile, outputDirective) {
  const stem = basename(sourceFile, extname(sourceFile));
  let normalFile = outputDirective
    ? resolve(dirname(sourceFile), outputDirective)
    : resolve(dirname(sourceFile), `${stem}.js`);

  if (!extname(normalFile)) {
    normalFile = `${normalFile}.js`;
  }

  if (extname(normalFile).toLowerCase() !== ".js") {
    throw new Error(
      `@outfile must point to a .js file in ${relative(ROOT, sourceFile)}`,
    );
  }

  assertInsideRepository(normalFile, sourceFile);

  const base = normalFile.slice(0, -".js".length);
  const files = {
    normal: normalFile,
    iife: `${base}.iife.js`,
    iifeMin: `${base}.iife.min.js`,
  };

  for (const file of Object.values(files)) {
    assertInsideRepository(file, sourceFile);
  }

  return files;
}

/**
 * Cria um entry virtual somente para as versões IIFE.
 *
 * A versão `.js` normal usa o TypeScript original como entrada para preservar
 * seus exports ESM. Já o entry virtual das versões IIFE escolhe, nesta ordem:
 *
 * 1. export default;
 * 2. export com o mesmo nome de `@global`;
 * 3. namespace completo dos exports;
 * 4. global que o próprio módulo tenha publicado por efeito colateral.
 *
 * Depois, publica a mesma referência nos realms acessíveis: globalThis,
 * window, self, unsafeWindow, parent e top. A escrita em realms cross-origin
 * é protegida por try/catch.
 */
function makeIifeEntry({ sourceFile, globalName, suffix }) {
  const sourceUrl = pathToFileURL(sourceFile).href;
  const virtualId = `\0rod-iife-entry:${suffix}:${sourceFile}`;
  const serializedGlobalName = JSON.stringify(globalName);

  return {
    name: `rod-iife-entry:${suffix}:${relative(ROOT, sourceFile)}`,

    resolveId(id) {
      return id === virtualId ? id : null;
    },

    load(id) {
      if (id !== virtualId) {
        return null;
      }

      return `
import * as __module from ${JSON.stringify(sourceUrl)};

const __globalName = ${serializedGlobalName};
const __roots = [];

function __addRoot(value) {
  if (!value || (typeof value !== "object" && typeof value !== "function")) {
    return;
  }

  if (!__roots.includes(value)) {
    __roots.push(value);
  }
}

__addRoot(globalThis);

try {
  if (typeof window !== "undefined") __addRoot(window);
} catch {}

try {
  if (typeof self !== "undefined") __addRoot(self);
} catch {}

try {
  if (typeof unsafeWindow !== "undefined") __addRoot(unsafeWindow);
} catch {}

try {
  if (typeof window !== "undefined") __addRoot(window.parent);
} catch {}

try {
  if (typeof window !== "undefined") __addRoot(window.top);
} catch {}

let __existing;

for (const __root of __roots) {
  try {
    const __candidate = __root[__globalName];
    if (__candidate !== undefined) {
      __existing = __candidate;
      break;
    }
  } catch {}
}

const __keys = Object.keys(__module);
const __hasExports = __keys.length > 0;
const __value = Object.prototype.hasOwnProperty.call(__module, "default")
  ? __module.default
  : Object.prototype.hasOwnProperty.call(__module, __globalName)
    ? __module[__globalName]
    : __hasExports
      ? __module
      : __existing;

function __publish(__root) {
  if (__value === undefined) {
    return;
  }

  try {
    Object.defineProperty(__root, __globalName, {
      value: __value,
      configurable: true,
      writable: true,
    });
    return;
  } catch {}

  try {
    __root[__globalName] = __value;
  } catch {}
}

for (const __root of __roots) {
  __publish(__root);
}

export default __value;
`;
    },

    virtualId,
  };
}

function generatedBanner(sourceFile, minified = false) {
  const comment = `Generated from ${relative(ROOT, sourceFile)}. Do not edit directly.`;

  // O prefixo `/*!` preserva o banner legal na saída minificada.
  return minified ? `/*! ${comment} */` : `/* ${comment} */`;
}

const sourceFiles = walk(ROOT).sort();
const outputs = [];
const claimedOutputs = new Map();
const configs = [];

function registerOutput(outputFile, sourceFile) {
  const absolute = resolve(outputFile);
  const existingSource = claimedOutputs.get(absolute);

  if (existingSource) {
    throw new Error(
      [
        `Two TypeScript entries would write the same output:`,
        `  output: ${relative(ROOT, absolute)}`,
        `  first:  ${relative(ROOT, existingSource)}`,
        `  second: ${relative(ROOT, sourceFile)}`,
      ].join("\n"),
    );
  }

  claimedOutputs.set(absolute, sourceFile);
  outputs.push(relative(ROOT, absolute));
}

for (const sourceFile of sourceFiles) {
  const source = readFileSync(sourceFile, "utf8");
  const stem = basename(sourceFile, extname(sourceFile));
  const globalName = validateGlobalName(
    readDirective(source, "global") || toPascalCase(stem),
    sourceFile,
  );
  const outputFiles = resolveOutputFiles(
    sourceFile,
    readDirective(source, "outfile"),
  );

  registerOutput(outputFiles.normal, sourceFile);
  registerOutput(outputFiles.iife, sourceFile);
  registerOutput(outputFiles.iifeMin, sourceFile);

  // 1. JavaScript normal: bundle ESM legível, sem wrapper global.
  configs.push({
    input: sourceFile,
    output: {
      file: outputFiles.normal,
      format: "es",
      sourcemap: false,
      minify: false,
      banner: generatedBanner(sourceFile),
    },
    treeshake: true,
  });

  // 2 e 3. IIFE legível e IIFE minificada compartilham o mesmo entry virtual.
  const iifeEntry = makeIifeEntry({
    sourceFile,
    globalName,
    suffix: "browser",
  });

  configs.push({
    input: iifeEntry.virtualId,
    plugins: [iifeEntry],
    output: [
      {
        file: outputFiles.iife,
        format: "iife",
        name: globalName,
        exports: "default",
        sourcemap: false,
        minify: false,
        banner: generatedBanner(sourceFile),
      },
      {
        file: outputFiles.iifeMin,
        format: "iife",
        name: globalName,
        exports: "default",
        sourcemap: false,
        minify: true,
        legalComments: "inline",
        banner: generatedBanner(sourceFile, true),
      },
    ],
    treeshake: true,
  });
}

mkdirSync(dirname(OUTPUT_MANIFEST), { recursive: true });
writeFileSync(
  OUTPUT_MANIFEST,
  outputs.join("\n") + (outputs.length ? "\n" : ""),
);

if (configs.length === 0) {
  console.warn("No TypeScript entry files found.");
}

export default configs;
