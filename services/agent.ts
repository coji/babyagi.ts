import { openai_completion } from './openai.js'
import { type createTaskListService } from './task_list.js'

export const createAgentService = ({
  objective,
  taskListService,
}: {
  objective: string
  taskListService: ReturnType<typeof createTaskListService>
}) => {
  const task_creation = async (
    result: string | undefined,
    task_description: string,
  ) => {
    const prompt = `
        You are an task creation AI that uses the result of an execution agent to create new tasks with the following objective: ${objective}, 
        The last completed task has the result: ${result}. 
        This result was based on this task description: ${task_description}. 
        These are incomplete tasks: ${taskListService.taskList
          .map((task) => `${task.taskId}: ${task.taskName}`)
          .join(', ')}. 
        Based on the result, create new tasks to be completed by the AI system that do not overlap with incomplete tasks. 
        Return the tasks as an array.`
    const response = await openai_completion({ prompt })
    if (!response) {
      return
    }
    const newTasks = response.trim().includes('\n')
      ? response.trim().split('\n')
      : [response.trim()]
    return newTasks
  }

  const prioritization = async (taskId: number) => {
    const taskNames = taskListService.task_names()
    const nextTaskId = taskId + 1
    const prompt = `
    You are an task prioritization AI tasked with cleaning the formatting of and re-prioritizing the following tasks: ${taskNames}. 
    Consider the ultimate objective of your team:${objective}. Do not remove any tasks. Return the result as a numbered list, like:
    #. First task
    #. Second task
    Start the task list with number ${nextTaskId}.`
    const response = await openai_completion({ prompt })
    if (!response) {
      throw new Error('No response from OpenAI')
    }
    const newTasks = response.trim().includes('\n')
      ? response.trim().split('\n')
      : [response.trim()]
    taskListService.clear_tasks()
    newTasks.forEach((newTask) => {
      const newTaskParts = newTask.trim().split(/\.(?=\s)/)
      if (newTaskParts.length == 2) {
        const newTaskName = newTaskParts[1].trim()
        taskListService.add_task(newTaskName)
      }
    })
  }

  const execution = async ({ task }: { task: string }) => {
    const context = await context_agent(objective, 5)
    const prompt = `
    You are an AI who performs one task based on the following objective: ${objective}.\n
    Take into account these previously completed tasks: ${context}.\n
    Your task: ${task}\nResponse:`
    const response = await openai_completion({ prompt, maxTokens: 2000 })
    return response
  }

  const context_agent = async (query: any, topResultsNum: number) =>
    taskListService.task_names().slice(0, topResultsNum)

  return {
    task_creation,
    prioritization,
    execution,
  }
}
