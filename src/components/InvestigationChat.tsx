/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Terminal, 
  Shield, 
  Bot, 
  User, 
  Trash2, 
  Workflow, 
  Cpu,
  Search,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { ChatMessage } from '../types';
import Markdown from 'react-markdown';

interface InvestigationChatProps {
  caseId: string;
  onRefreshGraph: () => void;
}

const PRESET_QUERIES = [
  "Show suspicious connections in the graph.",
  "Which accounts are connected to Acme Corp?",
  "Show active wire transaction chains.",
  "What critical entities did we discover recently?",
];

export default function InvestigationChat({ caseId, onRefreshGraph }: InvestigationChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load chat session history from localStorage local cache
  useEffect(() => {
    const cached = localStorage.getItem(`chat-history-${caseId}`);
    if (cached) {
      try {
        setMessages(JSON.parse(cached));
      } catch (e) {
        console.error("Failed to parse chat logs:", e);
      }
    } else {
      // Intro system prompt
      setMessages([
        {
          id: 'welcome-0',
          role: 'assistant',
          content: "### 👁️ Welcome Investigator to CaseMind AI\n\nI am synchronized with your **Cognee Semantic Graph Engine**. Here is how we operate and where your core intelligence assets are stored:\n\n#### ⚙️ How Cognee Works under the Hood\n1. **Extraction & Chunking:** When you upload PDFs, text, or raw files, they are processed and ingested into individual chunks.\n2. **Entity & Relation Mining:** Grounded Gemini 3.5 extraction scans your evidence chunks to extract structured node concepts (People, Companies, Accounts, Dates, Locations) and predicate connections (*\"owns\"*, *\"works_at\"*, *\"transferred_to\"*, *\"associated_with\"*).\n3. **Graph Vector Triples:** Discovered linkages are constructed into semantic triples (Subject-Predicate-Object) to form a robust, traceable graph memory map.\n\n#### 🗄️ Where Your Stored Data Lives\nAll reconstructed RDF graphs, file text chunks, metadata, and relations are **permanently and securely persistent inside your Firestore Database**! \n* **Db Instance Identifier:** `ai-studio-a5b302e6-80ab-4f01-a26e-c49e60273031`\n* **Viewing Data in Firebase:** Log in to your **Google Firebase Console** -> **Firestore Database** of this project, where you can view raw documents stored in the following live collections:\n  * `cases` — Registered investigative dockets\n  * `documents` — Raw uploaded files and extracted text content\n  * `entities` — Extracted node properties (e.g., metadata, types, risk factors)\n  * `relationships` — Semantic RDF edges connecting those nodes\n  * `reports` — Saved executive intelligence reports compiled from the graph",
          createdAt: new Date().toISOString()
        }
      ]);
    }
  }, [caseId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (messages.length > 0) {
      localStorage.setItem(`chat-history-${caseId}`, JSON.stringify(messages));
    }
  }, [messages, caseId]);

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setLoading(true);

    try {
      const response = await fetch(`/api/cases/${caseId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          query: text
        })
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to secure Gemini analysis");
      }

      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        createdAt: new Date().toISOString()
      }]);
      
      // Update graph view if they might have extracted anything or referenced updates
      onRefreshGraph();
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error retrieving CaseMind RDF Memory context: ${err.message}. Please verify Gemini key configuration.`,
        createdAt: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    const cleanLog: ChatMessage[] = [
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: "Memory session chat cleared, but core Cognee Knowledge Graph nodes remain persistent inside Google Firestore database.",
        createdAt: new Date().toISOString()
      }
    ];
    setMessages(cleanLog);
    localStorage.removeItem(`chat-history-${caseId}`);
  };

  return (
    <div className="w-full h-[650px] bg-[#0c0c0e] border border-white/5 rounded-xl flex flex-col overflow-hidden shadow-2xl">
      
      {/* Dynamic Header */}
      <div className="p-4 bg-[#0c0c0e] border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-600/10 border border-indigo-600/20 rounded-lg text-indigo-400">
            <Bot className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white font-mono">INVESTIGATION_LOG_AGENT</h3>
            <p className="text-[10px] text-slate-500 font-mono">STATE: PERSISTENT_RDF_READY</p>
          </div>
        </div>
        
        <button
          onClick={clearChat}
          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          title="Clear session messages"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Preset queries bar */}
      <div className="px-4 py-2.5 bg-[#121214]/60 border-b border-white/5 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1">
          <HelpCircle className="w-3 h-3 text-indigo-400" />
          Quick Queries:
        </span>
        {PRESET_QUERIES.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            disabled={loading}
            className="px-2.5 py-1 text-[10px] font-mono bg-[#0c0c0e] hover:bg-white/5 border border-white/5 rounded-md text-slate-300 transition-colors cursor-pointer text-left truncate max-w-full"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages layout */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-black/20 custom-scroll">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex gap-3 max-w-3xl ${
              msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            {/* Avatar block */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
              msg.role === 'user' 
                ? 'bg-indigo-950/60 text-indigo-400 border-indigo-900/30' 
                : 'bg-[#121214] text-slate-400 border-white/5'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Bubble content */}
            <div className={`p-3.5 rounded-xl border text-sm max-w-full space-y-2 leading-relaxed ${
              msg.role === 'user'
                ? 'bg-indigo-600/10 text-slate-200 border-indigo-500/20'
                : 'bg-[#121214] text-slate-300 border-white/5'
            }`}>
              
              <div className="text-[10px] text-slate-500 font-mono">
                {msg.role === 'user' ? 'INVESTIGATOR' : 'CASE_MIND_BOT'} • {new Date(msg.createdAt).toLocaleTimeString()}
              </div>

              {/* Message text with beautiful markdown renderer */}
              <div className="markdown-body text-slate-300 font-sans text-[13px] leading-relaxed break-words">
                <Markdown>{msg.content}</Markdown>
              </div>

            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-lg">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border bg-[#121214] text-indigo-400 border-white/5 animate-pulse">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="p-3.5 rounded-xl border bg-[#121214]/60 text-xs font-mono text-slate-400 border-white/5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></span>
              Synchronizing multi-session RDF memories in Firestore and querying Gemini...
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input zone */}
      <div className="p-4 bg-[#0c0c0e] border-t border-white/5">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputVal);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Search CaseMind memory (e.g. 'What evidence links Account A and John Smith?')..."
            className="flex-1 bg-[#121214] hover:bg-[#121214]/80 border border-white/5 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !inputVal.trim()}
            className="p-3 bg-indigo-600 hover:bg-indigo-554 disabled:opacity-30 text-white rounded-xl transition-all cursor-pointer shadow-lg hover:shadow-indigo-600/20 hover:bg-indigo-500"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[10px] text-slate-500 mt-2 text-center font-mono uppercase">
          AI Detective incorporates deep-graph resolution from Google Gemini 1.5/2.5.
        </p>
      </div>

    </div>
  );
}
