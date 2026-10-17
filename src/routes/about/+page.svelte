<script>
	import Icon from '@iconify/svelte';
</script>

<svelte:head>
	<title>About · GenGO Ultra</title>
</svelte:head>

<div class="h-full overflow-y-auto p-6 md:p-12">
	<div class="max-w-3xl mx-auto bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-10 shadow-sm">
		<div class="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-8 border-b border-slate-100">
			<img
				src="https://i.imgur.com/VcaQLcU.jpg"
				alt="Sotaro Takeshita"
				class="object-cover rounded-2xl w-32 h-32 sm:w-36 sm:h-36 shadow-md border border-slate-200 shrink-0"
			/>
			<div>
				<div class="flex items-center gap-2">
					<h1 class="text-2xl font-bold text-slate-900">GenGO Ultra</h1>
					<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">Research RAG</span>
				</div>
				<p class="text-sm text-slate-600 mt-1.5 leading-relaxed">
					An agentic RAG retrieval-augmented generation platform developed by
					<a href="https://sotaro.io/about" target="_blank" class="text-indigo-600 font-medium hover:underline">Sotaro Takeshita</a>
					at the
					<a
						href="https://www.uni-mannheim.de/dws/research/focus-groups/natural-language-processing-and-information-retrieval-prof-ponzetto/"
						target="_blank"
						class="text-indigo-600 font-medium hover:underline">NLP Group</a
					>,
					<a href="https://www.uni-mannheim.de/" target="_blank" class="text-indigo-600 font-medium hover:underline">University of Mannheim</a>
					in Germany.
				</p>
			</div>
		</div>

		<div class="py-6 space-y-4 text-sm text-slate-700 leading-relaxed">
			<p>
				We aim to support scientists and NLP practitioners exploring publications from the
				<a target="_blank" href="https://aclanthology.org" class="text-indigo-600 font-medium hover:underline">ACL Anthology</a>
				by coupling state-of-the-art LLMs with a rich vector & hybrid retrieval database.
			</p>
			<p>
				Over 30,000+ papers are indexed primarily from major ACL conferences (ACL, EMNLP, NAACL, EACL). Each indexed entry includes extracted challenges, approaches, and experimental outcomes.
			</p>
			<p>
				Feel free to reach out via
				<a href="mailto:sotaro.takeshita@uni-mannheim.de" class="text-indigo-600 font-medium hover:underline">email</a>
				for inquiries, feedback, or potential research collaborations.
			</p>
		</div>

		<div class="pt-6 border-t border-slate-100">
			<h2 class="text-sm font-bold uppercase tracking-wider text-slate-800 mb-3">Project Links</h2>
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<a
					target="_blank"
					href="https://gengo.sotaro.io"
					class="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-slate-700 hover:text-indigo-700 text-sm font-medium shadow-xs"
				>
					<span>GenGO Explorer</span>
					<Icon icon="lucide:external-link" class="w-4 h-4 text-slate-400" />
				</a>
				<a
					target="_blank"
					href="https://github.com/sobamchan/gengo-chat-dev"
					class="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-slate-700 hover:text-indigo-700 text-sm font-medium shadow-xs"
				>
					<span>GitHub Repository</span>
					<Icon icon="lucide:github" class="w-4 h-4 text-slate-400" />
				</a>
				<a
					target="_blank"
					href="https://gengo.sotaro.io/2025.acl-demo.24"
					class="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-slate-700 hover:text-indigo-700 text-sm font-medium shadow-xs"
				>
					<span>ACL Demo Paper</span>
					<Icon icon="lucide:file-text" class="w-4 h-4 text-slate-400" />
				</a>
			</div>
		</div>
	</div>
</div>
