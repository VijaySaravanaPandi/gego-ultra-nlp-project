import { json } from '@sveltejs/kit';
import { GROQ_API_KEY } from '$env/static/private';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: GROQ_API_KEY });

export async function POST({ request }) {
	const j = await request.json();
	const message: string = j['message'];

	const response = await groq.chat.completions.create({
		model: 'openai/gpt-oss-120b',
		messages: [{ role: 'user', content: message }]
	});

	const output: string = response.choices[0]?.message?.content ?? '';

	return json({ content: output }, { status: 201 });
}
