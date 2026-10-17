import { PUIDToIdx } from './utils';

export class Paper {
	index: number | null = null;
	id: string;
	collectionId: string;
	collectionAcronym: string;
	volumeId: string;
	paperId: string;
	paperTitle: string;
	year: number;
	booktitle: string;
	authors: { first: string; last: string }[];
	abstract: string;
	url: string;
	bibkey: string;
	doi: string;
	fulltext: { key: string[] };
	materialEntities: string[];
	methodEntities: string[];
	metricEntities: string[];
	taskEntities: string[];
	fieldOfStudies: string[];
	summaries: { overview: string; challenge: string; approach: string; outcome: string };
	vectors: { overview: number[]; challenge: number[]; approach: number[]; outcome: number[] };
	relevantPapers: {
		overview: number[] | null;
		challenge: number[] | null;
		approach: number[] | null;
		outcome: number[] | null;
	};

	constructor(paperJson: any) {
		const payload = paperJson?.payload ?? {};
		this.id = paperJson?.id ?? '';
		this.collectionId = payload.collection_id ?? '';
		this.collectionAcronym = payload.collection_acronym ?? '';
		this.volumeId = payload.volume_id ?? payload.volumeId ?? '';
		this.paperId = payload.paper_id ?? payload.paperId ?? '';
		this.paperTitle = payload.paper_title ?? payload.title ?? 'Untitled Paper';
		this.year = payload.year ?? 2023;
		this.booktitle = payload.booktitle ?? payload.venue ?? 'ACL Anthology';
		this.authors = Array.isArray(payload.authors)
			? payload.authors.map((a: any) =>
					typeof a === 'string'
						? { first: a.split(' ').slice(0, -1).join(' ') || a, last: a.split(' ').slice(-1)[0] || '' }
						: a
			  )
			: [];
		this.abstract = payload.abstract ?? '';
		this.url = payload.url ?? '';
		this.bibkey = payload.bibkey ?? '';
		this.doi = payload.doi ?? '';
		this.fulltext = payload.fulltext ?? { key: [] };
		this.materialEntities = payload.material_entities ?? [];
		this.methodEntities = payload.method_entities ?? [];
		this.metricEntities = payload.metric_entities ?? [];
		this.taskEntities = payload.task_entities ?? [];
		this.fieldOfStudies = payload.field_of_studies ?? payload.fieldOfStudies ?? ['NLP'];
		this.summaries = payload.summaries ?? {
			overview: payload.overview ?? payload.abstract ?? '',
			challenge: payload.challenge ?? 'Addressing core challenges in NLP.',
			approach: payload.approach ?? 'Applying state of the art modeling techniques.',
			outcome: payload.outcome ?? 'Demonstrating solid empirical gains.'
		};
		this.vectors = paperJson?.vector;
		this.relevantPapers = payload.relevant_papers ?? null;
	}

	getNamedEntities() {
		return Object.values(this.materialEntities)
			.flat()
			.concat(
				Object.values(this.methodEntities).flat(),
				Object.values(this.metricEntities).flat(),
				Object.values(this.taskEntities).flat()
			);
	}

	getPDFURL() {
		return 'https://aclanthology.org/' + this.url + '.pdf';
	}

	toContext(idx: number) {
		return `    PUID: ${idx}
    TITLE: ${this.paperTitle}
    PAPER: ${this.abstract}
`;
	}
}

export class PaperList {
	papers: Paper[] = [];

	constructor(papers: Paper[]) {
		this.papers = papers;
	}

	filterByPUIDs(PUIDs: string[]): PaperList {
		let idxs = PUIDs.map((i) => PUIDToIdx(i)).filter((i) => i > -1);
		idxs = idxs.sort((a, b) => a - b);
		const filteredPapers = this.papers.filter((p, i) => idxs.includes(i + 1));
		return new PaperList(filteredPapers);
	}

	addPapers(papers: Paper[]): PaperList {
		let newPapers = [...this.papers, ...papers];
		let newPaperList = new PaperList(newPapers);
		newPaperList.updateIndex();
		return newPaperList;
	}

	updateIndex(): void {
		this.papers = this.papers.map((p, i) => {
			p.index = i + 1;
			return p;
		});
	}
}
