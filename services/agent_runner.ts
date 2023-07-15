import chalk from 'chalk'
import { createTaskListService } from './task_list.js'
import { createOpenAiService } from './openai.js'
import { createAgentService } from './agent.js'
import { setTimeout } from 'timers/promises'
import { createResultStorageService } from './result_storage.js'

export const createAgentRunner = (
  objective: string,
  initialTask: string,
  openAiService: ReturnType<typeof createOpenAiService>,
) => {
  const run = async () => {
    const taskListService = createTaskListService()
    taskListService.add(initialTask)
    const resultStorage = createResultStorageService()

    const agent = createAgentService({
      objective,
      context: { openAiService, taskListService },
    })

    while (taskListService.length() > 0) {
      console.log(chalk.magentaBright.bold('\n*****TASK LIST*****\n'))
      taskListService.taskNames().forEach((taskName) => {
        console.log(' • ' + taskName)
      })

      // Step 1: Pull the first task
      const task = taskListService.pull()
      if (!task) {
        return
      }
      console.log(chalk.green.bold('\n*****NEXT TASK*****\n'))
      console.log(`${task.taskId}: ${task.taskName}`)

      // Send to execution function to complete the task based on the context
      const result = await agent.execution({ task: task.taskName })
      console.log(chalk.yellow.bold('\nTASK RESULT\n'))
      console.log(result)
      resultStorage.add(task, result)

      // Step 3: Create new tasks and re-prioritize task list
      const newTasks = await agent.task_creation(objective, result)
      if (newTasks) {
        for (const t of newTasks) {
          taskListService.add(t)
        }
      }
      await agent.prioritization(task.taskId)
      await setTimeout(3000)
    }
  }

  return { run }
}
