# Gengo Ultra NLP - Advanced Conversational & Paper Intelligence Platform

**Course Code:** 23CSE471  
**Subject:** NLP - Natural Language Processing  
**Project:** Final Year Capstone NLP Project  
**Author / Developer:** Vijay Saravana Pandi ([vijaysaravanapandit@gmail.com](mailto:vijaysaravanapandit@gmail.com))  
**Repository:** [https://github.com/VijaySaravanaPandi/gego-ultra-nlp-project](https://github.com/VijaySaravanaPandi/gego-ultra-nlp-project)

---

## 📖 Project Overview

**Gengo Ultra NLP** is a comprehensive, full-stack Natural Language Processing (NLP) system designed to explore advanced conversational dynamics, academic literature synthesis, agentic Retrieval-Augmented Generation (RAG), and multi-LLM comparative benchmarking.

Built as part of the **23CSE471 (Natural Language Processing)** curriculum, this project bridges modern neural text processing pipelines with responsive human-in-the-loop interfaces. It integrates deep linguistic parsing, semantic vector embeddings, knowledge graphs, and real-time token streaming across multiple model backends.

---

## 🎯 Key NLP Features

1. **Multi-Model NLP Benchmarking & Routing:**
   - Real-time side-by-side inference comparing frontier and open-weight models (Groq, Together AI, LLaMA-based architectures, and Google Gemini).
   - Dynamic prompt template injection with task-specific linguistic constraints.

2. **Agentic Retrieval-Augmented Generation (RAG):**
   - Context-grounded literature extraction and semantic document chunking.
   - Vector similarity matching coupled with citation and provenance tracking.

3. **Knowledge Graph & Entity Relation Extraction:**
   - Semantic relationship mapping across linguistic entities and research concepts.
   - Interactive visual graphs detailing topic hierarchies and cross-domain connections.

4. **Real-Time Token Streaming & Markdown Processing:**
   - Low-latency Server-Sent Events (SSE) token delivery.
   - Live rendering of syntax, linguistic breakdowns, grammatical callouts, and mathematical notations.

---

## 🛠️ Technology Stack

- **Frontend:** SvelteKit, TypeScript, Tailwind CSS, Lucide Icons, Cytoscape / Vis Graph Tools
- **Backend / NLP Engine:** SvelteKit Server Endpoints, Node.js runtime, LangChain / Agentic RAG utilities
- **Models & APIs:** Groq (LPU Inference), Together AI, HuggingFace embeddings, ACL Anthology Paper Ingestion
- **Environment & Tools:** Vite, PostCSS, npm

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm
- Valid API keys for supported providers (Groq, Together AI, etc.) in your `.env` file

### Installation

```bash
# Clone the repository
git clone https://github.com/VijaySaravanaPandi/gego-ultra-nlp-project.git
cd gego-ultra-nlp-project

# Install dependencies
npm install
```

### Environment Configuration
Create a `.env` file in the root directory:
```env
TOGETHER_AI_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
```

### Running Locally
```bash
# Run the development server
npm run dev

# Open your browser at http://localhost:5173
```

### Building for Production
```bash
npm run build
npm run preview
```

---

## 🎓 Academic Context
- **Course:** 23CSE471 - Natural Language Processing
- **Institution:** Department of Computer Science & Engineering
- **Focus:** Neural Language Models, RAG Systems, Streaming Dialogue Interfaces, Semantic Graph Extraction
