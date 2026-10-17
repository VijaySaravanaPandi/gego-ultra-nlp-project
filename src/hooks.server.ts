export function handleError({ error, event }: { error: any; event: any }) {
	console.error('SERVER HOOK ERROR:', error);
	return {
		message: error?.message || String(error),
		stack: error?.stack
	};
}
