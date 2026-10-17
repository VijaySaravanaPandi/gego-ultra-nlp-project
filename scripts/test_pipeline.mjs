
import { ChatGroq } from '@langchain/groq';
import weaviate from 'weaviate-client';

const apiKey = process.env.GROQ_API_KEY;
const weaviateUrl = process.env.WEAVIATE_URL;
const weaviateApiKey = process.env.WEAVIATE_API_KEY;
const collectionName = process.env.WEAVIATE_COLLECTION_NAME;

console.log('Testing step 1: Groq rewrite...');
const llm = new ChatGroq({ apiKey, model: 'openai/gpt-oss-120b', temperature: 0 });
const rewriteRes = await llm.invoke('Convert the following user question into a concise, plain-language query: What is ROUGE-K?');
console.log('Step 1 Groq result:', rewriteRes.content);

console.log('Testing step 2: Weaviate search...');
const host = weaviateUrl.replace(/^https?:\/\//, '');
const client = await weaviate.connectToWeaviateCloud(host, {
  authCredentials: new weaviate.ApiKey(weaviateApiKey)
});
const collection = client.collections.get(collectionName);
console.log('Weaviate connected. Querying BM25...');
const bm25Res = await collection.query.bm25(rewriteRes.content, {
  limit: 5,
  returnProperties: ['title', 'paper_title', 'authors', 'year', 'venue', 'abstract', 'puid']
});
console.log('Step 2 BM25 count:', bm25Res.objects.length);
if (bm25Res.objects.length > 0) {
  console.log('First paper:', bm25Res.objects[0].properties.title);
}

await client.close();
console.log('All steps passed!');
