import type { Plugin } from 'vite'
import { transform } from './transformer'
import { Options } from './types'

const defaultOptions: Options = {
  renderer: 'react',
  snapshot: false,
}

export const storybookTest = (options?: Partial<Options>): Plugin => {
  return {
    name: 'vite-plugin-storybook-test',
    enforce: 'pre',
    config(config: any) {
      config.test = config.test ?? {}
      // add a prefix to the tests
      config.test.name = 'storybook'
      // enable isolate false by default for better performance
      config.test.isolate = config.test.isolate ?? false
      // enable globals so there's more compatibility with third party libraries e.g. vi-canvas-mock
      config.test.globals = config.test.globals ?? true
      config.test.include = config.test.include || []
      config.test.include.push('**/*.{story,stories}.?(c|m)[jt]s?(x)')

      return config
    },
    async transform(code, id) {
      if (process.env.VITEST !== 'true') return code
      if (id.match(/\.[cm]?[jt]sx?$/))
        return transform({
          code,
          id,
          options: { ...defaultOptions, ...options },
        })
    },
  }
}

export default storybookTest
