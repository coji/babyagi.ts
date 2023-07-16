import type { Task } from './task_list_storage.js'

export const createResultStorageService = () => {
  const results = new Map<Task['taskId'], { task: Task; result: string }>()

  const add = (task: Task, result: string) => {
    results.set(task.taskId, { task, result })
  }
  const query = (query: string, topK: number) => {
    console.debug({
      query,
      results: Array.from(results.values()),
    })
    return Array.from(results.values()).slice(0, topK)
  }

  return { add, query }
}
