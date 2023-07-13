export interface Task {
  taskId: number
  taskName: string
}

export const createTaskListService = () => {
  let taskList: Task[] = []
  let taskIdCounter = 1

  const task_names = () => taskList.map((task) => task.taskName)
  const add_task = (task: string) =>
    taskList.push({ taskId: taskIdCounter++, taskName: task })
  const clear_tasks = () => (taskList = [])

  return { taskList, task_names, add_task, clear_tasks }
}
