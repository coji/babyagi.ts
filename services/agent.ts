import type { OpenAiServiceOptions, createOpenAiService } from './openai.js'
import type { createTaskListService } from './task_list.js'

interface AgentServiceContext {
  taskListService: ReturnType<typeof createTaskListService>
  openAiService: ReturnType<typeof createOpenAiService>
}

export const createAgentService = ({
  objective,
  context,
}: {
  objective: string
  context: AgentServiceContext
}) => {
  const { taskListService, openAiService } = context

  const execution = async ({ task }: { task: string }) => {
    const context = await context_agent(objective, 5)
    const prompt = `
Perform one task based on the following objective: ${objective}.\n
Take into account these previously completed tasks: ${context}.\n
Your task: ${task}\nResponse:`
    const response = await openAiService.completion({ prompt, maxTokens: 2000 })
    return response
  }

  const task_creation = async (
    result: string | undefined,
    taskDescription: string,
  ) => {
    const prompt = `
You are to use the result from an execution agent to create new tasks with the following objective: ${objective}, 
The last completed task has the result: ${result}. 
This result was based on this task description: ${taskDescription}. 
These are incomplete tasks: ${taskListService.taskList
      .map((task) => `${task.taskId}: ${task.taskName}`)
      .join(', ')}. 
Based on the result, return a list of tasks to be completed in order to meet the objective. 
These new tasks must not overlap with incomplete tasks.
Return one task per line in your response. The result must be a numbered list in the format:

#. First task
#. Second task

The number of each entry must be followed by a period. If your list is empty, write "There are no tasks to add at this time."
Unless your list is empty, do not include any headers before your numbered list or follow your numbered list with any other output.
`
    const response = await openAiService.completion({ prompt })
    if (!response) {
      return
    }
    const newTasks = response.trim().includes('\n')
      ? response.trim().split('\n')
      : [response.trim()]
    return newTasks
  }

  const prioritization = async (taskId: number) => {
    const taskNames = taskListService.taskNames()
    const nextTaskId = taskId + 1
    const prompt = `
You are tasked with prioritizing the following tasks:
${taskNames.join('\n')}
Consider the ultimate objective of your team: ${objective}.
Tasks should be sorted from highest to lowest priority, where higher-priority tasks are those that act as pre-requisites or are more essential for meeting the objective.
Do not remove any tasks. Return the ranked tasks as a numbered list in the format:

#. First task
#. Second task

The entries must be consecutively numbered, starting with 1. The number of each entry must be followed by a period.
Do not include any headers before your ranked list or follow your list with any other output.`
    const response = await openAiService.completion({ prompt })
    if (!response) {
      throw new Error('No response from OpenAI')
    }
    const newTasks = response.trim().includes('\n')
      ? response.trim().split('\n')
      : [response.trim()]
    taskListService.clear()
    newTasks.forEach((newTask) => {
      const newTaskParts = newTask.trim().split(/\.(?=\s)/)
      if (newTaskParts.length == 2) {
        const newTaskName = newTaskParts[1].trim()
        taskListService.add(newTaskName)
      }
    })
  }

  const context_agent = async (query: any, topResultsNum: number) =>
    taskListService.taskNames().slice(0, topResultsNum)

  return {
    task_creation,
    prioritization,
    execution,
  }
}
