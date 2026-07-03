/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FolderPlus, 
  Trash2, 
  Clock, 
  Search, 
  Activity, 
  Network, 
  BookOpen,
  FolderLock,
  ChevronRight,
  Database
} from 'lucide-react';
import { Case } from '../types';

interface CaseListProps {
  cases: Case[];
  activeCaseId: string | null;
  onSelectCase: (id: string) => void;
  onCreateCase: (name: string, description: string) => Promise<void>;
  onDeleteCase: (id: string) => Promise<void>;
  loading: boolean;
}

export default function CaseList({ 
  cases, 
  activeCaseId, 
  onSelectCase, 
  onCreateCase, 
  onDeleteCase,
  loading
}: CaseListProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onCreateCase(name, description);
      setName('');
      setDescription('');
      setShowForm(false);
    } catch (e: any) {
      alert(`Failed to create case: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const filteredCases = cases.filter(c => 
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.description.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Search Header Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search investigative cases..."
            className="w-full pl-9 pr-4 py-2 bg-[#121214] border border-white/5 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500/50"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Buttons */}
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20"
        >
          <FolderPlus className="w-4 h-4" />
          New Case File
        </button>

      </div>

      {/* Case Creation Form */}
      {showForm && (
        <form 
          onSubmit={handleSubmit}
          className="p-5 bg-[#121214] border border-white/10 rounded-xl space-y-4 max-w-xl shadow-2xl animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <h3 className="text-sm font-bold font-mono text-slate-300 uppercase tracking-wider">Initialize Cryptographic Docket</h3>
            <button 
              type="button" 
              onClick={() => setShowForm(false)} 
              className="text-slate-500 hover:text-slate-300 text-xs font-mono"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Docket Name / Code</label>
              <input
                type="text"
                placeholder="e.g. OPERATION_ACME_WIRE"
                className="w-full bg-[#0c0c0e] border border-white/5 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500/50 outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={busy}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Docket Executive Description</label>
              <textarea
                placeholder="Detail high-level target companies, suspicious offshore accounts or investigative context..."
                className="w-full bg-[#0c0c0e] border border-white/5 rounded-lg px-3.5 py-2.5 text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500/50 outline-none h-24 resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={busy}
              />
            </div>

            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="px-4 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <Database className="w-3.5 h-3.5" />
              {busy ? 'Provisioning Firebase Node...' : 'Authorize Docket'}
            </button>
          </div>
        </form>
      )}

      {/* Grid of open cases */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {filteredCases.map((c) => {
          const isActive = activeCaseId === c.id;
          return (
            <div
              key={c.id}
              className={`group flex flex-col p-5 bg-[#0c0c0e] border rounded-xl transition-all relative ${
                isActive 
                  ? 'border-indigo-500/80 ring-1 ring-indigo-500/30 bg-[#121214] shadow-[0_0_20px_rgba(99,102,241,0.15)]' 
                  : 'border-white/5 hover:border-white/10 hover:bg-[#121214]/60 shadow-md'
              }`}
            >
              
              {/* Folder structure accent */}
              <div className="absolute top-0 left-4 -translate-y-[1px] w-12 h-[2px] bg-indigo-500/80 group-hover:w-20 transition-all rounded-full"></div>

              {/* Title & Icons */}
              <div className="flex items-start justify-between mb-3 min-w-0">
                <div 
                  className="flex items-center gap-2 cursor-pointer min-w-0"
                  onClick={() => onSelectCase(c.id)}
                >
                  <div className={`p-2 rounded-lg border ${
                    isActive ? 'bg-indigo-950/60 text-indigo-400 border-indigo-900/40' : 'bg-[#121214] text-slate-500 border-white/5'
                  }`}>
                    <FolderLock className="w-4 h-4 shrink-0" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-200 truncate group-hover:text-indigo-400 transition-colors">{c.name}</h4>
                </div>

                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm("Are you absolutely sure you want to permanently delete this Docket and all associated RDF graph connections?")) {
                      await onDeleteCase(c.id);
                    }
                  }}
                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-white/5 rounded transition-colors cursor-pointer"
                  title="Purge case directory"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Description preview */}
              <p className="text-xs text-slate-400 flex-1 line-clamp-3 mb-4 leading-relaxed h-[54px] overflow-hidden hover:text-slate-300">
                {c.description || "No dockets logged. Upload interviews and transaction ledger traces to map Cognee memories."}
              </p>

              {/* Visual mini-metrics display */}
              <div className="grid grid-cols-3 gap-2 py-2 mb-4 border-t border-b border-white/5 bg-black/20 text-center font-mono">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 block uppercase">Nodes</span>
                  <span className="text-xs font-bold text-indigo-400">Resolved</span>
                </div>
                <div className="space-y-0.5 border-l border-r border-white/5">
                  <span className="text-[10px] text-slate-500 block uppercase">Triples</span>
                  <span className="text-xs font-bold text-emerald-400">Mapped</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500 block uppercase">Intel</span>
                  <span className="text-xs font-bold text-amber-500">Active</span>
                </div>
              </div>

              {/* Footer logs timeline */}
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-600" />
                  {new Date(c.createdAt).toLocaleDateString()}
                </span>
                
                <button
                  onClick={() => onSelectCase(c.id)}
                  className="text-xs font-bold font-mono text-indigo-400 group-hover:text-indigo-300 transition-colors flex items-center gap-0.5 cursor-pointer"
                >
                  Enter
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          );
        })}

        {filteredCases.length === 0 && (
          <div className="col-span-full p-12 border border-dashed border-white/5 rounded-xl text-center bg-black/20 text-slate-500 space-y-2">
            <Activity className="w-10 h-10 mx-auto text-slate-800" />
            <h5 className="font-semibold text-sm">No active investigation cases match query</h5>
            <p className="text-xs text-slate-600">Register clean dockets using the New Case File button.</p>
          </div>
        )}
      </div>

    </div>
  );
}
