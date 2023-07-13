import * as dotenv from 'dotenv'
import {
  Configuration,
  OpenAIApi,
  type ChatCompletionRequestMessage,
} from 'openai'
import invariant from 'tiny-invariant'
dotenv.config()

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
invariant(OPENAI_API_KEY, 'OPENAI_API_KEY should be defined')

export const OPENAI_API_MODEL = process.env.OPENAI_API_MODEL || 'gpt-3.5-turbo'

// Configure OpenAI
const configuration = new Configuration({
  apiKey: OPENAI_API_KEY,
  organization: process.env.OPENAI_API_ORGANIZATION_ID,
})
const openai = new OpenAIApi(configuration)

export const openai_completion = async ({
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
    model: OPENAI_API_MODEL,
    messages: messages,
    max_tokens: maxTokens,
    temperature: temperature,
    n: 1,
  })
  return response.data.choices[0].message?.content?.trim()
}
