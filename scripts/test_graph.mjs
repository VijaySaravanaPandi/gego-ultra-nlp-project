import { StateGraph, Annotation, END, START } from '@langchain/langgraph';
import { ChatGroq } from '@langchain/groq';
import weaviate from 'weaviate-client';
import { pipeline } from '@xenova/transformers';

const AgentState = Annotation.Root({
	userQuery: Annotation(),
	searchQuery: Annotation(),
	papers: Annotation({ reducer: (_, b) => b, default: () => [] }),
	answer: Annotation(),
	retryCount: Annotation({ reducer: (_, b) => b, default: () => 0 }),
	isRelevant: Annotation(),
	isGrounded: Annotation()
});

const apiKey = process.env.GROQ_API_KEY;
const modelID = 'openai/gpt-oss-120b';

function getLLM() {
  return new ChatGroq({ apiKey, model: modelID, temperature: 0, maxRetries: 2 });
}

let extractorInstance = null;
async function getQueryEmbedding(text) {
  if (!extractorInstance) {
    extractorInstance = await pipeline('feature-extraction', 'Snowflake/snowflake-arctic-embed-s');
  }
  const output = await extractorInstance(
    'Represent this sentence for searching relevant passages:  +  ' + text,
    { pooling: 'cls', normalize: false }
  );
  return output.tolist()[0];
}

async function rewriteQuery(state) {
  console.log('[Graph] rewriteQuery called with:', state.userQuery);
  const llm = getLLM();
  const prompt = `Convert the following user question into a concise, plain-language query: ${state.userQuery}`;
  const res = await llm.invoke(prompt);
  return { searchQuery: res.content };
}

async function searchWeaviate(state) {
  console.log('[Graph] searchWeaviate called with:', state.searchQuery);
  const host = process.env.WEAVIATE_URL.replace(/^https?:\/\//, '');
  const client = await weaviate.connectToWeaviateCloud(host, {
    authCredentials: new weaviate.ApiKey(process.env.WEAVIATE_API_KEY)
  });
  const collection = client.collections.get(process.env.WEAVIATE_COLLECTION_NAME);
  const vector = await getQueryEmbedding(state.searchQuery || state.userQuery);
  const result = await collection.query.hybrid(state.searchQuery, {
    vector,
    limit: 5,
    returnMetadata: ['score'],
    returnProperties: ['title', 'paper_title', 'authors', 'year', 'venue', 'abstract', 'puid']
  });
  await client.close();
  console.log('[Graph] searchWeaviate found:', result.objects.length);
  return { papers: result.objects };
}

async function gradeDocs(state) {
  console.log('[Graph] gradeDocs called, papers:', state.papers.length);
  return { isRelevant: true };
}

async function generateAnswer(state) {
  console.log('[Graph] generateAnswer called');
  const llm = getLLM();
  const res = await llm.invoke(`Summarize answer for query: ${state.userQuery}`);
  return { answer: res.content };
}

async function gradeAnswer(state) {
  console.log('[Graph] gradeAnswer called');
  return { isGrounded: true };
}

const graph = new StateGraph(AgentState)
  .addNode('rewriteQuery', rewriteQuery)
  .addNode('searchWeaviate', searchWeaviate)
  .addNode('gradeDocs', gradeDocs)
  .addNode('generateAnswer', generateAnswer)
  .addNode('gradeAnswer', gradeAnswer)
  .addEdge(START, 'rewriteQuery')
  .addEdge('rewriteQuery', 'searchWeaviate')
  .addEdge('searchWeaviate', 'gradeDocs')
  .addConditionalEdges('gradeDocs', (s) => (s.isRelevant ? 'generateAnswer' : 'rewriteQuery'))
  .addEdge('generateAnswer', 'gradeAnswer')
  .addConditionalEdges('gradeAnswer', (s) => (s.isGrounded ? END : 'generateAnswer'))
  .compile();

console.log('Graph compiled. Invoking...');
const result = await graph.invoke({
  userQuery: 'What is ROUGE-K?',
  searchQuery: 'What is ROUGE-K?',
  retryCount: 0
});
console.log('Graph Result:', result.answer);
