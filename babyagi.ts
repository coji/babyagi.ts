import chalk from 'chalk'
import * as dotenv from 'dotenv'
import prompt from 'prompts'
import invariant from 'tiny-invariant'
import { parseCommandLineParameters } from './services/cli.js'
import { createAgentRunner } from './services/agent_runner.js'
import { createOpenAiService } from './services/llm_openai.js'
dotenv.config()

const main = async () => {
  invariant(process.env.OPENAI_API_KEY, 'No OpenAI API key provided.')
  const model = parseCommandLineParameters().model

  const { objective } = await prompt({
    name: 'objective',
    type: 'text',
    message: "What is BabyAGI's objective?",
  })
  invariant(objective, 'No objective provided.')

  const { initial_task } = await prompt({
    name: 'initial_task',
    type: 'text',
    message: 'What is the initial task to complete the objective? ',
  })
  invariant(initial_task, 'No initial task provided.')

  console.log(chalk.magentaBright.bold('\n*****CONFIGURATION*****\n'))
  console.log('OpenAI API Model:', model)

  console.log(chalk.blueBright.bold('\n*****OBJECTIVE*****\n'))
  console.log(`${objective}`)

  console.log(chalk.yellowBright.bold(`\nInitial task: ${initial_task}\n`))

  const openAiService = createOpenAiService({
    apiKey: process.env.OPENAI_API_KEY,
    organizationId: process.env.OPENAI_API_ORG,
    model,
  })

  const runner = createAgentRunner(objective, initial_task, openAiService)
  await runner.run()
}

await main()
