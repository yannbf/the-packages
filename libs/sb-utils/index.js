#!/usr/bin/env node
const path = require('path')
const { generatePortableStoriesFiles } = require('./generate-portable-stories-files.cjs')
const { generateTests } = require('./generate-playwright-test-file.cjs')

const inputs = process.argv.slice(2)
const isAllFlags = inputs.every((input) => input.startsWith('-'))

if (isAllFlags) {
  process.argv = process.argv.concat(['.'])
}

const directory = inputs[0] ? path.join(process.cwd(), inputs[0]) : process.cwd()

let renderer;

try {
  require('@storybook/vue3')
  renderer = 'vue3';
} catch (err) {
  try {
    require('@storybook/react')
    renderer = 'react';
  } catch (err) { }
}

if(!renderer) {
  console.error('Could not detect a Storybook renderer. Please make sure you have @storybook/vue3 or @storybook/react installed, which are the supported renderers for Playwright CT portable stories.')
  process.exit(1)
}

generatePortableStoriesFiles(directory, renderer)
generateTests(directory, renderer)