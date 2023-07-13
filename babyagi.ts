import chalk from 'chalk'
import * as dotenv from 'dotenv'
import prompt from 'prompts'
import invariant from 'tiny-invariant'
import { createAgentRunner } from './services/agent_runner.js'
import { OPENAI_API_MODEL } from './services/openai.js'
dotenv.config()

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

const main = async () => {
  const runner = createAgentRunner(OBJECTIVE, INITIAL_TASK)
  await runner.run()
}

await main()
