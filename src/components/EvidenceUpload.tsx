/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  Layers, 
  CheckCircle, 
  X, 
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Database
} from 'lucide-react';
import { InvestigationDocument } from '../types';

interface EvidenceUploadProps {
  caseId: string;
  documents: InvestigationDocument[];
  onUploadSuccess: () => void;
}

export default function EvidenceUpload({ caseId, documents, onUploadSuccess }: EvidenceUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cognifyingDocId, setCognifyingDocId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    const validExtensions = ['txt', 'pdf', 'csv', 'docx'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (!extension || !validExtensions.includes(extension)) {
      setErrorMsg(`Invalid file type. Supported types are: ${validExtensions.join(', ').toUpperCase()}`);
      return;
    }

    setUploading(true);
    setErrorMsg(null);

    try {
      // Read file to Base64
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64String = (reader.result as string).split(',')[1];
          
          const response = await fetch(`/api/cases/${caseId}/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: file.name,
              base64Data: base64String,
              type: extension,
              size: file.size
            })
          });

          const result = await response.json();
          if (!result.success) {
            throw new Error(result.error || "Failed to upload document");
          }

          onUploadSuccess();
          
          // Immediately trigger cognitive processing! (Cognee cognify)
          await triggerCognify(result.document.id);
        } catch (err: any) {
          setErrorMsg(err.message || "Endpoint error uploading document");
          setUploading(false);
        }
      };
      
      reader.onerror = () => {
        setErrorMsg("Error translating file binary reader");
        setUploading(false);
      };
      
      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to read target file");
      setUploading(false);
    }
  };

  const triggerCognify = async (docId: string) => {
    setCognifyingDocId(docId);
    setErrorMsg(null);
    try {
      const response = await fetch(`/api/cases/${caseId}/documents/${docId}/cognify`, {
        method: 'POST'
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Cognee parsing cognitively failed");
      }
      onUploadSuccess();
    } catch (err: any) {
      setErrorMsg(`Cognify completed with errors or warning: ${err.message}`);
    } finally {
      setCognifyingDocId(null);
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Upload Zone & Stats Cards */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Main Card */}
        <div className="p-6 bg-[#0c0c0e] border border-white/5 rounded-xl shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-2">Ingest Investigative Evidence</h3>
          <p className="text-xs text-slate-400 mb-6">
            Upload interviews, bank logs, sensor traces or location transcripts.
            Every document will be processed into Cognee RDF Memory and resolved against existing nodes.
          </p>

          <div
            id="drop-zone"
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={onButtonClick}
            className={`w-full h-56 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all ${
              dragActive 
                ? 'border-indigo-500 bg-indigo-950/25 shadow-[0_0_15px_rgba(99,102,241,0.15)]' 
                : 'border-white/5 hover:border-white/10 bg-[#121214]/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".txt,.pdf,.csv,.docx"
              onChange={handleFileInputChange}
            />
            
            <div className="p-4 bg-[#121214] rounded-full border border-white/5 mb-4 text-indigo-400">
              <Upload className="w-8 h-8" />
            </div>
            
            <p className="text-sm font-semibold text-slate-200">
              {uploading ? 'Parsing and uploading...' : 'Drag and drop your file here, or click to browse'}
            </p>
            <p className="text-xs text-slate-500 mt-1.5 font-mono">
              Supports PDF, TXT, CSV, DOCX (Max size 40MB)
            </p>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="mt-4 p-3 bg-red-950/40 border border-red-900/60 text-red-200 text-xs rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Upload progress feedback */}
          {uploading && (
            <div className="mt-4 p-4 bg-indigo-950/30 border border-indigo-900/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-indigo-300 font-mono flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 animate-spin" />
                  {cognifyingDocId ? 'Cognee Extraction Agent Active (Cognifying)...' : 'Uploading evidence file...'}
                </span>
                <span className="text-slate-400 font-mono">Status: Processing</span>
              </div>
              <div className="w-full bg-[#121214] rounded-full h-1.5 overflow-hidden">
                <div className="bg-indigo-500 h-1.5 rounded-full animate-pulse" style={{ width: '85%' }}></div>
              </div>
              <p className="text-[10px] text-slate-400">
                {cognifyingDocId 
                  ? "Standard cognify() builds connections, maps triples into Firestore RDF collection, and resolves canonical identities." 
                  : "Parsing document text on secure backend..."
                }
              </p>
            </div>
          )}
        </div>

        {/* Cognitive Flow Summary Banner */}
        <div className="bg-[#121214]/60 border border-white/5 p-5 rounded-xl flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-indigo-400 font-mono tracking-wider uppercase">Active Cognitive Processing Pipeline</h4>
            <p className="text-xs text-slate-400">Cognee extracts canonical People, Locations, Banks, and Transactions and matches them semantic-by-semantic.</p>
          </div>
          <Layers className="w-8 h-8 text-indigo-500/80 animate-pulse hidden sm:block" />
        </div>
      </div>

      {/* Uploaded Evidence sidebar list */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold font-mono text-slate-300 uppercase tracking-wider">Ingested Case Documents</h4>
        
        <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
          {documents.map((doc) => (
            <div 
              key={doc.id} 
              className="p-3.5 bg-[#0c0c0e] border border-white/5 rounded-xl hover:border-white/10 transition-colors space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-2 bg-[#121214] border border-white/5 text-slate-400 rounded-lg">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-semibold text-slate-200 truncate">{doc.name}</h5>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase">{doc.type} • {formatSize(doc.size)}</p>
                  </div>
                </div>
                
                {/* Status Indicator */}
                {(doc as any).cognified ? (
                  <span className="p-1 text-emerald-400" title="Resolved and Cognified into Brain Graph">
                    <CheckCircle className="w-4 h-4 fill-emerald-950/60" />
                  </span>
                ) : (
                  <button
                    onClick={() => triggerCognify(doc.id)}
                    disabled={cognifyingDocId === doc.id}
                    className="px-2 py-1 bg-amber-950/60 hover:bg-amber-900 border border-amber-800/60 rounded text-[10px] font-mono text-amber-250 transition-all cursor-pointer flex items-center gap-1 text-amber-200"
                  >
                    <Clock className="w-3 h-3 text-amber-400" />
                    Cognify
                  </button>
                )}
              </div>

              {/* Collapsible content teaser */}
              <div className="bg-black/30 border border-white/5 p-2 rounded text-[10px] font-mono text-slate-400 max-h-20 overflow-y-auto select-none">
                {doc.content?.substring(0, 180)}...
              </div>

              <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                <span>Ingested: {new Date(doc.createdAt).toLocaleDateString()}</span>
                { (doc as any).cognified && <span className="text-indigo-400 font-bold uppercase">Cognee Active</span> }
              </div>
            </div>
          ))}

          {documents.length === 0 && (
            <div className="p-6 border border-dashed border-white/5 text-slate-500 rounded-xl text-center">
              <p className="text-xs">No documents ingested for this investigation yet.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
