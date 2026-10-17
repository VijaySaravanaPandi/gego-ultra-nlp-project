import type { URL } from 'url';
import { Message } from './message';

export function extractPUIDsFromResponse(res: string): string[] {
	const regexp = /[ \(\[]PUID: ?\d+[ \)\]]/g;
	const matches = res.match(regexp);
	if (matches == null) {
		return [];
	} else {
		let stringPUIDs = [...matches.map((r) => String(r))];
		stringPUIDs = [...new Set(stringPUIDs)];
		return [...stringPUIDs.sort((a, b) => PUIDToIdx(a) - PUIDToIdx(b))];
	}
}

export function PUIDToIdx(PUID: string): number {
	const regexp = /\d+/g;
	const match = PUID.match(regexp);
	if (!match || match.length === 0) {
		return -1;
	}
	const n = Number(match[0]);
	return isNaN(n) ? -1 : n;
}

export function formatHistory(
	userInputs: string[],
	searchQueries: string[],
	prompts: string[],
	modelResponses: string[]
): string {
	let outputStrings: string[] = [];

	userInputs.map((userInput, idx) => {
		outputStrings.push(`# Input
${userInput}

# Search query
${searchQueries[idx]}

# Prompt
${prompts[idx]}

# System output
${modelResponses[idx]}

------------------------`);
	});

	return outputStrings.join('\n\n');
}

export interface FilterItem {
	key: string;
	match: { value: string };
}

export interface ParsedFilters {
	must: FilterItem[];
}

export function parseURLParamsToFilters(url: URL): ParsedFilters {
	const searchParams = url.searchParams;
	const must: FilterItem[] = [];
	const targetKeys = ['collection_id', 'volume_id'];
	for (const [key, value] of searchParams) {
		if (targetKeys.includes(key)) {
			must.push({ key, match: { value } });
		}
	}
	return { must };
}
