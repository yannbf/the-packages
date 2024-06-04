import type { Plugin } from 'vite'
import { join } from 'path'
import { transform } from './transformer'
import { UserOptions, InternalOptions } from './types'
import { StorybookReporter } from './storybook-reporter'
import { PACKAGES_MAP, extractRenderer, log } from './utils'

const defaultOptions: UserOptions = {
  storybookScript: undefined,
  renderer: undefined,
  configDir: '.storybook',
  storybookUrl: 'http://localhost:6006',
  snapshot: false,
  skipRunningStorybook: false,
}

// The type should ideally be Plugin from vite, but that causes issues in user land
export const storybookTest = (options?: UserOptions): any => {
  const virtualSetupFileId = '/virtual:storybook-setup.js'
  const resolvedVirtualSetupFileId = '\0' + virtualSetupFileId

  const finalOptions = { ...defaultOptions, ...options } as InternalOptions

  if (process.env.DEBUG) {
    finalOptions.debug = true
  }

  // storybookUrl is used in CI to point to a deployed Storybook URL
  const storybookUrl = finalOptions.storybookUrl || defaultOptions.storybookUrl

  return {
    name: 'vite-plugin-storybook-test',
    enforce: 'pre',
    resolveId(id) {
      if (id.startsWith(virtualSetupFileId)) {
        return resolvedVirtualSetupFileId
      }
    },
    async configureServer(server) {
      if (!options?.configDir) {
        // if you don't specify configDir, I'll try to find .storybook relative to the root
        finalOptions.configDir = join(process.cwd(), finalOptions.configDir)
      } else {
        // if you do specify configDir, I'll try to find relative to the config file
        finalOptions.configDir = join(
          server.config.configFile!,
          finalOptions.configDir
        )
      }

      if (!finalOptions.renderer) {
        const extraction = await extractRenderer(finalOptions.configDir)
        if ('error' in extraction) {
          console.error(
            'Error extracting renderer (you can bypass this extraction by providing the `renderer` option to the Storybook plugin):'
          )
          throw extraction.error
        } else {
          finalOptions.renderer = extraction.renderer
        }
      }
    },
    load(id) {
      if (id === resolvedVirtualSetupFileId) {
        const metadata = PACKAGES_MAP[finalOptions.renderer]
        const setupFileContent = `
          import { afterEach, afterAll, vi } from 'vitest'
          import { setProjectAnnotations } from '${metadata.storybookPackage}'
          import { cleanup } from '${metadata.testingLibraryPackage}'

          import storybookAnnotations from '${finalOptions.configDir}/preview'

          const modifyErrorMessage = (task) => {
            task.tasks?.forEach((currentTask) => {
              if (currentTask.type === 'test' && currentTask.result.state === 'fail') {
                const currentError = currentTask.result.errors[0]
                let storyUrl = '${storybookUrl}/?path=/story/' + currentTask.meta.storyId
                if (currentTask.meta.hasPlayFunction) {
                  storyUrl = storyUrl + '&addonPanel=storybook/interactions/panel'
                }
                currentError.message = 
                  '\\n\x1B[34m' + 
                  'Click to debug the error directly in Storybook: ' + storyUrl + '\x1B[39m' + 
                  '\\n\\n' + currentError.message
              }
            })
          }

          afterEach(() => {
            process.env.DEBUG === 'storybook' && console.log('🟡 cleanup from testing library')
            cleanup()
          })
          afterAll(suite => {
            suite.tasks.forEach(modifyErrorMessage)
          })

          process.env.DEBUG === 'storybook' && console.log('🟡 Setting project annotations from virtual setup file...')
          setProjectAnnotations(storybookAnnotations)
        `
        // log('Virtual setup file content:\n', setupFileContent)
        return setupFileContent
      }
    },
    async configResolved(config: any) {
      config.test = config.test ?? {}
      // add a prefix to the tests when in a workspace scenario
      if (config.workspaceConfigPath) {
        config.test.name = 'storybook'
      }
      // enable isolate false by default for better performance
      config.test.isolate = config.test.isolate ?? false
      // enable globals so there's more compatibility with third party libraries e.g. vi-canvas-mock
      config.test.globals = config.test.globals ?? true

      config.test.include = config.test.include ?? []
      if (typeof config.test.include === 'string') {
        config.test.include = [config.test.include]
      }
      config.test.include.push('**/*.{story,stories}.?(c|m)[jt]s?(x)')

      config.test.setupFiles = config.test.setupFiles ?? []
      if (typeof config.test.setupFiles === 'string') {
        config.test.setupFiles = [config.test.setupFiles]
      }
      config.test.setupFiles.push(virtualSetupFileId)

      if (finalOptions.storybookScript && !finalOptions.skipRunningStorybook) {
        config.test.reporters = config.test.reporters ?? ['default']

        // Start Storybook CLI in background if not already running
        // And send story status to Storybook's sidebar
        config.test.reporters.push(new StorybookReporter(finalOptions))
      }

      log('Final plugin options:', finalOptions)
      log('Final Vitest config:', config)

      return config
    },
    async transform(code, id) {
      if (process.env.VITEST !== 'true') return code
      if (id.match(/(story|stories)\.[cm]?[jt]sx?$/)) {
        return transform({
          code,
          id,
          options: finalOptions,
        })
      }
    },
  } satisfies Plugin
}

export default storybookTest
