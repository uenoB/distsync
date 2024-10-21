#!/usr/bin/env node
import * as fs from 'node:fs'
import { program } from 'commander'
import debug from 'debug'
import pc from 'picocolors'
import { distsync } from '../dist/index.js'

const packageJson = JSON.parse(
  fs.readFileSync(new URL('../package.json', import.meta.url))
)
program.version(packageJson.version)
program.option('-c, --config <path>', 'path to configuration file')
program.option('-r, --remote <url>', 'URL of remote directory')
program.option('-n, --dry-run', 'disable uploading files')
program.option('-q, --quiet', 'disable progress output')
program.option('-d, --debug', 'print debug information')

const options = program.parse(process.argv).opts()

if (options.debug === true) debug.enable('distsync:*')
if (program.args.length > 0) options.sources = program.args

await distsync(options).catch(e => {
  console.error(`${pc.red(pc.bold('ERROR:'))} ${String(e)}`)
  if (options.debug === true) throw e
  process.exitCode = 1
})
