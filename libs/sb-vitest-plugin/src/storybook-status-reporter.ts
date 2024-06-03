import { Reporter } from 'vitest/reporters'
import { TaskResultPack, Vitest } from 'vitest'
import { InternalOptions } from './types'

const stateToStatusMap = {
  run: 'pending',
  pass: 'success',
  fail: 'error',
} as any

export class StorybookStatusReporter implements Reporter {
  options: InternalOptions
  ctx!: Vitest

  constructor(options: InternalOptions) {
    this.options = options
  }

  onInit(ctx: Vitest): void {
    this.ctx = ctx
  }

  async onTaskUpdate(packs: TaskResultPack[]) {
    if (this.ctx.config.watch) {
      for (const pack of packs) {
        const task = this.ctx.state.idMap.get(pack[0])
        if (task && task.type === 'test') {
          const status = stateToStatusMap[task.result?.state as string]
          const meta = (task.meta || pack[2]) as { storyId: string }
          const url = this.options.storybookUrl
          if (process.env.DEBUG) {
            console.log(
              `Updating status for story ${meta.storyId} to ${status} in ${url}/experimental-status-api`
            )
          }
          fetch(`${url}/experimental-status-api`, {
            method: 'POST',
            body: JSON.stringify({
              data: { status, storyId: meta.storyId },
              id: 'vitest-plugin',
            }),
          })
        }
      }
    }
  }
}
