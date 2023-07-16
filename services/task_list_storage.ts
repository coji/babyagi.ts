export interface Task {
  taskId: number
  taskName: string
}

export const createTaskListStorageService = () => {
  let taskList: Task[] = []
  let taskIdCounter = 1

  const taskNames = () => taskList.map((task) => task.taskName)
  const length = () => taskList.length
  const pull = () => taskList.shift()
  const add = (task: string) =>
    taskList.push({ taskId: taskIdCounter++, taskName: task })
  const clear = () => (taskList = [])

  return { taskList, taskNames, length, pull, add, clear }
}
