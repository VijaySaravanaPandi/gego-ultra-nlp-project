import { ChatOllama } from '@langchain/ollama';
import { json } from '@sveltejs/kit';
import { GROQ_API_KEY } from '$env/static/private';
import Groq from 'groq-sdk';
import { ModelType } from '$lib/llm';

export const _generate = async (
	message: string,
	modelType: ModelType,
	modelID: string | null = null
): Promise<string> => {
	if (modelID === null) {
		if (modelType === ModelType.ollama) {
			modelID = 'gemma2:2b';
		} else {
			modelID = 'openai/gpt-oss-120b';
		}
	}

	let responseStr = '';
	if (modelType === ModelType.ollama) {
		const ollama = new ChatOllama({
			model: modelID,
			temperature: 0,
			maxRetries: 0
		});
		const response = await ollama.invoke([['user', message]]);
		responseStr = response.content as string;
	} else if (modelType === ModelType.groq) {
		const groq = new Groq({ apiKey: GROQ_API_KEY });
		const response = await groq.chat.completions.create({
			model: modelID,
			messages: [{ role: 'user', content: message }]
		});
		responseStr = response.choices[0].message.content ?? '';
	}
	return responseStr;
};

export async function POST({ request }) {
	const j = await request.json();
	const message: string = j['message'];

	let _modelType: string = j['modelType'];
	if (_modelType === null) {
		_modelType = 'groq';
	}
	const modelType = ModelType[_modelType as keyof typeof ModelType];
	const modelID = j['modelID'];

	const out = await _generate(message, modelType, modelID);
	return json({ content: out }, { status: 201 });
}
