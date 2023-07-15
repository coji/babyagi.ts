import type { Task } from './task_list.js'

export const createResultStorageService = () => {
  const results = new Map<Task['taskId'], { task: Task; result: string }>()

  const add = (task: Task, result: string) => {
    results.set(task.taskId, { task, result })
  }
  const query = (query: string, topK: number) => {
    Array.from(results.values()).slice(0, topK)
  }

  return { add, query }
}
