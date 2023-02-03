#!/usr/bin/env node
import { createRequire } from 'node:module'
import { args } from 'unified-args'
import { remark } from 'remark'

const require = createRequire(import.meta.url)

const proc = require('remark/package.json')
const cli = require('./package.json')

if(!process.argv.includes('--verbose')) {
  process.argv = process.argv.concat(['--silent'])
} else {
  const index = process.argv.indexOf('--verbose');
  process.argv.splice(index, 1);
}

if(process.argv.length === 3) {
  process.argv = process.argv.concat(['.'])
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