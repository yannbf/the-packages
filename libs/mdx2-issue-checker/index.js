#!/usr/bin/env node
import { createRequire } from 'node:module'
import { args } from 'unified-args'
import { remark } from 'remark'

const require = createRequire(import.meta.url)

const proc = require('remark/package.json')
const cli = require('./package.json')

const inputs = process.argv.slice(2)
const isAllFlags = inputs.every((input) => input.startsWith('-'))

if(isAllFlags) {
  process.argv = process.argv.concat(['.'])
}

if(!inputs.includes('--watch')) {
  const silentTip = !inputs.includes('--silent') ? ' You can also run it with the --silent flag if you want only errors to be reported.' : ''
  console.log(`Tip: you can run this command with the --watch flag to continuously check for issues as you change your files.${silentTip}\n`)
}

process.argv = process.argv.concat(['--use', require.resolve('remark-mdx')])

args({
  processor: remark,
  name: proc.name,
  description: cli.description,
  version: [
    proc.name + ': ' + proc.version,
    cli.name + ': ' + cli.version
  ].join(', '),
  pluginPrefix: proc.name,
  presetPrefix: proc.name + '-preset',
  packageField: proc.name + 'Config',
  rcName: '.' + proc.name + 'rc',
  ignoreName: '.' + proc.name + 'ignore',
  extensions: ['mdx'],
})