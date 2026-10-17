<script lang="ts">
	import { Paper } from '$lib/paper';
	import Icon from '@iconify/svelte';

	export let paper: Paper;
	export let isHilighted: boolean = false;
</script>

<div
	id="pp-{paper.index}"
	class="bg-white border rounded-xl p-4 my-3 shadow-sm transition-all duration-200 text-left {isHilighted
		? 'ring-2 ring-indigo-500 border-indigo-300 bg-indigo-50/20'
		: 'border-slate-200 hover:border-slate-300 hover:shadow-md'}"
>
	<!-- Header with Index, Title, and PDF -->
	<div class="flex items-start justify-between gap-3">
		<div class="flex items-start gap-2 flex-1">
			<span class="inline-flex items-center px-2 py-0.5 text-xs font-bold rounded bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0 mt-0.5">
				[{paper.index}]
			</span>
			<div class="flex-1">
				<a
					rel="external"
					href="https://gengo.sotaro.io/{paper.url}"
					target="_blank"
					class="font-semibold text-slate-900 hover:text-indigo-600 text-sm leading-snug transition-colors"
				>
					{paper.paperTitle}
				</a>
				{#if paper.volumeId}
					<a
						rel="external"
						href="https://gengo.sotaro.io/volumes/{paper.volumeId}"
						target="_blank"
						class="text-xs text-slate-500 hover:text-indigo-600 ml-1.5 inline-block font-mono"
					>
						({paper.volumeId})
					</a>
				{/if}
			</div>
		</div>

		{#if paper.url}
			<a
				href="https://aclanthology.org/{paper.url}.pdf"
				target="_blank"
				class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shrink-0 transition-colors"
				title="Open PDF"
			>
				<Icon icon="mingcute:pdf-fill" class="w-3.5 h-3.5" />
				<span>PDF</span>
			</a>
		{/if}
	</div>

	<!-- Authors -->
	{#if paper.authors && paper.authors.length > 0}
		<div class="text-xs text-slate-600 mt-2 flex flex-wrap gap-x-1.5">
			{#each paper.authors as author, i}
				<a
					rel="external"
					href="https://gengo.sotaro.io/author/{author.first}_{author.last}"
					target="_blank"
					class="hover:text-indigo-600 hover:underline"
				>
					{author.first} {author.last}{i < paper.authors.length - 1 ? ',' : ''}
				</a>
			{/each}
		</div>
	{/if}

	<!-- Field of Study Tags -->
	{#if paper.fieldOfStudies && paper.fieldOfStudies.length > 0}
		<div class="mt-2.5 flex flex-wrap gap-1.5">
			{#each paper.fieldOfStudies as fos}
				<a
					rel="external"
					href="https://gengo.sotaro.io/fos/{fos}"
					target="_blank"
					class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200/80 transition-colors"
				>
					{fos}
				</a>
			{/each}
		</div>
	{/if}

	<!-- Summary Breakdown: Challenge, Approach, Outcome -->
	{#if paper.summaries && (paper.summaries.challenge || paper.summaries.approach || paper.summaries.outcome)}
		<div class="mt-3.5 space-y-2 pt-3 border-t border-slate-100">
			{#if paper.summaries.challenge}
				<div class="text-xs rounded-lg p-2.5 bg-amber-50/60 border border-amber-200/50 text-amber-950 flex flex-col sm:flex-row gap-1 sm:gap-2">
					<span class="font-semibold text-amber-800 uppercase tracking-wider text-[10px] shrink-0 sm:w-20">Challenge:</span>
					<span class="text-slate-700 flex-1 leading-relaxed">{paper.summaries.challenge}</span>
				</div>
			{/if}
			{#if paper.summaries.approach}
				<div class="text-xs rounded-lg p-2.5 bg-blue-50/60 border border-blue-200/50 text-blue-950 flex flex-col sm:flex-row gap-1 sm:gap-2">
					<span class="font-semibold text-blue-800 uppercase tracking-wider text-[10px] shrink-0 sm:w-20">Approach:</span>
					<span class="text-slate-700 flex-1 leading-relaxed">{paper.summaries.approach}</span>
				</div>
			{/if}
			{#if paper.summaries.outcome}
				<div class="text-xs rounded-lg p-2.5 bg-emerald-50/60 border border-emerald-200/50 text-emerald-950 flex flex-col sm:flex-row gap-1 sm:gap-2">
					<span class="font-semibold text-emerald-800 uppercase tracking-wider text-[10px] shrink-0 sm:w-20">Outcome:</span>
					<span class="text-slate-700 flex-1 leading-relaxed">{paper.summaries.outcome}</span>
				</div>
			{/if}
		</div>
	{/if}
</div>
