import chalk from 'chalk'
import type { Collection } from 'chromadb'
import * as dotenv from 'dotenv'
import prompt from 'prompts'
import { setTimeout } from 'timers/promises'
import invariant from 'tiny-invariant'
import { chromaConnect, embeddingFunction } from './src/chromadb.js'
import { OPENAI_API_MODEL, openai_completion } from './src/openai.js'
dotenv.config()

// Table config
const TABLE_NAME = process.env.TABLE_NAME || 'tasks'

// Run config
const BABY_NAME = process.env.BABY_NAME || 'BabyAGI'

// Goal config
const { OBJECTIVE } = await prompt({
  name: 'OBJECTIVE',
  type: 'text',
  message: "What is BabyAGI's objective?",
})
//const OBJECTIVE = p("What is BabyAGI's objective? ")
const { INITIAL_TASK } = await prompt({
  name: 'INITIAL_TASK',
  type: 'text',
  message: 'What is the initial task to complete the objective? ',
})
invariant(OBJECTIVE, 'No objective provided.')
invariant(INITIAL_TASK, 'No initial task provided.')

console.log(chalk.magentaBright.bold('\n*****CONFIGURATION*****\n'))
console.log(`Name: ${BABY_NAME}`)
console.log(`LLM: ${OPENAI_API_MODEL}`)

console.log(chalk.blueBright.bold('\n*****OBJECTIVE*****\n'))
console.log(`${OBJECTIVE}`)

console.log(chalk.yellowBright.bold(`\nInitial task: ${INITIAL_TASK}`))

interface Task {
  taskId: number
  taskName: string
}

//Task List
var taskList: Task[] = []

const add_task = (task: Task) => {
  taskList.push(task)
}

const clear_tasks = () => {
  taskList = []
}

const task_creation_agent = async (
  objective: string,
  result: string | undefined,
  task_description: string,
  taskList: Task[],
) => {
  const prompt = `
        You are an task creation AI that uses the result of an execution agent to create new tasks with the following objective: ${objective}, 
        The last completed task has the result: ${result}. 
        This result was based on this task description: ${task_description}. 
        These are incomplete tasks: ${taskList
          .map((task) => `${task.taskId}: ${task.taskName}`)
          .join(', ')}. 
        Based on the result, create new tasks to be completed by the AI system that do not overlap with incomplete tasks. 
        Return the tasks as an array.`
  const response = await openai_completion(prompt)
  if (!response) {
    return
  }
  const newTasks = response.trim().includes('\n')
    ? response.trim().split('\n')
    : [response.trim()]
  return newTasks
}

const prioritization_agent = async (taskId: number) => {
  const taskNames = taskList.map((task) => task.taskName)
  const nextTaskId = taskId + 1
  const prompt = `
    You are an task prioritization AI tasked with cleaning the formatting of and re-prioritizing the following tasks: ${taskNames}. 
    Consider the ultimate objective of your team:${OBJECTIVE}. Do not remove any tasks. Return the result as a numbered list, like:
    #. First task
    #. Second task
    Start the task list with number ${nextTaskId}.`
  const response = await openai_completion(prompt)
  if (!response) {
    throw new Error('No response from OpenAI')
  }
  const newTasks = response.trim().includes('\n')
    ? response.trim().split('\n')
    : [response.trim()]
  clear_tasks()
  newTasks.forEach((newTask) => {
    const newTaskParts = newTask.trim().split(/\.(?=\s)/)
    if (newTaskParts.length == 2) {
      const newTaskId = Number(newTaskParts[0].trim())
      const newTaskName = newTaskParts[1].trim()
      add_task({
        taskId: newTaskId,
        taskName: newTaskName,
      })
    }
  })
}

const execution_agent = async (
  objective: string,
  task: string,
  chromaCollection: Collection,
) => {
  const context = await context_agent(objective, 5, chromaCollection)
  const prompt = `
    You are an AI who performs one task based on the following objective: ${objective}.\n
    Take into account these previously completed tasks: ${context}.\n
    Your task: ${task}\nResponse:`
  const response = await openai_completion(prompt, undefined, 2000)
  return response
}

const context_agent = async (
  query: any,
  topResultsNum: number,
  chromaCollection: Collection,
) => {
  const count = await chromaCollection.count()
  if (count == 0) {
    return []
  }
  const results = await chromaCollection.query({
    queryEmbeddings: undefined,
    nResults: Math.min(topResultsNum, count),
    where: undefined,
    queryTexts: query,
  })
  return results.metadatas[0].map((item) => item?.task)
}

const main = async () => {
  const initialTask = {
    taskId: 1,
    taskName: INITIAL_TASK,
  }
  add_task(initialTask)

  const chromaCollection = await chromaConnect(TABLE_NAME)
  var taskIdCounter = 1
  while (true) {
    if (taskList.length > 0) {
      console.log(chalk.magentaBright.bold('\n*****TASK LIST*****\n'))
      taskList.forEach((t) => {
        console.log(' • ' + t.taskName)
      })

      // Step 1: Pull the first task
      const task = taskList.shift()
      if (!task) {
        return
      }
      console.log(chalk.green.bold('\n*****NEXT TASK*****\n'))
      console.log(task.taskId + ': ' + task.taskName)

      // Send to execution function to complete the task based on the context
      const result = await execution_agent(
        OBJECTIVE,
        task.taskName,
        chromaCollection,
      )
      const currTaskId = task.taskId
      console.log(chalk.yellow.bold('\nTASK RESULT\n'))
      console.log(result)

      // Step 2: Enrich result and store in Chroma
      const enrichedResult = { data: result } // this is where you should enrich the result if needed
      const resultId = `result_${task.taskId}`
      const vector = enrichedResult.data // extract the actual result from the dictionary
      const collectionLength = (await chromaCollection.get({ ids: [resultId] }))
        .ids?.length
      if (collectionLength > 0 && vector && result) {
        await chromaCollection.update({
          ids: [resultId],
          documents: vector,
          metadatas: { task: task.taskName, result: result },
          embeddings: undefined,
        })
      } else {
        await chromaCollection.add({
          ids: [resultId],
          documents: vector,
          metadatas: [{ task: task.taskName }, { result: result ?? '' }],
          embeddings: undefined,
        })
      }

      // Step 3: Create new tasks and re-prioritize task list
      const newTasks = await task_creation_agent(
        OBJECTIVE,
        enrichedResult.data,
        task.taskName,
        taskList,
      )
      if (newTasks) {
        for (const task of newTasks) {
          add_task({
            taskId: taskIdCounter++,
            taskName: task,
          })
        }
      }
      await prioritization_agent(currTaskId)
      await setTimeout(3000)
    }
  }
}

await main()
