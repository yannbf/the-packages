#!/usr/bin/env node
import { traverseDirectories } from './generate-portable-stories-files'
import { generateTests } from './generate-playwright-test-file'

const inputs = process.argv.slice(2)
const isAllFlags = inputs.every((input) => input.startsWith('-'))

if(isAllFlags) {
  process.argv = process.argv.concat(['.'])
}

traverseDirectories()
generateTests()