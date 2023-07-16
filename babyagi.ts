import chalk from 'chalk'
import { cli } from 'cleye'
import * as dotenv from 'dotenv'
import prompt from 'prompts'
import invariant from 'tiny-invariant'
import { createAgentRunner } from './services/agent_runner.js'
import { createOpenAiService } from './services/llm_openai.js'
dotenv.config()

const possibleModels = ['gpt-3.5-turbo', 'gpt-4'] as const
type Models = (typeof possibleModels)[number]

function Model(model: Models) {
  if (!possibleModels.includes(model)) {
    throw new Error(`Invalid model: "${model}"`)
  }
  return model
}

const main = async () => {
  invariant(process.env.OPENAI_API_KEY, 'No OpenAI API key provided.')

  // モデルの設定
  const argv = cli({
    name: 'babyagi',
    flags: {
      model: {
        type: Model,
        description: 'OpenAI API Model',
        default: 'gpt-3.5-turbo',
      },
    },
  })
  const model = argv.flags.model

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
