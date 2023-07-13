import {
  Configuration,
  OpenAIApi,
  type ChatCompletionRequestMessage,
} from 'openai'

export interface OpenAiServiceOptions {
  apiKey: string
  organizationId?: string
  model?: string
}

export const createOpenAiService = ({
  apiKey,
  organizationId,
  model = 'gpt-3.5-turbo',
}: OpenAiServiceOptions) => {
  // Configure OpenAI
  const configuration = new Configuration({
    apiKey,
    organization: organizationId,
  })
  const openai = new OpenAIApi(configuration)

  const completion = async ({
    prompt,
    temperature = 0.5,
    maxTokens = 100,
  }: {
    prompt: string
    temperature?: number
    maxTokens?: number
  }) => {
    const messages = [
      { role: 'system', content: prompt },
    ] satisfies ChatCompletionRequestMessage[]
    const response = await openai.createChatCompletion({
      model,
      messages: messages,
      max_tokens: maxTokens,
      temperature: temperature,
      n: 1,
    })
    return response.data.choices[0].message?.content?.trim()
  }

  return {
    completion,
  }
}
