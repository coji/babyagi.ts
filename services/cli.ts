import { cli } from 'cleye'

const possibleModels = ['gpt-3.5-turbo', 'gpt-4'] as const
type Models = (typeof possibleModels)[number]

const Model = (model: Models) => {
  if (!possibleModels.includes(model)) {
    throw new Error(`Invalid model: "${model}"`)
  }
  return model
}

export const parseCommandLineParameters = () => {
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

  return argv.flags
}
