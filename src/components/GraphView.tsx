/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
  Node,
  Edge,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { InvestigationEntity, InvestigationRelationship, EntityType } from '../types';
import { 
  User, 
  Briefcase, 
  CreditCard, 
  MapPin, 
  Calendar, 
  DollarSign, 
  AlertTriangle,
  ZoomIn,
  RefreshCw,
  Search
} from 'lucide-react';

interface GraphViewProps {
  entities: InvestigationEntity[];
  relationships: InvestigationRelationship[];
  onSelectNode?: (entity: InvestigationEntity) => void;
}

const ENTITY_COLORS: Record<EntityType, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  person: { 
    bg: 'bg-blue-950/80', 
    border: 'border-blue-500', 
    text: 'text-blue-300',
    icon: <User className="w-4 h-4 text-blue-400" />
  },
  company: { 
    bg: 'bg-amber-950/80', 
    border: 'border-amber-500', 
    text: 'text-amber-300',
    icon: <Briefcase className="w-4 h-4 text-amber-400" />
  },
  account: { 
    bg: 'bg-emerald-950/80', 
    border: 'border-emerald-500', 
    text: 'text-emerald-300',
    icon: <CreditCard className="w-4 h-4 text-emerald-400" />
  },
  location: { 
    bg: 'bg-rose-950/80', 
    border: 'border-rose-500', 
    text: 'text-rose-300',
    icon: <MapPin className="w-4 h-4 text-rose-400" />
  },
  date: { 
    bg: 'bg-purple-950/80', 
    border: 'border-purple-500', 
    text: 'text-purple-300',
    icon: <Calendar className="w-4 h-4 text-purple-400" />
  },
  transaction: { 
    bg: 'bg-cyan-950/80', 
    border: 'border-cyan-500', 
    text: 'text-cyan-300',
    icon: <DollarSign className="w-4 h-4 text-cyan-400" />
  }
};

