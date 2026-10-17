<script>
	import { marked } from 'marked';
	import Icon from '@iconify/svelte';

	export let msg;
</script>

<div class="flex items-start gap-3 my-3">
	<div class="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
		<Icon icon="lucide:user" class="w-4 h-4" />
	</div>
	<div class="flex-1 bg-white border border-slate-200/80 rounded-2xl px-5 py-3.5 shadow-sm">
		<div class="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-2">
			<span class="text-xs font-semibold uppercase tracking-wider text-indigo-600">You</span>
			<span class="text-[11px] text-slate-400 font-light">Query</span>
		</div>
		<div
			class="
				prose
				prose-slate
				max-w-none
				text-[15px]
				leading-relaxed
				text-slate-800
				prose-p:text-slate-800
				prose-strong:text-slate-900
				prose-strong:font-semibold
			"
		>
			{@html marked.parse(msg.content)}
		</div>
	</div>
</div>
