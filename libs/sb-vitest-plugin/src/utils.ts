import { UserOptions } from './types'

export const PACKAGES_MAP = {
  react: {
    storybookPackage: '@storybook/react',
    testingLibraryPackage: '@testing-library/react',
    render: (composedStory) => `render(<${composedStory} />)`,
  },
  vue3: {
    storybookPackage: '@storybook/vue3',
    testingLibraryPackage: '@testing-library/vue',
    render: (composedStory) => `render(${composedStory})`,
  },
  svelte: {
    storybookPackage: '@storybook/svelte',
    testingLibraryPackage: '@testing-library/svelte',
    render: (composedStory) =>
      `render(${composedStory}.Component, ${composedStory}.props)`,
  },
} satisfies Record<
  UserOptions['renderer'],
  {
    storybookPackage: string
    testingLibraryPackage: string
    render: (composedStory: string) => string
  }
>

export const log = (...args: any) => {
  if (process.env.DEBUG || process.env.DEBUG === 'storybook') {
    console.log('🟡 ', ...args)
  }
}
