#!/usr/bin/env node

const { intro, outro, note, log, spinner, confirm, multiselect } = require('@clack/prompts');
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

function getRelativePath(absolutePath) {
  const root = getProjectRoot();
  return path.relative(root, absolutePath);
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

async function uninstall() {
  intro('🧹 Storybook Uninstaller');

  const root = getProjectRoot();
  const allPaths = walk(root);
  const allDirs = allPaths
    .map(p => path.dirname(p))
    .filter((v, i, arr) => arr.indexOf(v) === i);

  // Find all Storybook-related items
  const storybookDirs = allDirs.filter(dir => 
    path.basename(dir) === ".storybook" && 
    fs.existsSync(dir) && 
    fs.statSync(dir).isDirectory()
  );

  const storyFiles = allPaths.filter(file => /\.stories\.[^.]+$/.test(file));
  const mdxFiles = allPaths.filter(file => {
    if (file.endsWith('.mdx')) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        return content.includes('@storybook/');
      } catch {
        return false;
      }
    }
    return false;
  });

  const packageJsons = allPaths.filter(p => p.endsWith("package.json"));

  // Filter package.json files that contain Storybook dependencies
  const packageJsonsWithStorybook = packageJsons.filter(pkgPath => {
    try {
      const content = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      return ["dependencies", "devDependencies"].some(section => 
        content[section] && Object.keys(content[section]).some(key => key.includes("storybook"))
      );
    } catch {
      return false;
    }
  });

  if (storybookDirs.length === 0 && storyFiles.length === 0 && mdxFiles.length === 0 && packageJsonsWithStorybook.length === 0) {
    note('This project does not use Storybook, there is nothing to uninstall!', 'No Action Needed');
    outro('✨ Done');
    return;
  }

  // Select Storybook directories to remove
  const selectedDirs = isYes 
    ? storybookDirs 
    : storybookDirs.length > 1 
      ? await multiselect({
          message: 'Select .storybook directories to remove:',
          options: storybookDirs.map(dir => ({
            value: dir,
            label: getRelativePath(dir),
            hint: 'Directory'
          })),
          initialValues: storybookDirs,
        })
      : storybookDirs;

  if (!selectedDirs) {
    note('Uninstallation cancelled.', 'Cancelled');
    outro('✨ Done');
    return;
  }

  // Select package.json files to clean
  const selectedPackages = isYes
    ? packageJsonsWithStorybook
    : packageJsonsWithStorybook.length > 1
      ? await multiselect({
          message: 'Select package.json files to clean:',
          options: packageJsonsWithStorybook.map(pkg => ({
            value: pkg,
            label: getRelativePath(pkg),
            hint: 'Package.json'
          })),
          initialValues: packageJsonsWithStorybook,
        })
      : packageJsonsWithStorybook;

  if (!selectedPackages) {
    note('Uninstallation cancelled.', 'Cancelled');
    outro('✨ Done');
    return;
  }

  const shouldRemoveStories = !keepStories;
  const confirmMessage = shouldRemoveStories
    ? `This command will remove the storybook directories, dependencies, ${storyFiles.length} story ${storyFiles.length === 1 ? 'file' : 'files'} and ${mdxFiles.length} MDX docs. Proceed with uninstallation?`
    : `This command will remove the storybook directories and dependencies but keep the ${storyFiles.length} story ${storyFiles.length === 1 ? 'file' : 'files'} and ${mdxFiles.length} MDX docs. Proceed with uninstallation?`;

  const shouldProceed = isYes 
    ? true 
    : await confirm({
        message: confirmMessage,
        initialValue: true,
      });

  if (!shouldProceed) {
    note('Uninstallation cancelled.', 'Cancelled');
    outro('✨ Done');
    return;
  }

  log.success(`Removing ${selectedDirs.length} .storybook ${selectedDirs.length === 1 ? 'directory' : 'directories'}...`);
  // Delete .storybook directories
  for (const dir of selectedDirs) {
    deleteDir(dir);
  }

  // Count total Storybook dependencies
  let totalDeps = 0;
  for (const pkg of selectedPackages) {
    const content = JSON.parse(fs.readFileSync(pkg, "utf-8"));
    ["dependencies", "devDependencies"].forEach((section) => {
      if (content[section]) {
        totalDeps += Object.keys(content[section]).filter(key => key.includes("storybook")).length;
      }
    });
  }

  log.success(`Removing ${totalDeps} Storybook ${totalDeps === 1 ? 'dependency' : 'dependencies'} from ${selectedPackages.length} package.json ${selectedPackages.length === 1 ? 'file' : 'files'}...`);
  // Clean package.json files
  for (const pkg of selectedPackages) {
    cleanPackageJson(pkg);
  }

  if (shouldRemoveStories) {
    log.success(`Removing ${storyFiles.length} story ${storyFiles.length === 1 ? 'file' : 'files'}...`);
    // Delete story files
    for (const file of storyFiles) {
      deleteFile(file);
    }

    log.success(`Removing ${mdxFiles.length} MDX ${mdxFiles.length === 1 ? 'doc' : 'docs'}...`);
    // Delete MDX files
    for (const file of mdxFiles) {
      deleteFile(file);
    }
  }

  const hasPackageChanges = Object.keys(summary.packageChanges).length > 0;

  if (hasPackageChanges) {
    const shouldInstall = true;
    // await confirm({
    //   message: 'Storybook dependencies were removed from package.json. Run package manager install?',
    //   initialValue: true,
    // });

    if (shouldInstall) {
      const s = spinner();
      s.start('Running install command...');
      const result = spawnSync("ni", [], { stdio: "ignore", cwd: root, shell: true });
      if (result.error) {
        log.error('Error running package manager install: ' + result.error.message);
        process.exit(1);
      } else {
        s.stop('Install command completed');
      }
    }
  }

  log.info(`All done! Here's the summary of changes:`);

  // Show summary
  if (hasPackageChanges) {
    note('Package.json changes:');
    for (const [file, deps] of Object.entries(summary.packageChanges)) {
      console.log(`${grey('│')} • ${blue(getRelativePath(file))}`);
      console.log(`${grey('│')}   ◦ ${deps.length} deps removed: ${deps.join(", ")}`);
    }
  }

  if (summary.storybookDirs.length > 0) {
    note('.storybook directories removed:');
    summary.storybookDirs.forEach(dir => console.log(`${grey('│')}  • ${blue(getRelativePath(dir))}`));
  }

  if (shouldRemoveStories) {
    if (summary.storyFiles.length > 0) {
      note(`${summary.storyFiles.length} ${summary.storyFiles.length === 1 ? 'file' : 'files'} removed`, `Stories:`);
    }

    if (mdxFiles.length > 0) {
      note(`${mdxFiles.length} ${mdxFiles.length === 1 ? 'file' : 'files'} removed`, `MDX docs:`);
    }
  }

  outro('✨ Storybook uninstallation complete!');
}

// Handle command line arguments
const command = process.argv[2];
const isYes = process.argv.includes('--yes') || process.argv.includes('-y');
const keepStories = process.argv.includes('--keep-stories') || process.argv.includes('-k');

if (!command || command === '--help' || command === '-h') {
  console.log(`
Usage: sb-utils <command> [options]

Commands:
  uninstall    Remove Storybook from your project
  --help, -h   Show this help message

Options:
  --yes, -y         Don't ask for prompts
  --keep-stories, -k    Keep .stories and MDX files when uninstalling
  `);
  process.exit(0);
}

if (command === 'uninstall') {
  uninstall().catch(console.error);
} else {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
} 