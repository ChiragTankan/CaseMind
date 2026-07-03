# CaseMind — Cognitive Investigation Workspace 🔎🧠

CaseMind is a production-ready, full-stack investigative assistant designed to help legal professionals, forensic analysts, and investigators turn complex, unstructured casework documents into clear, interactive intelligence. Powered by Google Gemini and Cognee's Cognitive Memory Engine, CaseMind parses evidence files to extract connected entities, visualize complex transaction networks, and assist in chat-based forensic reasoning.

---

## 🌟 Core Features

- **📂 Case & Document Organizer**: Streamline your investigative workflow. Create dedicated cases, upload raw intelligence assets (PDF, CSV, TXT, etc.), and maintain secure workspace records.
- **🧠 Cognitive Graph Engine (Powered by Cognee)**: Automatically extract hidden semantic connections. It maps key forensic entities (persons, corporations, bank accounts, dates, locations, transactions) and identifies relationships (ownership, employment, transfers, and meetings).
- **🕸️ Interactive Graph Visualizer**: Fully interactive nodule-link visualization representing the network of connections. Click nodes to view metadata, isolate specific suspects, and unravel complex, multi-tiered networks.
- **💬 AI Detective Chat (Semantic Memory RAG)**: Converse directly with an AI detective who has access to the full knowledge graph. The AI uses Cognee-style long-term memory recall to discover non-obvious links across multiple files.
- **📄 Reports Generator**: Automatically draft structured legal-forensic and investigative summaries directly from the cognitive data points discovered in the case.

---

## 🧠 How Cognee is Used in CaseMind

### 1. Automated Document Cognification
When a user uploads a piece of evidence, CaseMind utilizes the **Cognee Memory Engine** protocol. Unstructured text is analyzed, and the system extracts key nodes and edges. For instance, a text sentence like *"John transferred $50,000 to Apex Corp on June 12"* is automatically structured as:
- **Entities**: John (Person), Apex Corp (Company), June 12 (Date)
- **Relationships**: `John` → *transferred_to* → `Apex Corp`

These nodes and relationships are instantly rendered on your interactive case visualizer and permanently cataloged.

### 2. Semantic Memory Chat (RAG)
During conversational investigations in the Detective Chat, Cognee acts as the long-term memory module. The chat dynamically performs vector and structural queries against Cognee's databases. This ensures that when you ask *"Is there a connection between Suspect A and Suspect B?"*, the AI detective reviews every node path and relationship, discovering indirect links that would be impossible to spot in raw, individual PDFs.

---

## ⚙️ How to Best Configure Cognee Cloud SaaS

While CaseMind runs a high-performance local extraction system by default, you can unlock **Cognee's Advanced SaaS Remote Memory Cloud** to enable multi-session memory, advanced semantic vector matching, and synonym resolution.

To activate the Cognee SaaS cloud integration:
1. **Get an API Key**: Sign up at [Cognee.ai](https://cognee.ai) to retrieve your personal API key and tenant URL.
2. **Configure Environment Secrets**: Add the following workspace environment variables (or save them in your `.env` file):
   ```env
   COGNEE_API_KEY=your_cognee_api_key_here
   COGNEE_BASE_URL=https://tenant-id.aws.cognee.ai
   ```
3. **Restart Application**: Once saved, CaseMind automatically redirects document ingestion and chat recall directly to the Cognee SaaS endpoints, storing your Q&A history securely in your cloud tenant.

---

## 🛠️ Technology Stack & Architecture

- **Frontend**: React 19, Vite, Tailwind CSS (Modern Theme), ReactFlow / D3 (Custom Graph UI), Lucide Icons, Framer Motion.
- **Backend**: Node.js, Express (custom-bundled server.cjs for low latency), ESM / CJS module safety.
- **AI Engine**: Google `@google/genai` (utilizing Gemini 3.5 Flash for high-speed, cost-effective structured entity extraction and RAG reasoning).
- **Database**: Cloud Firestore (highly durable multi-tenant case storage).
