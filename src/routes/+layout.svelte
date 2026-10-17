<script lang="ts">
	import '../app.postcss';
	import { page } from '$app/stores';
	import Icon from '@iconify/svelte';

	// Floating UI for Popups
	import { computePosition, autoUpdate, flip, shift, offset, arrow } from '@floating-ui/dom';
	import { storePopup } from '@skeletonlabs/skeleton';
	storePopup.set({ computePosition, autoUpdate, flip, shift, offset, arrow });
</script>

<div class="h-screen w-screen flex flex-col bg-slate-50 text-slate-800 overflow-hidden font-sans">
	<!-- Top navigation bar -->
	<header class="h-14 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-xs">
		<div class="flex items-center gap-3">
			<a href="/" class="flex items-center gap-2.5 group">
				<div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs group-hover:bg-indigo-700 transition-colors">
					<Icon icon="lucide:sparkles" class="w-4 h-4" />
				</div>
				<div class="flex items-baseline gap-1.5">
					<span class="text-base font-bold tracking-tight text-slate-900">GenGO</span>
					<span class="text-xs font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">Ultra</span>
				</div>
			</a>
			<span class="hidden md:inline-block text-xs text-slate-400 font-light border-l border-slate-200 pl-3">
				Agentic NLP Research Assistant · ACL Anthology
			</span>
		</div>

		<nav class="flex items-center gap-1.5 sm:gap-2">
			<a
				href="/"
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium {$page.url.pathname === '/' ? 'text-indigo-600 bg-indigo-50 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'} transition-colors"
			>
				<Icon icon="lucide:message-square" class="w-3.5 h-3.5" />
				<span class="hidden sm:inline">Research Chat</span>
			</a>
			<a
				href="/setting"
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium {$page.url.pathname === '/setting' ? 'text-indigo-600 bg-indigo-50 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'} transition-colors"
			>
				<Icon icon="lucide:sliders-horizontal" class="w-3.5 h-3.5" />
				<span class="hidden sm:inline">Settings</span>
			</a>
			<a
				href="/about"
				class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium {$page.url.pathname === '/about' ? 'text-indigo-600 bg-indigo-50 font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'} transition-colors"
			>
				<Icon icon="lucide:info" class="w-3.5 h-3.5" />
				<span class="hidden sm:inline">About</span>
			</a>
			<a
				href="https://gengo.sotaro.io"
				target="_blank"
				rel="noreferrer"
				class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors ml-1"
				title="Visit GenGO Project"
			>
				<span class="hidden md:inline italic font-serif">GenGO</span>
				<Icon icon="lucide:external-link" class="w-3 h-3" />
			</a>
		</nav>
	</header>

	<!-- Main Body -->
	<main class="flex-1 overflow-hidden flex flex-col relative bg-slate-50">
		<slot />
	</main>
</div>
