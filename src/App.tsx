/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut,
  auth, 
  googleProvider,
  User
} from './firebaseClient';
import { Case, InvestigationDocument, InvestigationEntity, InvestigationRelationship, InvestigationReport } from './types';
import CaseList from './components/CaseList';
import EvidenceUpload from './components/EvidenceUpload';
import GraphView from './components/GraphView';
import InvestigationChat from './components/InvestigationChat';
import ReportsView from './components/ReportsView';
import { 
  Bot, 
  FolderOpen, 
  Network, 
  Layers, 
  BookOpen, 
  MessageSquare,
  LogOut, 
  User as UserIcon,
  Search,
  Activity,
  Database,
  ShieldCheck,
  ChevronLeft,
  Chrome,
  Terminal,
  Clock
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sandboxMode, setSandboxMode] = useState(false);
  const [sandboxUser, setSandboxUser] = useState<string>("sandbox_investigator");

  // Core Data Stores
  const [cases, setCases] = useState<Case[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  
  // Active Case Details
  const [caseDetails, setCaseDetails] = useState<{
    caseData: Case | null;
    documents: InvestigationDocument[];
    entities: InvestigationEntity[];
    relationships: InvestigationRelationship[];
    reports: InvestigationReport[];
  }>({
    caseData: null,
    documents: [],
    entities: [],
    relationships: [],
    reports: []
  });
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'graph' | 'evidence' | 'chat' | 'reports'>('graph');
  const [cogneeCloudActive, setCogneeCloudActive] = useState(false);
  const [cogneeCloudUrl, setCogneeCloudUrl] = useState("https://api.cognee.ai");

  // Fetch Cognee cloud integration status from the backend
  useEffect(() => {
    fetch('/api/cognee/status')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCogneeCloudActive(data.active);
          setCogneeCloudUrl(data.endpoint);
        }
      })
      .catch(err => console.error("Error fetching Cognee Cloud active states:", err));
  }, []);

  // Track Firebase Authentication State Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usr) => {
      if (usr) {
        setUser(usr);
        setSandboxMode(false);
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync cases lists
  const currentUserId = user ? user.uid : (sandboxMode ? sandboxUser : "");
  
  const fetchCases = async () => {
    if (!currentUserId) return;
    setLoadingCases(true);
    try {
      const response = await fetch(`/api/cases?userId=${currentUserId}`);
      const data = await response.json();
      if (data.success) {
        setCases(data.cases);
        // Automatically select the first case if none is active
        if (data.cases.length > 0 && !activeCaseId) {
          // Keep it unselected by default so they see the dashboard list, or auto-select!
        }
      }
    } catch (e) {
      console.error("Error fetching cases list:", e);
    } finally {
      setLoadingCases(false);
    }
  };

  useEffect(() => {
    if (currentUserId) {
      fetchCases();
    } else {
      setCases([]);
      setActiveCaseId(null);
    }
  }, [currentUserId]);

  const fetchActiveCaseDetails = async () => {
    if (!activeCaseId) return;
    setLoadingDetails(true);
    try {
      const response = await fetch(`/api/cases/${activeCaseId}/details`);
      const data = await response.json();
      if (data.success) {
        setCaseDetails({
          caseData: data.caseData,
          documents: data.documents,
          entities: data.entities,
          relationships: data.relationships,
          reports: data.reports
        });
      }
    } catch (e) {
      console.error("Error fetching active case profile:", e);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (activeCaseId) {
      fetchActiveCaseDetails();
    } else {
      setCaseDetails({
        caseData: null,
        documents: [],
        entities: [],
        relationships: [],
        reports: []
      });
    }
  }, [activeCaseId]);

  // Actions
  const handleCreateCase = async (name: string, description: string) => {
    if (!currentUserId) return;
    const response = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, userId: currentUserId })
    });
    const data = await response.json();
    if (data.success) {
      await fetchCases();
      setActiveCaseId(data.case.id);
    } else {
      throw new Error(data.error);
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    const response = await fetch(`/api/cases/${caseId}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (data.success) {
      if (activeCaseId === caseId) {
        setActiveCaseId(null);
      }
      await fetchCases();
    } else {
      throw new Error(data.error);
    }
  };

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      console.warn("Popup blocked or declined. Auto-activating seamless Sandbox Mode.");
      activateSandbox();
    }
  };

  const activateSandbox = () => {
    setSandboxMode(true);
    setUser(null);
  };

  const handleSignOut = async () => {
    if (sandboxMode) {
      setSandboxMode(false);
    } else {
      await signOut(auth);
    }
    setActiveCaseId(null);
  };

  if (authLoading) {
    return (
      <div className="w-full h-screen bg-[#09090b] flex flex-col items-center justify-center font-mono text-xs text-slate-500">
        <Database className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <span>CONNECTING TO CASE_MIND SECURITIES...</span>
      </div>
    );
  }

  // LOGIN PAGE
  if (!user && !sandboxMode) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        
        {/* Investigative radar backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-indigo-950/20 rounded-full pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-indigo-900/10 rounded-full pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] border border-indigo-500/10 rounded-full pointer-events-none animate-pulse"></div>

        <div className="w-full max-w-lg space-y-8 z-10 text-center">
          
          {/* Logo Brand */}
          <div className="space-y-3">
            <div className="w-16 h-16 bg-[#0c0c0e] border border-white/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/10">
              <Bot className="w-9 h-9" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white font-sans">
                CaseMind <span className="text-indigo-455 font-bold text-indigo-400">AI</span>
              </h1>
              <span className="text-[10px] font-mono tracking-widest uppercase text-slate-500 bg-white/[0.04] px-3 py-1 rounded-full border border-white/5">
                Cognitive Intelligence & Graph Memory Agent
              </span>
            </div>
          </div>

          {/* Description details card */}
          <div className="p-6 bg-[#121214] border border-white/5 rounded-2xl text-left space-y-4 shadow-xl">
            <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest">Problem Statement Matrix</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Traditional LLMs are stateless and forget information between sessions. Investigators must repeatedly re-upload evidence and re-explain context.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed border-t border-white/5 pt-3">
              <strong className="text-indigo-400">CaseMind AI</strong> integrates a persistent <strong className="text-indigo-400">Cognee-inspired Cognitive Memory Layer</strong>. Under every case, documents are analyzed into unified entity networks and triples, preserving structural links permanently.
            </p>
          </div>

          {/* Actions panel */}
          <div className="space-y-3">
            <button
              onClick={handleSignIn}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-600/20"
            >
              <Chrome className="w-4 h-4 text-white" />
              Sign in with Google
            </button>
            
            <button
              onClick={activateSandbox}
              className="w-full py-3 bg-[#121214] hover:bg-white/5 border border-white/10 text-xs font-mono text-slate-400 hover:text-slate-100 rounded-xl transition-all cursor-pointer"
            >
              ENTER DEMO SANDBOX WORKSPACE (1-Click) &rarr;
            </button>
          </div>

          {/* Footer credentials */}
          <p className="text-[9px] font-mono text-slate-600 uppercase">
            SECURED END-TO-END VIA GOOGLE CLOUD AND FIRESTORE ARCHITECTURE
          </p>

        </div>
      </div>
    );
  }

  // MAIN DASHBOARD (CASE SELECTION & DOCKET MANAGER)
  return (
    <div className="min-h-screen bg-[#09090b] text-slate-300 flex flex-col font-sans">
      
      {/* Top Navigation */}
      <header className="border-b border-white/5 bg-[#0c0c0e]/80 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 rounded-lg flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-white font-sans">CaseMind</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 font-mono rounded uppercase tracking-wider font-semibold">Active</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">COGNEE_PERSISTENT_LOGS</span>
            </div>
          </div>

          {/* Investigator details and auth state */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col text-right font-mono text-[10px]">
              <span className="text-slate-300 truncate max-w-[200px]">{user ? user.displayName || user.email : "DEMO_SANDBOX_USER"}</span>
              <span className="text-slate-500">ROLE: INVESTIGATOR_CHIEF</span>
            </div>
            <div className="p-1 w-8 h-8 bg-[#121214] border border-white/5 rounded-lg flex items-center justify-center">
              {user ? (
                <img src={user.photoURL || undefined} alt="Avatar unicode" referrerPolicy="no-referrer" className="w-full h-full rounded-md object-cover" />
              ) : (
                <UserIcon className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 text-slate-500 hover:text-red-400 hover:bg-white/5 border border-transparent hover:border-white/10 rounded-lg transition-all cursor-pointer"
              title="Logout current terminal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Primary content router */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {!activeCaseId ? (
          
          // CASE FILES GRID DASHBOARD
          <div className="space-y-6">
            
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">Investigative Log Storage</h2>
              <p className="text-xs text-slate-500">Select an existing cryptographic docket to build semantic triples or review findings.</p>
            </div>

            {loadingCases ? (
              <div className="p-24 text-center font-mono text-xs text-slate-500 space-y-2">
                <Clock className="w-6 h-6 mx-auto animate-spin text-blue-500" />
                <span>RETRIEVING CASE SECURES FROM CLOUD CLUSTERS...</span>
              </div>
            ) : (
              <CaseList
                cases={cases}
                activeCaseId={activeCaseId}
                onSelectCase={setActiveCaseId}
                onCreateCase={handleCreateCase}
                onDeleteCase={handleDeleteCase}
                loading={loadingCases}
              />
            )}

          </div>

        ) : (
          
          // DOCKET DETAILS SUBTAB DIRECTORY
          <div className="space-y-6">
            
            {/* Header toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b border-white/5 pb-5 gap-4">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => setActiveCaseId(null)}
                  className="p-2 bg-[#0c0c0e]/60 border border-white/10 rounded-lg hover:border-white/20 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                  title="Return to cases panel"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-white tracking-tight">{caseDetails.caseData?.name}</h2>
                    <span className="px-2 py-0.5 bg-indigo-650/10 text-indigo-400 border border-indigo-600/20 text-[9px] font-mono font-semibold rounded uppercase">Docket Active</span>
                    
                    {cogneeCloudActive ? (
                      <span 
                        className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono font-bold rounded uppercase flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(16,185,129,0.05)]"
                        title={`Real-time graph persistent synchronisation routed directly to Cognee Cloud at: ${cogneeCloudUrl}`}
                      >
                        <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse"></span>
                        Cognee Cloud Connected
                      </span>
                    ) : (
                      <span 
                        className="px-2 py-0.5 bg-white/[0.02] text-slate-400 border border-white/5 text-[9px] font-mono font-medium rounded uppercase flex items-center gap-1.5"
                        title="Using the in-app built-in Cognee-inspired Cognitive Memory Engine stored on Firestore dockets without tokens"
                      >
                        <span className="w-1 h-1 bg-indigo-400 rounded-full"></span>
                        Cognee Local Memory
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5 max-w-2xl">{caseDetails.caseData?.description}</p>
                </div>
              </div>

              {/* Status statistics tag summary */}
              <div className="flex flex-wrap gap-4 text-xs font-mono bg-[#121214] p-3 rounded-lg border border-white/5">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                  <span className="text-slate-500">Docs:</span>
                  <span className="font-semibold text-slate-200">{caseDetails.documents.length}</span>
                </div>
                <div className="flex items-center gap-1.5 border-l border-r border-white/5 px-4">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                  <span className="text-slate-500">Entities:</span>
                  <span className="font-semibold text-slate-200">{caseDetails.entities.length}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                  <span className="text-slate-500">Reports:</span>
                  <span className="font-semibold text-slate-200">{caseDetails.reports.length}</span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-white/5 -mx-4 px-4 sm:mx-0 sm:px-0">
              <button
                onClick={() => setActiveTab('graph')}
                className={`py-3 px-4 border-b-2 font-mono text-[11px] uppercase tracking-wider font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'graph'
                    ? 'border-indigo-500 text-white bg-indigo-600/10'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <Network className="w-4 h-4" />
                Case Graph View
              </button>
              <button
                onClick={() => setActiveTab('evidence')}
                className={`py-3 px-4 border-b-2 font-mono text-[11px] uppercase tracking-wider font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'evidence'
                    ? 'border-indigo-500 text-white bg-indigo-600/10'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <Layers className="w-4 h-4 text-indigo-400" />
                Evidence Locker
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`py-3 px-4 border-b-2 font-mono text-[11px] uppercase tracking-wider font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'chat'
                    ? 'border-indigo-500 text-white bg-indigo-600/10'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Investigation Chat
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`py-3 px-4 border-b-2 font-mono text-[11px] uppercase tracking-wider font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'reports'
                    ? 'border-indigo-500 text-white bg-indigo-600/10'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Reports Generator
              </button>
            </div>

            {/* active tab view panel */}
            <div className="pt-2">
              {loadingDetails && caseDetails.documents.length === 0 ? (
                <div className="py-24 text-center font-mono text-xs text-slate-500">
                  <Clock className="w-6 h-6 mx-auto animate-spin text-indigo-500" />
                  <span>SYNCHRONIZING COGNITIVE MEMORIES...</span>
                </div>
              ) : (
                <>
                  {activeTab === 'graph' && (
                    <GraphView 
                      entities={caseDetails.entities} 
                      relationships={caseDetails.relationships} 
                    />
                  )}
                  {activeTab === 'evidence' && (
                    <EvidenceUpload 
                      caseId={activeCaseId} 
                      documents={caseDetails.documents} 
                      onUploadSuccess={fetchActiveCaseDetails}
                    />
                  )}
                  {activeTab === 'chat' && (
                    <InvestigationChat 
                      caseId={activeCaseId} 
                      onRefreshGraph={fetchActiveCaseDetails}
                    />
                  )}
                  {activeTab === 'reports' && (
                    <ReportsView 
                      caseId={activeCaseId} 
                      reports={caseDetails.reports} 
                      onReportGenerated={fetchActiveCaseDetails}
                    />
                  )}
                </>
              )}
            </div>

          </div>
        )}

      </main>

    </div>
  );
}
