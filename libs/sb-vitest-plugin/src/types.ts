export type UserOptions = {
  configDir: string
  storybookScript: string
  storybookUrl: string
  skipRunningStorybook: boolean
  renderer: 'react' | 'vue3' | 'svelte'
  snapshot: boolean
}

export type InternalOptions = UserOptions & {
  storybookPort: number
}
