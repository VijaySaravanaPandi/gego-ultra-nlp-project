<script lang="ts">
	import { page } from '$app/stores';
	import { Paper, PaperList } from '$lib/paper';
	import { default as UserPost } from '$lib/components/UserPost.svelte';
	import { default as SystemPost } from '$lib/components/SystemPost.svelte';
	import { default as PaperComponent } from '$lib/components/Paper.svelte';
	import { Message } from '$lib/message';
	import { extractPUIDsFromResponse, formatHistory, parseURLParamsToFilters } from '$lib/utils';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import { onMount, tick } from 'svelte';

	interface ChatSession {
		id: string;
		title: string;
		createdAt: number;
		messages: { isSystem: boolean; content: string }[];
		papersRaw: any[];
		userInputs: string[];
		searchQueries: string[];
		prompts: string[];
		modelResponses: string[];
	}

	let documentNumber = 5;
	let modelID = 'openai/gpt-oss-120b';
	const validModels = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];

	// Chat sessions history
	let chatSessions: ChatSession[] = [];
	let activeSessionId: string | null = null;
	let isSidebarOpen = true;

	let messagesContainer: HTMLDivElement | null = null;
	let queryFormInput: HTMLInputElement;
	let currentMessage = '';
	let isGenerating = false;
	let isReferencesOpen = true;

	const exampleQueries = [
		{
			title: 'Evaluating Summaries with LLMs',
			query: 'Give me an overview of use of LLMs for evaluating summaries.',
			tag: 'Evaluation'
		},
		{
			title: 'Understanding ROUGE-K',
			query: 'What is ROUGE-K?',
			tag: 'Metrics'
		},
		{
			title: 'Generative Retrieval Architecture',
			query: 'What is Generative Retrieval?',
			tag: 'Information Retrieval'
		},
		{
			title: 'Limitations of ROUGE Metric',
			query: 'List limitations of ROUGE evaluation metric.',
			tag: 'NLP Benchmarks'
		}
	];

	// extract parameters from the current URL
	const filters = parseURLParamsToFilters($page.url);
	const filtersParamsURL = $page.url.search;

	let messages: Message[] = [];
	let searchQueries: string[] = [];
	let prompts: string[] = [];
	let userInputs: string[] = [];
	let modelResponses: string[] = [];
	let papers = new PaperList([]);

	onMount(async () => {
		// Load model & settings
		let currentModelID = localStorage.getItem('modelID');
		if (currentModelID !== null && validModels.includes(currentModelID)) {
			modelID = currentModelID;
		} else {
			modelID = 'openai/gpt-oss-120b';
			localStorage.setItem('modelID', modelID);
		}

		let _currentDocumentNumber = localStorage.getItem('documentNumber');
		if (_currentDocumentNumber !== null) {
			documentNumber = Number(_currentDocumentNumber);
		}

		// Load chat history from localStorage
		try {
			const savedSessions = localStorage.getItem('gengo_chat_sessions');
			if (savedSessions) {
				chatSessions = JSON.parse(savedSessions);
			}
		} catch (e) {
			console.error('Failed to parse saved chat sessions:', e);
		}

		// Collapse sidebar on small screens initially
		if (window.innerWidth < 768) {
			isSidebarOpen = false;
		}

		// Handle if the user landed with ?prompt= query in URL
		const urlPrompt = $page.url.searchParams.get('prompt');
		if (urlPrompt && urlPrompt.trim()) {
			currentMessage = urlPrompt.trim();
			goto('/', { replaceState: true });
			setTimeout(() => {
				chatSubmitHandler();
			}, 100);
		} else if ($page.url.searchParams.has('prompt')) {
			goto('/', { replaceState: true });
		}
	});

	function saveSessionsToStorage() {
		try {
			localStorage.setItem('gengo_chat_sessions', JSON.stringify(chatSessions));
		} catch (e) {
			console.error('Failed to save sessions to localStorage:', e);
		}
	}

	function startNewChat() {
		activeSessionId = null;
		messages = [];
		searchQueries = [];
		prompts = [];
		userInputs = [];
		modelResponses = [];
		papers = new PaperList([]);
		currentMessage = '';
		if (queryFormInput) {
			queryFormInput.focus();
		}
	}

	function loadSession(session: ChatSession) {
		activeSessionId = session.id;
		messages = session.messages.map((m) => new Message(m.isSystem, m.content));
		userInputs = [...(session.userInputs || [])];
		searchQueries = [...(session.searchQueries || [])];
		prompts = [...(session.prompts || [])];
		modelResponses = [...(session.modelResponses || [])];
		papers = new PaperList((session.papersRaw || []).map((p: any) => new Paper(p)));
		scrollToBottom();
	}

	function deleteSession(sessionId: string, e: MouseEvent) {
		e.stopPropagation();
		chatSessions = chatSessions.filter((s) => s.id !== sessionId);
		saveSessionsToStorage();
		if (activeSessionId === sessionId) {
			startNewChat();
		}
	}

	function clearAllSessions() {
		if (confirm('Are you sure you want to clear all chat history?')) {
			chatSessions = [];
			saveSessionsToStorage();
			startNewChat();
		}
	}

	async function scrollToBottom() {
		await tick();
		if (messagesContainer) {
			messagesContainer.scrollTo({
				top: messagesContainer.scrollHeight,
				behavior: 'smooth'
			});
		}
	}

	const handleExampleClick = (query: string) => {
		if (isGenerating) return;
		currentMessage = query;
		chatSubmitHandler();
	};

	/**
	 * Unified Agentic RAG handler.
	 * Calls internal /apis/search endpoint unchanged.
	 */
	async function runAgenticSearch(userQuery: string) {
		const response = await fetch('/apis/search', {
			method: 'POST',
			body: JSON.stringify({
				limit: documentNumber,
				filters,
				userQuery,
				modelID
			}),
			headers: { 'Content-Type': 'application/json' }
		});

		const j = await response.json();
		return {
			answer: (j['answer'] || 'No answer generated.') as string,
			rawPapers: j['searchedPapers'] ?? [],
			paperList: new PaperList((j['searchedPapers'] ?? []).map((p: any) => new Paper(p)))
		};
	}

	async function chatSubmitHandler() {
		const messageToSend = currentMessage.trim();
		if (messageToSend !== '' && !isGenerating) {
			isGenerating = true;
			messages = [...messages, new Message(false, messageToSend)];
			currentMessage = '';
			userInputs.push(messageToSend);
			scrollToBottom();

			// Ensure a session exists
			if (!activeSessionId) {
				const newId = Date.now().toString();
				activeSessionId = newId;
				const newSession: ChatSession = {
					id: newId,
					title: messageToSend.length > 42 ? messageToSend.slice(0, 42) + '...' : messageToSend,
					createdAt: Date.now(),
					messages: [{ isSystem: false, content: messageToSend }],
					papersRaw: [],
					userInputs: [messageToSend],
					searchQueries: [messageToSend],
					prompts: [messageToSend],
					modelResponses: []
				};
				chatSessions = [newSession, ...chatSessions];
				saveSessionsToStorage();
			}

			try {
				const { answer, paperList, rawPapers } = await runAgenticSearch(messageToSend);

				modelResponses.push(answer);
				prompts.push(messageToSend);
				searchQueries.push(messageToSend);

				const mentionedPUIDs = extractPUIDsFromResponse(answer);
				let filteredPapers = paperList.filterByPUIDs(mentionedPUIDs);

				// Build PUID to Index dict
				const PUID2Index = Object.assign(
					{},
					...mentionedPUIDs.map((puid: string, i: number) => ({ [puid]: papers.papers.length + 1 + i }))
				);

				// Replace PUIDs with clickable index links
				let res = answer;
				Object.keys(PUID2Index).forEach((puid) => {
					res = res.replaceAll(
						puid,
						`<a href="#pp-${PUID2Index[puid]}">[${PUID2Index[puid]}]</a>`
					);
				});

				const papersToAdd = filteredPapers.papers.length > 0 ? filteredPapers.papers : paperList.papers;
				papers = papers.addPapers(papersToAdd);
				messages = [...messages, new Message(true, res)];

				// Update active session in history
				const activeIdx = chatSessions.findIndex((s) => s.id === activeSessionId);
				if (activeIdx !== -1) {
					chatSessions[activeIdx].messages = messages.map((m) => ({
						isSystem: m.isSystem,
						content: m.content
					}));
					chatSessions[activeIdx].papersRaw = [
						...(chatSessions[activeIdx].papersRaw || []),
						...rawPapers
					];
					chatSessions[activeIdx].userInputs = userInputs;
					chatSessions[activeIdx].searchQueries = searchQueries;
					chatSessions[activeIdx].prompts = prompts;
					chatSessions[activeIdx].modelResponses = modelResponses;
					saveSessionsToStorage();
				}
			} catch (err: any) {
				console.error('Agentic RAG error:', err);
				messages = [...messages, new Message(true, 'Sorry, something went wrong while processing your query. Please try again.')];
			} finally {
				isGenerating = false;
				scrollToBottom();
			}
		}
	}

	let highlightPaperIndex = 0;
	let selectedPaper: Paper | null = null;
	let isHiddenModal = true;
	const handleFetch = (_search?: string) => {
		if ($page.url.hash.includes('#pp-')) {
			highlightPaperIndex = Number($page.url.hash.replace('#pp-', ''));
			selectedPaper = papers.papers[highlightPaperIndex - 1] ?? null;
			isHiddenModal = false;
		}
	};
	const handleCloseModal = () => {
		isHiddenModal = true;
		goto(`/${filtersParamsURL}`, { replaceState: false });
	};
	$: handleFetch($page.url.search);

	function onKeyDown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
			if (queryFormInput) {
				e.preventDefault();
				queryFormInput.focus();
			}
		} else if (e.key === 'Escape') {
			if (queryFormInput) {
				queryFormInput.blur();
			}
			if (!isHiddenModal) {
				handleCloseModal();
			}
		}
	}

	function handleShowHistoryClick() {
		const content = formatHistory(userInputs, searchQueries, prompts, modelResponses);
		const blob = new Blob([content], { type: 'text/plain' });
		let pom = document.createElement('a');
		const url = URL.createObjectURL(blob);
		pom.href = url;
		pom.setAttribute('download', 'gengo-research-history.txt');
		pom.click();
	}

	function formatTimestamp(timestamp: number) {
		const date = new Date(timestamp);
		const now = new Date();
		const isToday = date.toDateString() === now.toDateString();
		if (isToday) {
			return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		}
		return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
	}
