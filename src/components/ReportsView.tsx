/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Calendar, 
  TrendingUp, 
  ShieldAlert, 
  Navigation,
  BookOpen,
  Map,
  Users,
  Activity,
  Award,
  DollarSign
} from 'lucide-react';
import { InvestigationReport } from '../types';

interface ReportsViewProps {
  caseId: string;
  reports: InvestigationReport[];
  onReportGenerated: () => void;
}

export default function ReportsView({ caseId, reports, onReportGenerated }: ReportsViewProps) {
  const [generating, setGenerating] = useState(false);
  const [reportTitle, setReportTitle] = useState('');
  const [selectedReport, setSelectedReport] = useState<InvestigationReport | null>(reports[0] || null);

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: reportTitle })
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to compile AI Analysis");
      }
      setReportTitle('');
      onReportGenerated();
      setSelectedReport(data.report);
    } catch (err: any) {
      alert(`Report Generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const activeReport = selectedReport || reports[0] || null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      
      {/* Sidebar - generated reports list */}
      <div className="space-y-4">
        
        {/* Generate triggers */}
        <div className="p-4 bg-[#0c0c0e] border border-white/5 rounded-xl space-y-4 shadow-xl">
          <h4 className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider">Generate Intelligence</h4>
          
          <div className="space-y-2.5">
            <input
              type="text"
              placeholder="e.g. Acme Shell Scheme Report"
              className="w-full bg-[#121214] border border-white/5 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              disabled={generating}
            />
            <button
              onClick={handleGenerateReport}
              disabled={generating}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-semibold text-white rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              {generating ? 'Compiling Triples...' : 'Evolve Intelligence'}
            </button>
          </div>
        </div>

        {/* List of past documents */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest px-2">Report Library</h4>
          {reports.map((rep) => (
            <button
              key={rep.id}
              onClick={() => setSelectedReport(rep)}
              className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-start gap-2.5 cursor-pointer ${
                activeReport?.id === rep.id
                  ? 'bg-[#121214] border-white/10 text-white'
                  : 'bg-[#0c0c0e]/40 border-white/5 text-slate-400 hover:border-white/10 hover:text-slate-300'
              }`}
            >
              <FileText className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold truncate text-slate-200">{rep.title}</p>
                <span className="text-[9px] font-mono opacity-60">Compiled: {new Date(rep.createdAt).toLocaleDateString()}</span>
              </div>
            </button>
          ))}

          {reports.length === 0 && (
            <div className="p-4 bg-black/20 border border-white/5 rounded-lg text-center text-slate-605 text-xs italic text-slate-600 font-mono">
              No reports synthesized.
            </div>
          )}
        </div>
      </div>

      {/* Main presentation pane */}
      <div className="lg:col-span-3">
        {activeReport ? (
          <div className="space-y-6">
            
            {/* Header */}
            <div className="p-6 bg-[#0c0c0e] border border-white/5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="px-2 py-0.5 bg-indigo-650/10 text-indigo-400 border border-indigo-600/20 rounded text-[9px] font-mono uppercase tracking-wider font-semibold">Intelligence Brief</span>
                <h3 className="text-xl font-bold text-white mt-1.5">{activeReport.title}</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">CASEID: {activeReport.caseId} • COMPILED: {new Date(activeReport.createdAt).toLocaleString()}</p>
              </div>
              <BookOpen className="w-8 h-8 text-zinc-800 hidden sm:block" />
            </div>

            {/* Grid Layout of Report Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Executive Summary */}
              <div className="p-5 bg-[#0c0c0e] border border-white/5 rounded-xl space-y-3 md:col-span-2">
                <h4 className="text-sm font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-400" />
                  Executive Summary
                </h4>
                <div className="text-xs text-slate-400 leading-relaxed font-sans whitespace-pre-wrap">
                  {activeReport.content.executiveSummary}
                </div>
              </div>

              {/* Entities & Attributes metrics */}
              <div className="p-5 bg-[#0c0c0e] border border-white/5 rounded-xl space-y-3">
                <h4 className="text-sm font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Entities Inventory / Attributes
                </h4>
                <div className="text-xs text-slate-400 leading-relaxed font-sans whitespace-pre-wrap bg-black/35 p-3 rounded-lg border border-white/5 font-mono">
                  {activeReport.content.entitiesAnalysis}
                </div>
              </div>

              {/* Advanced Relationship Triples representation */}
              <div className="p-5 bg-[#0c0c0e] border border-white/5 rounded-xl space-y-3">
                <h4 className="text-sm font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-amber-500" />
                  Semantic Relationship Map
                </h4>
                <div className="text-xs text-slate-400 leading-relaxed font-sans whitespace-pre-wrap bg-black/35 p-3 rounded-lg border border-white/5 font-mono">
                  {activeReport.content.relationshipAnalysis}
                </div>
              </div>

              {/* Alerts on Suspicious Links */}
              <div className="p-5 bg-red-950/15 border border-red-900/30 rounded-xl space-y-3 md:col-span-2">
                <h4 className="text-sm font-bold font-mono text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
                  Identified Suspicious Connections & Risk Vectors
                </h4>
                <div className="text-xs text-red-200/80 leading-relaxed font-sans whitespace-pre-wrap bg-red-950/10 p-3 rounded-lg border border-red-950/15">
                  {activeReport.content.suspiciousConnections}
                </div>
              </div>

              {/* Chronological Sequence */}
              <div className="p-5 bg-[#0c0c0e] border border-white/5 rounded-xl space-y-3">
                <h4 className="text-sm font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  Time Sequence & Chronotope
                </h4>
                <div className="text-xs text-slate-400 leading-relaxed font-sans whitespace-pre-wrap">
                  {activeReport.content.timeline}
                </div>
              </div>

              {/* Risk Level */}
              <div className="p-5 bg-[#0c0c0e] border border-white/5 rounded-xl space-y-3">
                <h4 className="text-sm font-bold font-mono text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  Investigation Risk Matrix
                </h4>
                <div className="text-xs text-slate-400 leading-relaxed font-sans whitespace-pre-wrap">
                  {activeReport.content.riskAssessment}
                </div>
              </div>

              {/* Recommended forensics action paths */}
              <div className="p-5 bg-[#121214] border border-white/5 rounded-xl space-y-3 md:col-span-2">
                <h4 className="text-sm font-bold font-mono text-indigo-451 text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-indigo-400 fill-indigo-900/10" />
                  Recommended Forensic Action Paths
                </h4>
                <div className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                  {activeReport.content.recommendedActions}
                </div>
              </div>

            </div>

          </div>
        ) : (
          <div className="h-[500px] border border-dashed border-white/5 rounded-xl bg-black/20 flex flex-col items-center justify-center text-slate-500 text-center p-6">
            <FileText className="w-16 h-16 text-slate-800 mb-3" />
            <h4 className="text-base font-semibold text-slate-300">No Intelligence Synthesized Yet</h4>
            <p className="text-xs text-slate-500 mt-1.5 max-w-md">Compile an updated executive report with entities, risk scores and chronological traces directly from the graph using the left-sidebar form.</p>
          </div>
        )}
      </div>

    </div>
  );
}
