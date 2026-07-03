/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Case {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  userId: string;
}

export interface InvestigationDocument {
  id: string;
  caseId: string;
  name: string;
  type: string;
  size: number;
  content: string;
  createdAt: string;
}

export type EntityType = 'person' | 'company' | 'account' | 'location' | 'date' | 'transaction';

export interface InvestigationEntity {
  id: string;
  caseId: string;
  documentId?: string;
  name: string;
  type: EntityType;
  metadata?: Record<string, string>;
}

export type RelationshipType = 
  | 'works_at' 
  | 'owns' 
  | 'transferred_to' 
  | 'associated_with' 
  | 'met_with' 
  | 'located_at';

export interface InvestigationRelationship {
  id: string;
  caseId: string;
  documentId?: string;
  source: string; // Name of active source entity
  target: string; // Name of active target entity
  type: RelationshipType;
  description: string;
}

export interface InvestigationReport {
  id: string;
  caseId: string;
  title: string;
  content: {
    executiveSummary: string;
    entitiesAnalysis: string;
    relationshipAnalysis: string;
    suspiciousConnections: string;
    timeline: string;
    riskAssessment: string;
    recommendedActions: string;
  };
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}
