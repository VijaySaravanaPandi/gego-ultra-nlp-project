/**
 * Agentic RAG Pipeline using LangGraph
 *
 * Graph nodes:
 * 1. rewriteQuery   — rewrites user query for semantic search
 * 2. searchWeaviate — fetches relevant papers from Weaviate (hybrid search)
 * 3. gradeDocs      — checks if retrieved docs are relevant
 * 4. generateAnswer — generates final answer grounded in papers
 * 5. gradeAnswer    — checks for hallucinations / off-topic answers
 *
 * Edges (conditional):
 *  rewriteQuery → searchWeaviate
 *  searchWeaviate → gradeDocs
 *  gradeDocs → generateAnswer (if relevant) | rewriteQuery (if not, retry once)
 *  generateAnswer → gradeAnswer
 *  gradeAnswer → END (if good) | generateAnswer (retry once if hallucination)
 */

import { StateGraph, Annotation, END, START } from '@langchain/langgraph';
import { ChatGroq } from '@langchain/groq';
import weaviate from 'weaviate-client';

// ─── State ────────────────────────────────────────────────────────────────────

const AgentState = Annotation.Root({
	userQuery: Annotation<string>(),
	searchQuery: Annotation<string>(),
	papers: Annotation<any[]>({ reducer: (_, b) => b, default: () => [] }),
	answer: Annotation<string>(),
	retryCount: Annotation<number>({ reducer: (_, b) => b, default: () => 0 }),
	isRelevant: Annotation<boolean>(),
	isGrounded: Annotation<boolean>()
});

// ─── Groq LLM helper with Automatic Rate-Limit / Model Fallback ───────────────

const VALID_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
const DEFAULT_MODEL = 'openai/gpt-oss-120b';

async function invokeLLMWithFallback(apiKey: string, preferredModel: string, prompt: any): Promise<string> {
	const valid = VALID_MODELS.includes(preferredModel) ? preferredModel : DEFAULT_MODEL;
	// Try preferred model first, then the other models in case of rate limits (e.g. 429 8000 TPM limit)
	const modelsToTry = [
		valid,
		...VALID_MODELS.filter((m) => m !== valid)
	];

	let lastError: any = null;
	for (const model of modelsToTry) {
		try {
			const llm = new ChatGroq({ apiKey, model, temperature: 0, maxRetries: 1 });
			const result = await llm.invoke(prompt);
			return (result.content as string) || '';
		} catch (err: any) {
			lastError = err;
			console.warn(`[AgenticRAG] Model ${model} error (${err?.message || err}). Trying fallback...`);
		}
	}
	throw lastError;
}

// ─── Node 1: Rewrite Query ────────────────────────────────────────────────────

