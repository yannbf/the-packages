import net from 'net'
import { exec, ChildProcess } from 'child_process'
import { Reporter } from 'vitest/reporters'
import { InternalOptions } from './types'
import { Vitest } from 'vitest'
import { log } from './utils'

let storybookProcess: ChildProcess | null = null

const startStorybookIfNeeded = async (options: InternalOptions) => {
  const port = options.storybookPort

  const server = net.createServer()

  server.once('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      // Storybook is running
    }
  })

  // TODO: make async
  server.once('listening', () => {
    server.close()
    const script = `${options.storybookScript} --ci`
    log(`Running the Storybook command: ${script}`)
    storybookProcess = exec(script, (error, stdout, stderr) => {
      log('exec output:', { error, stdout, stderr })
      if (error) {
        if (error.message.includes('not found')) {
          console.warn(
            `\nCould not spawn Storybook with command: "${options.storybookScript}".\nIf you have a custom Storybook script, please specify via the plugin "storybookScript" option.`
          )
        } else {
          console.warn(
            `\nAn error occurred starting Storybook. Please fix it and rerun the test command : ${error.message}`
          )
          console.warn(stderr || stdout)
        }
        return
      }
    })
  })

  server.listen(port)
}

const stopStorybook = () => {
  log('Stopping Storybook:', storybookProcess)

  if (storybookProcess) {
    storybookProcess.kill('SIGINT')
    storybookProcess = null
  }
}

export class StorybookCliReporter implements Reporter {
  options: InternalOptions
  ctx!: Vitest

  constructor(options: InternalOptions) {
    this.options = options
  }

  async onInit(ctx: Vitest) {
    this.ctx = ctx

    if (ctx.config.watch) {
      process.on('exit', stopStorybook)
      process.on('SIGINT', () => {
        stopStorybook()
        process.exit()
      })
      process.on('SIGTERM', () => {
        stopStorybook()
        process.exit()
      })

      await startStorybookIfNeeded(this.options)
    }
  }
}
