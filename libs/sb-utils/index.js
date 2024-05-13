#!/usr/bin/env node
const path = require('path')
const { traverseDirectories } = require('./generate-portable-stories-files')
const { generateTests } = require('./generate-playwright-test-file')

const inputs = process.argv.slice(2)
const isAllFlags = inputs.every((input) => input.startsWith('-'))

if (isAllFlags) {
  process.argv = process.argv.concat(['.'])
}

const directory = inputs[0] ? path.join(process.cwd(), inputs[0]) : process.cwd()

traverseDirectories(directory)
generateTests(directory)