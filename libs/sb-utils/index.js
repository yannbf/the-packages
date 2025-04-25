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

  if (storybookDirs.length === 0 && storyFiles.length === 0 && packageJsonsWithStorybook.length === 0) {
    note('No Storybook files or directories found in the project.', 'No Action Needed');
    outro('✨ Done');
    return;
  }

  // Select Storybook directories to remove
  const selectedDirs = await multiselect({
    message: 'Select .storybook directories to remove:',
    options: storybookDirs.map(dir => ({
      value: dir,
      label: dir,
      hint: 'Directory'
    })),
    initialValues: storybookDirs,
  });

  if (!selectedDirs) {
    note('Uninstallation cancelled.', 'Cancelled');
    outro('✨ Done');
    return;
  }

  // Select package.json files to clean
  const selectedPackages = await multiselect({
    message: 'Select package.json files to clean:',
    options: packageJsonsWithStorybook.map(pkg => ({
      value: pkg,
      label: pkg,
      hint: 'Package.json'
    })),
    initialValues: packageJsonsWithStorybook,
  });

  if (!selectedPackages) {
    note('Uninstallation cancelled.', 'Cancelled');
    outro('✨ Done');
    return;
  }

  const shouldProceed = await confirm({
    message: `This command will remove the storybook directories, dependencies and ${storyFiles.length} story files. Proceed with uninstallation?`,
    initialValue: true,
  });

  if (!shouldProceed) {
    note('Uninstallation cancelled.', 'Cancelled');
    outro('✨ Done');
    return;
  }

  log.success("Deleting .storybook directories...");
  // Delete .storybook directories
  for (const dir of selectedDirs) {
    deleteDir(dir);
  }

  log.success("Cleaning Storybook dependencies from package.json files...");
  // Clean package.json files
  for (const pkg of selectedPackages) {
    cleanPackageJson(pkg);
  }

  log.success("Deleting Storybook files...");
  // Delete story files
  for (const file of storyFiles) {
    deleteFile(file);
  }

  const hasPackageChanges = Object.keys(summary.packageChanges).length > 0;

  if (hasPackageChanges) {
    const shouldInstall = await confirm({
      message: 'Storybook dependencies were removed from package.json. Run package manager install?',
      initialValue: true,
    });

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
      console.log(`${grey('│')} ${blue(file)}`);
      console.log(`${grey('│')}   • ${deps.length} deps removed: ${deps.join(", ")}`);
    }
  }

  if (summary.storybookDirs.length > 0) {
    note('.storybook directories removed:');
    summary.storybookDirs.forEach(dir => console.log(`${grey('│')}  • ${blue(dir)}`));
  }

  if (summary.storyFiles.length > 0) {
    note(`Storybook files (*.stories.*) removed: ${summary.storyFiles.length}`);
  }

  outro('✨ Storybook uninstallation complete!');
}

// Handle command line arguments
const command = process.argv[2];

if (!command || command === '--help' || command === '-h') {
  console.log(`
Usage: sb-utils <command>

Commands:
  uninstall    Remove Storybook from your project
  --help, -h   Show this help message
  `);
  process.exit(0);
}

if (command === 'uninstall') {
  uninstall().catch(console.error);
} else {
  console.error(`Unknown command: ${command}`);
  process.exit(1);
} 