export default function GraphView({ entities, relationships, onSelectNode }: GraphViewProps) {
  const [activeFilters, setActiveFilters] = useState<Record<EntityType, boolean>>({
    person: true,
    company: true,
    account: true,
    location: true,
    date: true,
    transaction: true
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightSuspicious, setHighlightSuspicious] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<InvestigationEntity | null>(null);

  const toggleFilter = (type: EntityType) => {
    setActiveFilters(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const filteredEntities = useMemo(() => {
    return entities.filter(ent => {
      const matchesFilter = activeFilters[ent.type];
      const matchesSearch = ent.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (ent.metadata && Object.values(ent.metadata).some(val => val.toLowerCase().includes(searchTerm.toLowerCase())));
      return matchesFilter && matchesSearch;
    });
  }, [entities, activeFilters, searchTerm]);

  // Arrange nodes cleanly in a radial/grid shape so they never bundle together
  const { nodes, edges } = useMemo(() => {
    const arrangedNodes: Node[] = [];
    const arrangedEdges: Edge[] = [];
    
    if (filteredEntities.length === 0) return { nodes: [], edges: [] };

    const entityNamesSet = new Set(filteredEntities.map(e => e.name.toLowerCase()));

    // Radial layout configuration
    const centerX = 350;
    const centerY = 250;
    const radius = Math.max(150, filteredEntities.length * 25);

    filteredEntities.forEach((ent, index) => {
      const angle = (index / filteredEntities.length) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      const colorSet = ENTITY_COLORS[ent.type];
      const isSuspicious = highlightSuspicious && (
        ent.type === 'transaction' || 
        ent.name.toLowerCase().includes('suspect') ||
        ent.name.toLowerCase().includes('shell') ||
        (ent.metadata && Object.values(ent.metadata).some(v => String(v).toLowerCase().includes('suspicious') || String(v).toLowerCase().includes('unknown')))
      );

      arrangedNodes.push({
        id: ent.name,
        position: { x, y },
        data: {
          label: (
            <div 
              className={`p-3 rounded-lg border-2 ${colorSet.bg} ${colorSet.border} ${isSuspicious ? 'animate-pulse border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'shadow-lg'} transition-all hover:scale-105 cursor-pointer max-w-[200px] text-left`}
              onClick={() => {
                setSelectedEntity(ent);
                if (onSelectNode) onSelectNode(ent);
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {colorSet.icon}
                <span className="text-[10px] font-mono tracking-wider uppercase opacity-80">{ent.type}</span>
              </div>
              <div className="font-semibold text-sm truncate text-white border-b border-white/10 pb-1 mb-1">
                {ent.name}
              </div>
              {ent.metadata && Object.entries(ent.metadata).slice(0, 2).map(([key, val]) => (
                <div key={key} className="text-[9px] text-slate-300 flex justify-between truncate">
                  <span className="opacity-60">{key}:</span>
                  <span className="font-mono">{val}</span>
                </div>
              ))}
            </div>
          )
        },
        style: {
          background: 'transparent',
          border: 'none',
          padding: 0,
          width: 'auto'
        }
      });
    });

    // Populate active connections
    relationships.forEach((rel, index) => {
      // Direct string matches
      const sourceExists = entityNamesSet.has(rel.source.toLowerCase());
      const targetExists = entityNamesSet.has(rel.target.toLowerCase());

      if (sourceExists && targetExists) {
        const isSuspiciousRel = highlightSuspicious && (
          rel.type === 'transferred_to' || 
          rel.description.toLowerCase().includes('suspicious') ||
          rel.description.toLowerCase().includes('wire') ||
          rel.description.toLowerCase().includes('offshore')
        );

        arrangedEdges.push({
          id: `e-${index}-${rel.source}-${rel.target}`,
          source: rel.source,
          target: rel.target,
          label: rel.type.replace('_', ' '),
          animated: isSuspiciousRel || rel.type === 'transferred_to',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isSuspiciousRel ? '#ef4444' : '#64748b',
          },
          style: { 
            stroke: isSuspiciousRel ? '#ef4444' : '#475569',
            strokeWidth: isSuspiciousRel ? 3 : 1.5,
          },
          labelStyle: { 
            fill: isSuspiciousRel ? '#f87171' : '#94a3b8', 
            fontWeight: 600, 
            fontSize: '9px',
            fontFamily: 'monospace'
          },
          labelBgStyle: { 
            fill: '#0f172a', 
            fillOpacity: 0.85 
          }
        });
      }
    });

    return { nodes: arrangedNodes, edges: arrangedEdges };
  }, [filteredEntities, relationships, highlightSuspicious, onSelectNode]);

  return (
    <div className="w-full h-[650px] bg-[#121214] border border-white/5 rounded-xl overflow-hidden flex flex-col relative">
      
      {/* Top action bar */}
      <div className="p-4 border-b border-white/5 bg-[#0c0c0e]/90 flex flex-col md:flex-row md:items-center justify-between gap-4 z-10">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping"></span>
            Cognee Cognitive Memory Graph
          </h3>
          <p className="text-xs text-slate-400 mt-1">Interactive visualization of extracted, canonical entities resolved across sessions</p>
        </div>
        
        {/* Graph search and highlighters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search graph..."
              className="pl-9 pr-4 py-1.5 w-48 bg-[#0c0c0e] border border-white/10 text-xs rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setHighlightSuspicious(!highlightSuspicious)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
              highlightSuspicious 
                ? 'bg-red-950/70 border-red-800 text-red-200 shadow-[0_0_10px_rgba(239,68,68,0.2)]' 
                : 'bg-[#0c0c0e] border-white/10 text-slate-300 hover:bg-white/5'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
             suspicious paths
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-white/5 bg-[#0c0c0e]/50 z-10 text-xs">
        <span className="text-slate-400 mr-2 font-medium">Filter Nodes:</span>
        {(Object.keys(ENTITY_COLORS) as EntityType[]).map((type) => (
          <button
            key={type}
            onClick={() => toggleFilter(type)}
            className={`px-2.5 py-1 rounded-md border text-[11px] font-mono flex items-center gap-1.5 transition-all ${
              activeFilters[type]
                ? 'bg-[#121214] text-slate-100 border-white/15'
                : 'opacity-40 border-transparent text-slate-500 bg-transparent'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              type === 'person' ? 'bg-indigo-500' :
              type === 'company' ? 'bg-amber-500' :
              type === 'account' ? 'bg-emerald-500' :
              type === 'location' ? 'bg-rose-500' :
              type === 'date' ? 'bg-purple-500' : 'bg-cyan-500'
            }`}></span>
            {type}
          </button>
        ))}
      </div>

      {/* Main Canvas & Sidebar layout */}
      <div className="flex-1 flex flex-col lg:flex-row relative">
        <div className="flex-1 h-full min-h-[400px]">
          {nodes.length > 0 ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              attributionPosition="bottom-right"
              className="bg-[#09090b]"
            >
              <Background color="#27272a" gap={16} size={1} />
              <Controls />
              <MiniMap 
                nodeStrokeColor={(n) => '#27272a'}
                nodeColor={(n) => '#121214'}
                maskColor="rgba(9, 9, 11, 0.6)"
              />
            </ReactFlow>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-[#09090b] p-6">
              <ZoomIn className="w-12 h-12 mb-3 text-slate-700 stroke-[1.5]" />
              <p className="text-sm">No resolved entities mapped to graph yet.</p>
              <p className="text-xs text-slate-600 mt-1">Upload files under the Evidence tab and click "Cognify" to auto-build CaseMemory.</p>
            </div>
          )}
        </div>

        {/* Selected Entity Card Detail Panel */}
        {selectedEntity && (
          <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-white/10 bg-[#0c0c0e]/95 p-4 overflow-y-auto max-h-[300px] lg:max-h-full z-10 flex flex-col">
            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
              <h4 className="text-sm font-semibold text-slate-200 font-mono uppercase tracking-wider">Entity Inspector</h4>
              <button 
                onClick={() => setSelectedEntity(null)} 
                className="text-slate-500 hover:text-slate-300 text-xs text-[10px] font-mono"
              >
                Close
              </button>
            </div>
            
            <div className={`p-3 rounded-lg border ${ENTITY_COLORS[selectedEntity.type].bg} ${ENTITY_COLORS[selectedEntity.type].border} mb-4`}>
              <div className="flex items-center gap-2 mb-1.5">
                {ENTITY_COLORS[selectedEntity.type].icon}
                <span className="text-[10px] font-mono uppercase tracking-wider text-white/70">{selectedEntity.type}</span>
              </div>
              <h5 className="font-bold text-base text-white break-words">{selectedEntity.name}</h5>
            </div>

            <div className="space-y-4 flex-1">
              {selectedEntity.metadata && Object.keys(selectedEntity.metadata).length > 0 ? (
                <div>
                   <h6 className="text-[11px] font-mono text-slate-400 mb-1.5 uppercase tracking-wider">Extracted Attributes</h6>
                  <div className="bg-[#121214] rounded-lg border border-white/5 p-2 space-y-2">
                    {Object.entries(selectedEntity.metadata).map(([key, value]) => (
                      <div key={key} className="text-xs flex flex-col">
                        <span className="text-slate-500 text-[10px] uppercase font-mono">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span className="text-slate-200 mt-0.5 break-words bg-[#0c0c0e] p-1 rounded border border-white/5 font-mono">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No custom attributes extracted for this entity.</p>
              )}

              {/* Find adjacent relations */}
              <div>
                <h6 className="text-[11px] font-mono text-slate-400 mb-1.5 uppercase tracking-wider">Resolved Connections</h6>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {relationships
                    .filter(r => r.source.toLowerCase() === selectedEntity.name.toLowerCase() || r.target.toLowerCase() === selectedEntity.name.toLowerCase())
                    .map((r, i) => {
                      const isSource = r.source.toLowerCase() === selectedEntity.name.toLowerCase();
                      const otherNode = isSource ? r.target : r.source;
                      return (
                        <div key={i} className="text-xs bg-[#121214] border border-white/5 p-2 rounded-lg hover:border-white/10 transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-white truncate max-w-[120px]">{otherNode}</span>
                            <span className="text-[9px] px-1.5 py-0.5 bg-indigo-950/60 rounded font-mono text-indigo-400 font-semibold border border-indigo-900/30">
                              {r.type.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400">{r.description}</p>
                        </div>
                      );
                    })}
                  {relationships.filter(r => r.source.toLowerCase() === selectedEntity.name.toLowerCase() || r.target.toLowerCase() === selectedEntity.name.toLowerCase()).length === 0 && (
                    <p className="text-xs text-slate-600 italic">No connections resolved.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
