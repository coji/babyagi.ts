import invariant from 'tiny-invariant'
import { ChromaClient, Collection, OpenAIEmbeddingFunction } from 'chromadb'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
invariant(
  OPENAI_API_KEY,
  'OPENAI_API_KEY environment variable is missing from .env',
)

// Define OpenAI embedding function using Chroma
export const embeddingFunction = new OpenAIEmbeddingFunction({
  openai_api_key: OPENAI_API_KEY,
})

// Connect to chromadb and create/get collection
export const chromaConnect = async (table_name: string) => {
  const chroma = new ChromaClient({ path: 'http://localhost:8000' })
  const metric = 'cosine'
  const collections = await chroma.listCollections()
  const collectionNames = collections.map((c: { name: string }) => c.name)
  if (collectionNames.includes(table_name)) {
    const collection = await chroma.getCollection({
      name: table_name,
      embeddingFunction: embeddingFunction,
    })
    return collection
  } else {
    const collection = await chroma.createCollection({
      name: table_name,
      metadata: { 'hnsw:space': metric },
      embeddingFunction,
    })
    return collection
  }
}
