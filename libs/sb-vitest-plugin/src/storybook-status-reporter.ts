import { Reporter } from 'vitest/reporters'
import { TaskResultPack, TaskState, Vitest } from 'vitest'
import { API_StatusUpdate, API_StatusValue } from '@storybook/types'
import { InternalOptions } from './types'


const stateToStatusMap = {
  fail: 'error',
  run: 'unknown',
  pass: 'unknown',
  skip: 'unknown',
  todo: 'unknown',
  only: 'unknown',
} as Record<TaskState, API_StatusValue>

export class StorybookStatusReporter implements Reporter {
  options: InternalOptions
  ctx!: Vitest

  constructor(options: InternalOptions) {
    this.options = options
  }

  onInit(ctx: Vitest): void {
    this.ctx = ctx
  }

  private async requestStorybookStatusUpdate(data: API_StatusUpdate) {
    try {
      await fetch(`${this.options.storybookUrl}/experimental-status-api`, {
        method: 'POST',
        body: JSON.stringify({
          data,
          id: 'storybook-vitest-plugin',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      })
    } catch (err) {
      if (this.options.debug) {
        console.log('Error updating status', err)
        throw err
      }
    }
  }

  // The onTaskUpdate hook is called in batches for multiple tests (if they are too fast) - 40ms.
  // It receives an array of tuples: [taskId, taskResult, taskMeta]
  onTaskUpdate(packs: TaskResultPack[]) {
    if (!this.ctx.config.watch) return;

    const batchData: API_StatusUpdate = {}

    for (const pack of packs) {
      const task = this.ctx.state.idMap.get(pack[0])
      const taskResult = task?.result

      if (task && task.type === 'test' && taskResult?.state) {
        const status = stateToStatusMap[taskResult.state]
        
        // task.meta is either in pack[2] or in a task.meta, depending on the timing
        const meta = (task.meta || pack[2]) as { storyId: string }

        // Only update if it's pending or failed, to avoid noise
        batchData[meta.storyId] = {
          status,
          title: 'Unit test',
          description: taskResult.errors?.[0]?.message || '',
        }
      }
    }

    this.requestStorybookStatusUpdate(batchData)
  }
}
