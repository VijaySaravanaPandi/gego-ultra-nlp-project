<script>
	import { RangeSlider } from '@skeletonlabs/skeleton';
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';

	let documentNumber = 5;
	let maxDocumentNumber = 25;
	let saved = false;

	const modelOptions = [
		'openai/gpt-oss-120b',
		'openai/gpt-oss-20b',
		'qwen/qwen3.8-27b'
	];
	let modelName = modelOptions[0];

	onMount(() => {
		const currentDocumentNumber = localStorage.getItem('documentNumber');
		if (currentDocumentNumber !== null) {
			documentNumber = Number(currentDocumentNumber);
		}

		const currentModelName = localStorage.getItem('modelID');
		if (currentModelName !== null && modelOptions.includes(currentModelName)) {
			modelName = currentModelName;
		} else {
			modelName = modelOptions[0];
			localStorage.setItem('modelID', modelOptions[0]);
		}
	});

	const updateSetting = () => {
		localStorage.setItem('documentNumber', String(documentNumber));
		localStorage.setItem('modelID', modelName);
		saved = true;
		setTimeout(() => {
			saved = false;
		}, 2000);
	};
</script>

<svelte:head>
	<title>Settings · GenGO Ultra</title>
</svelte:head>

<div class="h-full overflow-y-auto p-6 md:p-12">
	<div class="max-w-2xl mx-auto bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm">
		<div class="flex items-center justify-between pb-6 border-b border-slate-100">
			<div>
				<h1 class="text-xl font-bold text-slate-900 flex items-center gap-2">
					<Icon icon="lucide:sliders" class="w-5 h-5 text-indigo-600" />
					Settings
				</h1>
				<p class="text-xs text-slate-500 mt-1">Configure language model and academic document retrieval parameters.</p>
			</div>
			{#if saved}
				<span class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 transition-all">
					<Icon icon="lucide:check" class="w-3.5 h-3.5" />
					Saved
				</span>
			{/if}
		</div>

		<div class="space-y-8 mt-6">
			<!-- Model Selection -->
			<div>
				<label for="modelOption" class="block text-sm font-semibold text-slate-800 mb-1">
					Groq Language Model
				</label>
				<p class="text-xs text-slate-500 mb-3">
					The LLM powering query rewriting, document grading, and citation synthesis.
				</p>
				<select
					id="modelOption"
					class="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
					bind:value={modelName}
					on:change={updateSetting}
				>
					{#each modelOptions as modelOption}
						<option value={modelOption}>{modelOption}</option>
					{/each}
				</select>
			</div>

			<!-- Document Retrieval Slider -->
			<div class="pt-4 border-t border-slate-100">
				<div class="flex items-center justify-between mb-2">
					<div>
						<label for="doc-slider" class="text-sm font-semibold text-slate-800">
							Retrieved Documents Limit
						</label>
						<p class="text-xs text-slate-500 mt-0.5">
							Number of papers retrieved from Weaviate vector database per query.
						</p>
					</div>
					<span class="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
						{documentNumber} papers
					</span>
				</div>

				<div class="mt-4">
					<RangeSlider
						id="doc-slider"
						name="range-slider"
						bind:value={documentNumber}
						min={1}
						max={maxDocumentNumber}
						step={1}
						ticked
						on:change={updateSetting}
					/>
				</div>
			</div>
		</div>
	</div>
</div>
