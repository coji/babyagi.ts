import chalk from 'chalk'
import { createTaskListService } from './task_list.js'
import { createOpenAiService } from './openai.js'
import { createAgentService } from './agent.js'
import { setTimeout } from 'timers/promises'

export const createAgentRunner = (
  objective: string,
  initialTask: string,
  openAiService: ReturnType<typeof createOpenAiService>,
) => {
  const run = async () => {
    const taskListService = createTaskListService()
    taskListService.add_task(initialTask)

    const agent = createAgentService({
      objective,
      context: { openAiService, taskListService },
    })

    while (taskListService.taskList.length > 0) {
      console.log(chalk.magentaBright.bold('\n*****TASK LIST*****\n'))
      taskListService.task_names().forEach((taskName) => {
        console.log(' • ' + taskName)
      })

      // Step 1: Pull the first task
      const task = taskListService.taskList.shift()
      if (!task) {
        return
      }
      console.log(chalk.green.bold('\n*****NEXT TASK*****\n'))
      console.log(task.taskId + ': ' + task.taskName)

      // Send to execution function to complete the task based on the context
      const result = await agent.execution({ task: task.taskName })
      const currTaskId = task.taskId
      console.log(chalk.yellow.bold('\nTASK RESULT\n'))
      console.log(result)

      // Step 3: Create new tasks and re-prioritize task list
      const newTasks = await agent.task_creation(result, task.taskName)
      if (newTasks) {
        for (const t of newTasks) {
          taskListService.add_task(t)
        }
      }
      await agent.prioritization(currTaskId)
      await setTimeout(3000)
    }
  }

  return { run }
}
