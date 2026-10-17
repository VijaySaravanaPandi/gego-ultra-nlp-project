import weaviate from 'weaviate-client';
import { pipeline } from '@xenova/transformers';

const extractor = await pipeline('feature-extraction', 'Snowflake/snowflake-arctic-embed-s');
const output = await extractor('Represent this sentence for searching relevant passages: What is ROUGE-K?', {
  pooling: 'cls',
  normalize: false
});
const vector = output.tolist()[0];

const host = process.env.WEAVIATE_URL.replace(/^https?:\/\//, '');
const client = await weaviate.connectToWeaviateCloud(host, {
  authCredentials: new weaviate.ApiKey(process.env.WEAVIATE_API_KEY)
});
const collection = client.collections.get(process.env.WEAVIATE_COLLECTION_NAME);

console.log('Testing hybrid search...');
try {
  const result = await collection.query.hybrid('What is ROUGE-K?', {
    vector,
    limit: 5,
    returnMetadata: ['score', 'explainScore'],
    returnProperties: ['title', 'paper_title', 'authors', 'year', 'venue', 'abstract', 'puid']
  });
  console.log('Hybrid result count:', result.objects.length);
  console.log('Top paper:', result.objects[0]?.properties?.title);
} catch (e) {
  console.error('Hybrid search error:', e);
}

await client.close();
