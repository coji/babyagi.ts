import chalk from 'chalk'
import { createTaskListStorageService } from './task_list_storage.js'
import { createOpenAiService } from './llm_openai.js'
import { createAgentService } from './agent.js'
import { setTimeout } from 'timers/promises'
import { createResultStorageService } from './result_storage.js'

export const createAgentRunner = (
  objective: string,
  initialTask: string,
  openAiService: ReturnType<typeof createOpenAiService>,
) => {
  const run = async () => {
    const taskListStorage = createTaskListStorageService()
    taskListStorage.add(initialTask)
    const resultStorage = createResultStorageService()

    const agent = createAgentService({
      objective,
      context: { LLMService: openAiService, taskListStorage, resultStorage },
    })

    while (taskListStorage.length() > 0) {
      console.log(chalk.magentaBright.bold('\n*****TASK LIST*****\n'))
      taskListStorage.taskNames().forEach((taskName) => {
        console.log(' • ' + taskName)
      })

      // Step 1: Pull the first task
      const task = taskListStorage.pull()
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
      const newTasks = await agent.task_creation(result, task.taskName)
      if (newTasks) {
        for (const t of newTasks) {
          taskListStorage.add(t)
        }
      }
      await agent.prioritization(task.taskId)
      await setTimeout(3000)
    }
  }

  return { run }
}
