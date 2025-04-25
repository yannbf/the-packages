#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");

const bold = (message) => `\u001b[1m${message}\u001b[22m`;
const magenta = (message) => `\u001b[35m${message}\u001b[39m`;
const blue = (message) => `\u001b[34m${message}\u001b[39m`;
const red = (message) => `\u001b[31m${message}\u001b[39m`;
const yellow = (message) => `\u001b[33m${message}\u001b[39m`;
const grey = (message) => `\u001b[90m${message}\u001b[39m`;


const summary = {
  storybookDirs: [],
  storyFiles: [],
  packageChanges: {},
};

function walk(dir, ignoredDirs = ["node_modules", "storybook-static", "dist", "build"]) {
  let results = [];

  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);

      // Skip ignored directories
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
        if (ignoredDirs.includes(path.basename(fullPath))) continue;
        results = results.concat(walk(fullPath, ignoredDirs));
      } else {
        try {
          if (fs.existsSync(fullPath)) {
            results.push(fullPath);
          }
        } catch {
          // broken symlink or inaccessible
        }
      }
    }
  } catch {
    // unreadable dir
  }

  return results;
}

function getProjectRoot() {
  try {
    return execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
  } catch {
    console.warn("⚠️  Not inside a Git repository. Falling back to current working directory.");
    return process.cwd();
  }
}

function deleteDir(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
    summary.storybookDirs.push(targetPath);
  }
}

function deleteFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    summary.storyFiles.push(filePath);
  }
}

function cleanPackageJson(pkgPath) {
  const content = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
  let changed = false;
  const removed = [];

  ["dependencies", "devDependencies"].forEach((section) => {
    if (content[section]) {
      for (const key of Object.keys(content[section])) {
        if (key.includes("storybook")) {
          delete content[section][key];
          removed.push(key);
          changed = true;
        }
      }
    }
  });

  if (changed) {
    fs.writeFileSync(pkgPath, JSON.stringify(content, null, 2));
    summary.packageChanges[pkgPath] = removed;
  }
}

// --- Start ---
const root = getProjectRoot();
const allPaths = walk(root);
const allDirs = allPaths
  .map(p => path.dirname(p))
  .filter((v, i, arr) => arr.indexOf(v) === i); // unique

console.log("\n💣 Deleting .storybook directories...");
for (const dir of allDirs) {
  if (path.basename(dir) === ".storybook" && fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
    deleteDir(dir);
  }
}

console.log("\n🧹 Cleaning Storybook dependencies from package.json files...");
// Clean package.json files
const allPackageJsons = allPaths.filter((p) => p.endsWith("package.json"));
for (const pkg of allPackageJsons) {
  cleanPackageJson(pkg);
}

console.log("\n🚮 Deleting Storybook files...");
// Delete *.stories.* files
for (const file of allPaths) {
  if (/\.stories\.[^.]+$/.test(file)) {
    deleteFile(file);
    summary.storyFiles.push(file);
  }
}

const hasPackageChanges = (Object.keys(summary.packageChanges).length > 0)

if(hasPackageChanges) {
  console.log("\n🔧 Running install command...");
  const result = spawnSync("ni", [], { stdio: "inherit", cwd: root, shell: true });
  if (result.error) {
    console.error("❌ Error running package manager install:", result.error.message);
    process.exit(1);
  }
}

// --- Show Summary ---
console.log("\n📦 Summary of Changes");

if (hasPackageChanges) {
  console.log(`\n${bold`  📁 package.json changes:`}`);
  for (const [file, deps] of Object.entries(summary.packageChanges)) {
    console.log(`  - ${blue(file)}`);
    console.log(`    • ${deps.length} deps removed: ${deps.join(", ")}`);
  }
} else {
  console.log(`\n${bold`  📁 package.json changes: none`}`);
}

if (summary.storybookDirs.length > 0) {
  console.log(`\n${bold`  🗂️  .storybook directories removed:`}`);
  summary.storybookDirs.forEach(dir => console.log(`  - ${blue(dir)}`));
} else {
  console.log(`\n${bold`  🗂️  .storybook directories removed: none`}  `);
}

if (summary.storyFiles.length > 0) {
  console.log(`\n${bold`  📝 Storybook files (*.stories.*) removed:`} ${summary.storyFiles.length}`);
} else {
  console.log(`\n${bold`  📝 Storybook files (*.stories.*) removed: none`}`);
}
