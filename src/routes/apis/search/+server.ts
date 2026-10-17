import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { runAgenticRAG } from '$lib/agenticRAG';

const PROMPTER_INST = `You are a helpful search assistant.
Your task is to deliver a concise and accurate response to a user's query, drawing from the given research papers.
Your answer must be precise, of high-quality, and written by an expert using an unbiased and journalistic tone.
It is EXTREMELY IMPORTANT to directly answer the query. NEVER say 'based on the search results' or start your answer with a heading or title.
Get straight to the point.
Your answer MUST be less than 150 words.

You MUST cite the relevant papers that answer the query.
Use PUIDs to cite the relevant papers AT THE END of a sentence.
Do not mention any irrelevant papers.
You MUST ADHERE to the following instructions for citing papers:
	to cite a paper, enclose relevant paper's PUIDs at the end of the output sentence, like '(PUID:1)(PUID:3)'
	NO SPACE between the last word and the citation, and ALWAYS use brackets. Only use this format with PUIDs to cite search results.
	DO NOT write a References section.
	Ignore the papers that are not relevant to the query.
You MUST ADHERE to the following formatting instructions:
	Use headings level 2 and 3 to separate sections of your response, like '## Header', but NEVER start an answer with a heading or title of any kind (i.e. Never start with #).
	Use single new lines for lists and double new lines for paragraphs.
	NEVER write URLs or links.`;

export async function POST({ request }) {
	try {
		const j = await request.json();
		const vector: number[] = j['vector'];
		const limit: number = Number(j['limit']) || 5;
		const filters = j['filters'] || null;
		const userQuery: string = (j['userQuery'] || '').trim();
		const modelID: string = j['modelID'] ?? 'openai/gpt-oss-120b';

		if (!userQuery) {
			return json({ answer: 'Please enter a search query.', searchedPapers: [] }, { status: 200 });
		}

		const groqApiKey = env.GROQ_API_KEY || process.env.GROQ_API_KEY || '';
		const weaviateUrl = env.WEAVIATE_URL || process.env.WEAVIATE_URL || '';
		const weaviateApiKey = env.WEAVIATE_API_KEY || process.env.WEAVIATE_API_KEY || '';
		const collectionName = env.WEAVIATE_COLLECTION_NAME || process.env.WEAVIATE_COLLECTION_NAME || 'Papers';

		const { answer, papers } = await runAgenticRAG(userQuery, {
			groqApiKey,
			modelID,
			weaviateUrl,
			weaviateApiKey,
			collectionName,
			vector,
			limit,
			filters,
			prompterInst: PROMPTER_INST
		});

		// Normalise paper shape to match what the frontend expects
		const searchedPapers = (papers || []).map((p) => ({
			payload: p.payload,
			score: p.score
		}));

		return json({ answer, searchedPapers }, { status: 200 });
	} catch (err: any) {
		console.error('[API /apis/search ERROR]:', err);
		return json({ 
			answer: 'An error occurred while processing your request. Please try again.',
			searchedPapers: [],
			error: err?.message || String(err)
		}, { status: 200 });
	}
}