</script>

<svelte:window on:keydown={onKeyDown} />

<div class="flex h-full w-full bg-slate-50 overflow-hidden relative font-sans">
	<!-- Left Sidebar: Chat History -->
	<aside
		class="shrink-0 bg-white border-r border-slate-200/90 flex flex-col transition-all duration-200 z-20 {isSidebarOpen
			? 'w-72 sm:w-80'
			: 'w-0 -translate-x-full overflow-hidden'}"
	>
		<!-- Sidebar Header: New Chat Button -->
		<div class="p-3.5 border-b border-slate-100 flex items-center justify-between gap-2">
			<button
				on:click={startNewChat}
				class="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
			>
				<Icon icon="lucide:plus" class="w-4 h-4" />
				<span>New Research Chat</span>
			</button>
			<button
				on:click={() => (isSidebarOpen = false)}
				class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg md:hidden transition-colors"
				title="Close sidebar"
			>
				<Icon icon="lucide:x" class="w-4 h-4" />
			</button>
		</div>

		<!-- Chat Sessions List -->
		<div class="flex-1 overflow-y-auto p-2.5 space-y-1">
			<div class="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
				<span>Chat History</span>
				<span class="text-[10px] font-mono font-normal text-slate-400">({chatSessions.length})</span>
			</div>

			{#if chatSessions.length === 0}
				<div class="px-3 py-8 text-center text-xs text-slate-400 leading-relaxed">
					<Icon icon="lucide:message-square-dashed" class="w-8 h-8 mx-auto mb-2 text-slate-300" />
					No past conversations yet.<br />Ask a question to start.
				</div>
			{:else}
				{#each chatSessions as session (session.id)}
					<button
						type="button"
						on:click={() => loadSession(session)}
						class="w-full text-left group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer {activeSessionId === session.id
							? 'bg-indigo-50/80 text-indigo-900 border border-indigo-200 font-semibold'
							: 'text-slate-700 hover:bg-slate-100/80 border border-transparent'}"
					>
						<div class="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
							<Icon
								icon="lucide:message-square"
								class="w-3.5 h-3.5 shrink-0 {activeSessionId === session.id ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}"
							/>
							<div class="truncate flex-1">
								<span class="block truncate">{session.title}</span>
								<span class="block text-[10px] font-normal text-slate-400 mt-0.5">
									{formatTimestamp(session.createdAt)} · {session.messages.length} msgs
								</span>
							</div>
						</div>

						<button
							type="button"
							on:click={(e) => deleteSession(session.id, e)}
							class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
							title="Delete chat"
						>
							<Icon icon="lucide:trash-2" class="w-3.5 h-3.5" />
						</button>
					</button>
				{/each}
			{/if}
		</div>

		<!-- Sidebar Footer: Clear History & Status -->
		<div class="p-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500">
			{#if chatSessions.length > 0}
				<button
					on:click={clearAllSessions}
					class="text-[11px] text-slate-400 hover:text-rose-600 font-medium transition-colors"
				>
					Clear history
				</button>
			{:else}
				<span class="text-[11px] text-slate-400">GenGO Ultra v2.0</span>
			{/if}
			<span class="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
				<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
				LangGraph Online
			</span>
		</div>
	</aside>

	<!-- Main Chat Area -->
	<div class="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 relative">
		<!-- Top Bar Controls (Toggle Sidebar + Applied Filters) -->
		<div class="h-10 px-4 bg-white/70 backdrop-blur border-b border-slate-200/60 flex items-center justify-between shrink-0">
			<button
				on:click={() => (isSidebarOpen = !isSidebarOpen)}
				class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
				title={isSidebarOpen ? 'Hide History' : 'Show History'}
			>
				<Icon icon={isSidebarOpen ? 'lucide:panel-left-close' : 'lucide:panel-left-open'} class="w-4 h-4 text-slate-500" />
				<span class="text-[11px] font-semibold">{isSidebarOpen ? 'Hide History' : 'Chat History'}</span>
			</button>

			<div class="flex items-center gap-2 text-xs text-slate-500">
				{#if filters.must.length !== 0}
					<div class="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full px-2.5 py-0.5 text-[11px]">
						<span>Filter: {filters.must.map((f) => f.key + '=' + f.match.value).join(', ')}</span>
						<a href="/" target="_self" class="hover:text-amber-950 font-bold ml-1">×</a>
					</div>
				{/if}
				{#if messages.length > 0}
					<button
						on:click={handleShowHistoryClick}
						class="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 hover:underline transition-colors"
						title="Export conversation"
					>
						<Icon icon="lucide:download" class="w-3.5 h-3.5" />
						<span class="hidden sm:inline">Export</span>
					</button>
				{/if}
			</div>
		</div>

		<!-- Scrollable Messages Container -->
		<div
			bind:this={messagesContainer}
			class="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-6 space-y-4"
		>
			<div class="max-w-3xl mx-auto w-full">
				<!-- Welcome Hero State when messages are empty -->
				{#if messages.length === 0}
					<div class="py-8 sm:py-12 text-center">
						<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-4 shadow-2xs">
							<Icon icon="lucide:sparkles" class="w-3.5 h-3.5" />
							<span>ACL Anthology Agentic Search</span>
						</div>
						<h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
							What NLP research would you like to explore?
						</h1>
						<p class="text-sm text-slate-600 max-w-xl mx-auto mt-2 leading-relaxed">
							GenGO Ultra leverages a 5-node LangGraph pipeline with Weaviate hybrid search to retrieve, grade, and synthesize academic literature with exact citations.
						</p>

						<!-- Example Queries Cards -->
						<div class="mt-8 text-left">
							<div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
								Featured Research Queries
							</div>
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
								{#each exampleQueries as example}
									<button
										type="button"
										on:click={() => handleExampleClick(example.query)}
										disabled={isGenerating}
										class="p-4 rounded-2xl bg-white border border-slate-200/90 hover:border-indigo-400 hover:shadow-md transition-all duration-150 text-left group cursor-pointer shadow-xs flex flex-col justify-between"
									>
										<div>
											<span class="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors mb-2">
												{example.tag}
											</span>
											<h3 class="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
												{example.title}
											</h3>
											<p class="text-xs text-slate-500 mt-1 leading-relaxed">
												"{example.query}"
											</p>
										</div>
										<div class="mt-3 flex items-center justify-end text-xs font-semibold text-indigo-600 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
											<span>Ask query</span>
											<Icon icon="lucide:arrow-right" class="w-3.5 h-3.5 ml-1" />
										</div>
									</button>
								{/each}
							</div>
						</div>
					</div>
				{/if}

				<!-- Message Stream -->
				{#each messages as msg}
					{#if msg.isSystem}
						<SystemPost {msg} {papers} />
					{:else}
						<UserPost {msg} />
					{/if}
				{/each}

				<!-- Loading Indicator -->
				{#if isGenerating}
					<div class="flex items-center gap-3 p-4 my-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm animate-pulse">
						<div class="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
							<Icon icon="eos-icons:bubble-loading" class="w-5 h-5" />
						</div>
						<div class="flex-1">
							<div class="text-xs font-semibold text-slate-800">
								Agentic RAG in progress...
							</div>
							<div class="text-[11px] text-slate-500 mt-0.5">
								Rewriting query · Searching Weaviate · Grading documents · Synthesizing answer
							</div>
						</div>
					</div>
				{/if}

				<!-- Referenced Papers Accordion -->
				{#if papers.papers.length > 0}
					<div class="mt-8 pt-6 border-t border-slate-200/80">
						<div class="flex items-center justify-between mb-3">
							<button
								type="button"
								on:click={() => (isReferencesOpen = !isReferencesOpen)}
								class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer"
							>
								<Icon
									icon={isReferencesOpen ? 'lucide:chevron-down' : 'lucide:chevron-right'}
									class="w-4 h-4 text-slate-400"
								/>
								<span>Referenced Academic Papers ({papers.papers.length})</span>
							</button>
							<span class="text-[11px] text-slate-400">Indexed from ACL Anthology</span>
						</div>

						{#if isReferencesOpen}
							<div class="space-y-3">
								{#each papers.papers as p}
									<PaperComponent paper={p} />
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- Input Box (Anchored at Bottom) -->
		<div class="shrink-0 p-4 sm:px-6 md:px-8 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent">
			<div class="max-w-3xl mx-auto w-full">
				<form
					on:submit|preventDefault={chatSubmitHandler}
					class="relative flex items-center bg-white border border-slate-300 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all p-1.5"
				>
					<div class="pl-3 pr-2 text-slate-400">
						<Icon icon="lucide:search" class="w-4 h-4" />
					</div>
					<input
						type="text"
						bind:value={currentMessage}
						bind:this={queryFormInput}
						placeholder="Ask a question about NLP research... (⌘K to focus)"
						class="flex-1 bg-transparent border-0 text-sm text-slate-800 placeholder-slate-400 px-1 py-2 focus:outline-none focus:ring-0"
						disabled={isGenerating}
						autocomplete="off"
						name="prompt"
						id="prompt"
					/>
					<div class="flex items-center gap-2 pr-1">
						<span class="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200">
							⌘K
						</span>
						<button
							type="submit"
							disabled={isGenerating || !currentMessage.trim()}
							class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
						>
							<span>Send</span>
							<Icon icon="lucide:send" class="w-3.5 h-3.5" />
						</button>
					</div>
				</form>
				<div class="flex items-center justify-between px-2 pt-2 text-[11px] text-slate-400">
					<span>Press Enter to search · LangGraph Agentic Pipeline</span>
					<span>Model: {modelID.split('/')[1] || modelID}</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Paper Modal Viewer -->
	{#if selectedPaper != null}
		<div
			id="default-modal"
			tabindex="-1"
			aria-hidden="true"
			class:hidden={isHiddenModal}
			class="overflow-y-auto overflow-x-hidden fixed inset-0 z-50 justify-center items-center w-full h-full flex bg-slate-900/40 backdrop-blur-xs p-4"
		>
			<div class="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 overflow-hidden">
				<div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
					<div class="flex items-center gap-2">
						<Icon icon="lucide:book-open" class="w-4 h-4 text-indigo-600" />
						<span class="text-xs font-bold uppercase tracking-wider text-slate-700">Paper Inspection</span>
					</div>
					<button
						on:click={handleCloseModal}
						class="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
						title="Close modal"
					>
						<Icon icon="lucide:x" class="w-4 h-4" />
					</button>
				</div>
				<PaperComponent isHilighted={false} paper={selectedPaper} />
				<div class="mt-4 flex justify-end">
					<button
						on:click={handleCloseModal}
						class="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
</style>
