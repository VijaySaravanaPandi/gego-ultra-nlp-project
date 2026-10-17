<script>
	import { marked } from 'marked';
	import Icon from '@iconify/svelte';

	export let msg;
	export let papers;

	let copied = false;

	const handleCopyClick = () => {
		try {
			const aTagRegexp = /<a.+a>/g;
			const matches = msg.content.match(aTagRegexp);
			let content = msg.content;
			if (matches && papers?.papers) {
				const uniqueMatches = [...new Set(matches)];
				uniqueMatches.forEach((match) => {
					let regexp = /\[(\d+)\]/;
					const m = match.match(regexp);
					if (m && m[1]) {
						let targetPaper = papers.papers[Number(m[1]) - 1];
						if (targetPaper) {
							content = content.replaceAll(
								match,
								` ([${targetPaper.paperTitle || 'Paper'}](https://gengo.sotaro.io/${targetPaper.url}))`
							);
						}
					}
				});
			}
			// Strip any remaining html tags for clipboard
			const cleanText = content.replace(/<[^>]*>/g, '');
			navigator.clipboard.writeText(cleanText);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (e) {
			console.error('Copy failed:', e);
		}
	};
</script>

<div class="flex items-start gap-3 my-4">
	<div class="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
		<Icon icon="lucide:sparkles" class="w-4 h-4" />
	</div>
	<div class="flex-1 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
		<div class="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
			<div class="flex items-center gap-2">
				<span class="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
					GenGO AI · Synthesis
				</span>
			</div>

			<button
				class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
				on:click={handleCopyClick}
				title="Copy response"
			>
				{#if copied}
					<Icon icon="lucide:check" class="w-3.5 h-3.5 text-emerald-600" />
					<span class="text-emerald-600 font-semibold">Copied!</span>
				{:else}
					<Icon icon="lucide:copy" class="w-3.5 h-3.5" />
					<span>Copy</span>
				{/if}
			</button>
		</div>

		<div
			class="
				system-prose
				prose
				prose-slate
				max-w-none
				text-[15px]
				leading-relaxed
				text-slate-800
				prose-headings:text-slate-900
				prose-headings:font-bold
				prose-p:text-slate-800
				prose-p:leading-relaxed
				prose-strong:text-slate-900
				prose-strong:font-semibold
				prose-ul:text-slate-800
				prose-li:text-slate-800
				prose-code:text-indigo-600
				prose-code:bg-indigo-50
				prose-code:px-1.5
				prose-code:py-0.5
				prose-code:rounded
			"
		>
			{@html marked(msg.content)}
		</div>
	</div>
</div>

<style>
	:global(.system-prose a[href^='#pp-']) {
		display: inline-flex;
		align-items: center;
		padding: 0.125rem 0.375rem;
		margin: 0 0.15rem;
		font-size: 0.75rem;
		font-weight: 600;
		line-height: 1;
		border-radius: 9999px;
		background-color: #eef2ff;
		color: #4f46e5;
		border: 1px solid #c7d2fe;
		text-decoration: none;
		transition: all 0.15s ease-in-out;
		vertical-align: middle;
	}
	:global(.system-prose a[href^='#pp-']:hover) {
		background-color: #4f46e5;
		color: #ffffff;
		border-color: #4338ca;
		box-shadow: 0 1px 3px rgba(79, 70, 229, 0.3);
	}
</style>