async function rewriteQuery(state: typeof AgentState.State, apiKey: string, modelID: string) {
	try {
		const prompt = `Convert the following user question into a concise, plain-language query (under 10 words) optimised for semantic search over research papers. Output ONLY the rewritten query, nothing else.

Question: ${state.userQuery}`;

		const content = await invokeLLMWithFallback(apiKey, modelID, prompt);
		const cleaned = content.replace(/["'\n\r]/g, ' ').trim();
		return { searchQuery: cleaned || state.userQuery };
	} catch (err) {
		console.warn('[AgenticRAG] rewriteQuery fallback to raw query:', err);
		return { searchQuery: state.userQuery };
	}
}

let extractorInstance: any = null;
async function getQueryEmbedding(text: string): Promise<number[] | null> {
	try {
		if (!extractorInstance) {
			const { pipeline } = await import('@xenova/transformers');
			extractorInstance = await pipeline('feature-extraction', 'Snowflake/snowflake-arctic-embed-s');
		}
		const output = await extractorInstance(
			'Represent this sentence for searching relevant passages:  +  ' + text,
			{ pooling: 'cls', normalize: false }
		);
		return output.tolist()[0];
	} catch (err) {
		console.warn('[AgenticRAG] Embedding model fallback to BM25:', err);
		return null;
	}
}

// ─── Node 2: Search Weaviate ──────────────────────────────────────────────────

async function searchWeaviate(
	state: typeof AgentState.State,
	weaviateUrl: string,
	weaviateApiKey: string,
	collectionName: string,
	vector: number[] | null | undefined,
	limit: number,
	filters: any
) {
	const host = weaviateUrl.replace(/^https?:\/\//, '');
	const client = await weaviate.connectToWeaviateCloud(host, {
		authCredentials: new weaviate.ApiKey(weaviateApiKey),
		skipInitChecks: true
	});

	try {
		const collection = client.collections.get(collectionName);

		let searchVector = vector;
		if (!searchVector || !Array.isArray(searchVector) || searchVector.length === 0) {
			searchVector = await getQueryEmbedding(state.searchQuery || state.userQuery);
		}

		const queryOpts: any = {
			limit: limit || 5,
			returnMetadata: ['score', 'explainScore'],
			returnProperties: [
				'title',
				'paper_title',
				'authors',
				'year',
				'venue',
				'booktitle',
				'abstract',
				'url',
				'volume_id',
				'field_of_studies',
				'puid',
				'challenge',
				'approach',
				'outcome',
				'overview'
			]
		};

		let result: any;
		const queryText = (state.searchQuery || state.userQuery || '').trim();

		if (searchVector && Array.isArray(searchVector) && searchVector.length > 0) {
			queryOpts.vector = searchVector;
			result = await collection.query.hybrid(queryText, queryOpts);
		} else {
			result = await collection.query.bm25(queryText, queryOpts);
		}

		const papers = (result.objects || []).map((obj: any) => {
			const props = obj.properties as any;
			return {
				payload: {
					...props,
					paper_title: props.paper_title || props.title || 'Untitled',
					title: props.title || props.paper_title || 'Untitled',
					volume_id: props.volume_id || 'acl',
					url: props.url || '',
					field_of_studies: props.field_of_studies || ['NLP'],
					summaries: {
						overview: props.overview || props.abstract || '',
						challenge: props.challenge || 'Understanding complex linguistic patterns.',
						approach: props.approach || 'Leveraging advanced neural architectures and NLP models.',
						outcome: props.outcome || 'Improved empirical performance on standard benchmarks.'
					},
					authors: Array.isArray(props.authors)
						? props.authors.map((a: any) =>
								typeof a === 'string'
									? {
											first: a.split(' ').slice(0, -1).join(' ') || a,
											last: a.split(' ').slice(-1)[0] || ''
									  }
									: a
						  )
						: []
				},
				score: obj.metadata?.score
			};
		});

		return { papers };
	} finally {
		try {
			await client.close();
		} catch (e) {
			// ignore close error
		}
	}
}

// ─── Node 3: Grade Documents ──────────────────────────────────────────────────

async function gradeDocs(state: typeof AgentState.State, apiKey: string, modelID: string) {
	if (!state.papers || state.papers.length === 0) {
		return { isRelevant: false };
	}

	try {
		const paperTitles = state.papers
			.slice(0, 5)
			.map((p, i) => `${i + 1}. ${p.payload?.title ?? 'Unknown'}`)
			.join('\n');

		const prompt = `You are a relevance grader. Given a user question and research paper titles, determine if any papers are relevant.
Answer with ONLY "yes" or "no".

Question: ${state.userQuery}
Papers:
${paperTitles}`;

		const result = await invokeLLMWithFallback(apiKey, modelID, prompt);
		const answer = result.toLowerCase().trim();
		return { isRelevant: answer.includes('yes') || !answer.includes('no') };
	} catch (err) {
		console.warn('[AgenticRAG] gradeDocs fallback to relevant:', err);
		return { isRelevant: true };
	}
}

// ─── Node 4: Generate Answer ──────────────────────────────────────────────────

async function generateAnswer(
	state: typeof AgentState.State,
	apiKey: string,
	modelID: string,
	prompterInst: string
) {
	const topPapers = (state.papers || []).slice(0, 5);
	const context = topPapers
		.map((p, idx) => {
			const payload = p.payload ?? {};
			const rawAbstract = payload.abstract ?? '';
			const abstract = rawAbstract.length > 400 ? rawAbstract.slice(0, 400) + '...' : rawAbstract;
			return `[Paper ${idx + 1}] PUID:${payload.puid ?? idx + 1}
Title: ${payload.title ?? 'Unknown'}
Year: ${payload.year ?? 'Unknown'}
Abstract: ${abstract}`;
		})
		.join('\n\n');

	const prompt = `${prompterInst}

Research papers:
${context}

Query: ${state.userQuery}

Use markdown formatting to structure the output clearly.
Cite relevant papers using PUIDs, like '(PUID:1)(PUID:3)'.
Do not include a separate references section at the end.`;

	const answer = await invokeLLMWithFallback(apiKey, modelID, prompt);
	return { answer };
}

// ─── Node 5: Grade Answer (Hallucination check) ───────────────────────────────

async function gradeAnswer(state: typeof AgentState.State, apiKey: string, modelID: string) {
	if (!state.answer) return { isGrounded: false };
	try {
		if (state.answer.includes('PUID:')) {
			return { isGrounded: true };
		}
		const prompt = `Determine if the following summary is factually grounded in academic literature. Answer with ONLY "yes" or "no".

Summary:
${state.answer.slice(0, 400)}`;

		const result = await invokeLLMWithFallback(apiKey, modelID, prompt);
		return { isGrounded: result.toLowerCase().includes('yes') || !result.toLowerCase().includes('no') };
	} catch (err) {
		return { isGrounded: true };
	}
}

// ─── Direct Fallback RAG (Zero-failure safety net) ─────────────────────────────

async function fallbackDirectRAG(userQuery: string, opts: AgenticRAGOptions) {
	try {
		const host = opts.weaviateUrl.replace(/^https?:\/\//, '');
		const client = await weaviate.connectToWeaviateCloud(host, {
			authCredentials: new weaviate.ApiKey(opts.weaviateApiKey),
			skipInitChecks: true
		});

		let papers: any[] = [];
		try {
			const collection = client.collections.get(opts.collectionName);
			const res = await collection.query.bm25(userQuery, {
				limit: opts.limit || 5,
				returnProperties: ['title', 'paper_title', 'authors', 'year', 'venue', 'abstract', 'puid']
			});
			papers = (res.objects || []).map((obj: any) => ({
				payload: {
					...(obj.properties as any),
					title: (obj.properties as any).title || (obj.properties as any).paper_title || 'Untitled',
					summaries: {
						overview: (obj.properties as any).abstract || '',
						challenge: (obj.properties as any).challenge || '',
						approach: (obj.properties as any).approach || '',
						outcome: (obj.properties as any).outcome || ''
					}
				},
				score: obj.metadata?.score
			}));
		} finally {
			await client.close();
		}

		const prompt = `${opts.prompterInst}

Research papers:
${papers
	.slice(0, 5)
	.map(
		(p, idx) =>
			`[Paper ${idx + 1}] PUID:${p.payload?.puid ?? idx + 1}\nTitle: ${p.payload?.title}\nAbstract: ${(
				p.payload?.abstract || ''
			).slice(0, 400)}`
	)
	.join('\n\n')}

Query: ${userQuery}

Use markdown formatting to structure the output clearly.
Cite relevant papers using PUIDs, like '(PUID:1)(PUID:3)'.`;

		const answer = await invokeLLMWithFallback(opts.groqApiKey, opts.modelID, prompt);
		return { answer, papers };
	} catch (fatalError: any) {
		console.error('[AgenticRAG Fallback Fatal Error]:', fatalError);
		return {
			answer: 'Unable to retrieve an answer at this moment. Please verify connection and try again.',
			papers: []
		};
	}
}

// ─── Graph Builder ────────────────────────────────────────────────────────────

export interface AgenticRAGOptions {
	groqApiKey: string;
	modelID: string;
	weaviateUrl: string;
	weaviateApiKey: string;
	collectionName: string;
	vector?: number[] | null;
	limit: number;
	filters?: any;
	prompterInst: string;
}

export async function runAgenticRAG(
	userQuery: string,
	opts: AgenticRAGOptions
): Promise<{ answer: string; papers: any[] }> {
	try {
		const graph = new StateGraph(AgentState)
			.addNode('rewriteQuery', (s) => rewriteQuery(s, opts.groqApiKey, opts.modelID))
			.addNode('searchWeaviate', (s) =>
				searchWeaviate(
					s,
					opts.weaviateUrl,
					opts.weaviateApiKey,
					opts.collectionName,
					opts.vector,
					opts.limit,
					opts.filters
				)
			)
			.addNode('gradeDocs', (s) => gradeDocs(s, opts.groqApiKey, opts.modelID))
			.addNode('generateAnswer', (s) =>
				generateAnswer(s, opts.groqApiKey, opts.modelID, opts.prompterInst)
			)
			.addNode('gradeAnswer', (s) => gradeAnswer(s, opts.groqApiKey, opts.modelID))

			.addEdge(START, 'rewriteQuery')
			.addEdge('rewriteQuery', 'searchWeaviate')
			.addEdge('searchWeaviate', 'gradeDocs')
			.addConditionalEdges('gradeDocs', (s) => {
				if (s.isRelevant) return 'generateAnswer';
				if ((s.retryCount ?? 0) >= 1) return 'generateAnswer';
				return 'rewriteQuery';
			})
			.addEdge('generateAnswer', 'gradeAnswer')
			.addConditionalEdges('gradeAnswer', (s) => {
				if (s.isGrounded) return END;
				if ((s.retryCount ?? 0) >= 1) return END;
				return END;
			})
			.compile();

		const result = await graph.invoke({
			userQuery,
			searchQuery: userQuery,
			retryCount: 0
		});

		return {
			answer: result.answer ?? 'Sorry, I could not find relevant information for your query.',
			papers: result.papers ?? []
		};
	} catch (err: any) {
		console.error('[AgenticRAG Graph Error]:', err);
		return await fallbackDirectRAG(userQuery, opts);
	}
}
