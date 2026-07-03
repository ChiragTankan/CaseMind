/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { initializeApp as initializeClientApp } from "firebase/app";
import { 
  getFirestore as getClientFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  writeBatch 
} from "firebase/firestore";

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

const PORT = 3000;

enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class ClientFirestoreDoc {
  private dbInstance: any;
  private colPath: string;
  private docId: string;
  
  constructor(dbInstance: any, colPath: string, docId: string) {
    this.dbInstance = dbInstance;
    this.colPath = colPath;
    this.docId = docId;
  }
  
  get ref() {
    return doc(this.dbInstance, this.colPath, this.docId);
  }
  
  async get() {
    try {
      const docRef = doc(this.dbInstance, this.colPath, this.docId);
      const snap = await getDoc(docRef);
      return {
        exists: snap.exists(),
        id: snap.id,
        ref: docRef,
        data: () => snap.data()
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${this.colPath}/${this.docId}`);
    }
  }
  
  async update(data: any) {
    try {
      const docRef = doc(this.dbInstance, this.colPath, this.docId);
      await updateDoc(docRef, data);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${this.colPath}/${this.docId}`);
    }
  }
  
  async delete() {
    try {
      const docRef = doc(this.dbInstance, this.colPath, this.docId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${this.colPath}/${this.docId}`);
    }
  }
}

class ClientFirestoreCollection {
  private dbInstance: any;
  private colPath: string;
  private queryConstraints: any[];
  
  constructor(dbInstance: any, colPath: string, constraints: any[] = []) {
    this.dbInstance = dbInstance;
    this.colPath = colPath;
    this.queryConstraints = constraints;
  }
  
  doc(id: string) {
    return new ClientFirestoreDoc(this.dbInstance, this.colPath, id);
  }
  
  where(field: string, op: any, value: any) {
    return new ClientFirestoreCollection(this.dbInstance, this.colPath, [
      ...this.queryConstraints,
      where(field, op, value)
    ]);
  }
  
  orderBy(field: string, dir: "asc" | "desc" = "asc") {
    return new ClientFirestoreCollection(this.dbInstance, this.colPath, [
      ...this.queryConstraints,
      orderBy(field, dir)
    ]);
  }
  
  async add(data: any) {
    try {
      const colRef = collection(this.dbInstance, this.colPath);
      const docRef = await addDoc(colRef, data);
      return { id: docRef.id };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, this.colPath);
    }
  }
  
  async get() {
    try {
      const colRef = collection(this.dbInstance, this.colPath);
      const q = query(colRef, ...this.queryConstraints);
      const snapshot = await getDocs(q);
      return {
        docs: snapshot.docs.map(snap => ({
          id: snap.id,
          ref: doc(this.dbInstance, this.colPath, snap.id),
          data: () => snap.data()
        }))
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, this.colPath);
    }
  }
}

class ClientFirestoreBatch {
  private batchInstance: any;
  private colPath: string;
  
  constructor(dbInstance: any, colPath: string = "batch") {
    this.batchInstance = writeBatch(dbInstance);
    this.colPath = colPath;
  }
  
  delete(ref: any) {
    this.batchInstance.delete(ref);
    return this;
  }
  
  async commit() {
    try {
      await this.batchInstance.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, this.colPath);
    }
  }
}

class ClientFirestoreWrapper {
  private dbInstance: any;
  
  constructor(app: any, databaseId?: string) {
    this.dbInstance = databaseId ? getClientFirestore(app, databaseId) : getClientFirestore(app);
  }
  
  collection(path: string) {
    return new ClientFirestoreCollection(this.dbInstance, path);
  }
  
  batch() {
    return new ClientFirestoreBatch(this.dbInstance);
  }
}

// Initialize Firebase Client Wrapper
let db: any = null;
try {
  let firebaseConfig: any = {};
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }

  const clientApp = initializeClientApp({
    apiKey: firebaseConfig.apiKey || "AIzaSyBS5TYRFru6eJmfzxJG-FrdapO_rPyRXn4",
    authDomain: firebaseConfig.authDomain || "viral-clip-pipeline.firebaseapp.com",
    projectId: firebaseConfig.projectId || "viral-clip-pipeline",
    storageBucket: firebaseConfig.storageBucket || "viral-clip-pipeline.firebasestorage.app",
    messagingSenderId: firebaseConfig.messagingSenderId || "200456172335",
    appId: firebaseConfig.appId || "1:200456172335:web:9a9023104a4ac447e127da"
  });

  const databaseId = firebaseConfig.firestoreDatabaseId || "ai-studio-a5b302e6-80ab-4f01-a26e-c49e60273031";
  db = new ClientFirestoreWrapper(clientApp, databaseId);
  console.log(`Firebase Client SDK initialized connected to database: ${databaseId}`);
} catch (error) {
  console.error("Firebase Client SDK initialization error:", error);
}

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY environment variable is not defined!");
}
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

const COGNEE_BASE_URL = (process.env.COGNEE_BASE_URL || process.env.COGNEE_SERVICE_URL || process.env.COGNEE_API_URL || "https://tenant-233d89dc-0e45-41ec-a943-ed9dd4482dab.aws.cognee.ai").replace(/\/$/, "");
const COGNEE_API_KEY = process.env.COGNEE_API_KEY || "b706bb0ac1611398e9b5862f7de7c3304df6008bb53bfb2b0a6b4bc7ce543836";

// Dynamically import pdf-parse safely using createRequire for ESM compatibility
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

export const appPromise = (async () => {
  const app = express();
  
  // Use large body parser limits for document ingestion
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // API Routes:
  
  // Cognee Integration Configuration Status
  app.get("/api/cognee/status", (req, res) => {
    res.json({
      success: true,
      active: !!COGNEE_API_KEY && COGNEE_API_KEY.trim() !== "",
      endpoint: COGNEE_BASE_URL
    });
  });

  app.get("/api/debug-env", (req, res) => {
    res.json({
      project: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT,
      hasGoogleCreds: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      keys: Object.keys(process.env).filter(k => k.toLowerCase().includes("google") || k.toLowerCase().includes("firebase") || k.toLowerCase().includes("project"))
    });
  });
  
  // Create / Get Cases
  app.get("/api/cases", async (req, res) => {
    try {
      const userId = req.query.userId as string || "sandbox_investigator";
      if (!db) {
        return res.json({ success: true, cases: [] });
      }
      
      const snapshot = await db.collection("cases")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .get();
        
      const cases = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      res.json({ success: true, cases });
    } catch (error: any) {
      console.error("Error fetching cases:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/cases", async (req, res) => {
    try {
      const { name, description, userId } = req.body;
      const uId = userId || "sandbox_investigator";
      
      if (!name) {
        return res.status(400).json({ success: false, error: "Case name is required" });
      }
      
      if (!db) return res.status(500).json({ success: false, error: "Database not available" });
      
      const newCase = {
        name,
        description: description || "",
        userId: uId,
        createdAt: new Date().toISOString()
      };
      
      const docRef = await db.collection("cases").add(newCase);
      res.json({ success: true, case: { id: docRef.id, ...newCase } });
    } catch (error: any) {
      console.error("Error creating case:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete("/api/cases/:id", async (req, res) => {
    try {
      const caseId = req.params.id;
      if (!db) return res.status(500).json({ success: false, error: "Database not available" });
      
      // Clean up case, documents, entities, relationships, reports
      await db.collection("cases").doc(caseId).delete();
      
      const collectionsToClean = ["documents", "entities", "relationships", "reports"];
      for (const col of collectionsToClean) {
        const snapshot = await db.collection(col).where("caseId", "==", caseId).get();
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting case:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Get Case Complete Details (Aggregated data)
  app.get("/api/cases/:id/details", async (req, res) => {
    try {
      const caseId = req.params.id;
      if (!db) return res.status(500).json({ success: false, error: "Database not available" });
      
      const caseDoc = await db.collection("cases").doc(caseId).get();
      if (!caseDoc.exists) {
        return res.status(404).json({ success: false, error: "Case not found" });
      }
      
      const [docsSnap, entitiesSnap, relsSnap, reportsSnap] = await Promise.all([
        db.collection("documents").where("caseId", "==", caseId).orderBy("createdAt", "desc").get(),
        db.collection("entities").where("caseId", "==", caseId).get(),
        db.collection("relationships").where("caseId", "==", caseId).get(),
        db.collection("reports").where("caseId", "==", caseId).orderBy("createdAt", "desc").get()
      ]);
      
      const documents = docsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const entities = entitiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const relationships = relsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const reports = reportsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      res.json({
        success: true,
        caseData: {
          id: caseDoc.id,
          ...caseDoc.data(),
        },
        documents,
        entities,
        relationships,
        reports
      });
    } catch (error: any) {
      console.error("Error fetching case details:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Upload Evidence Document
  app.post("/api/cases/:id/documents", async (req, res) => {
    try {
      const caseId = req.params.id;
      const { name, base64Data, type, size } = req.body;
      
      if (!name || !base64Data) {
        return res.status(400).json({ success: false, error: "Document name and raw evidence are required" });
      }
      
      if (!db) return res.status(500).json({ success: false, error: "Database not available" });
      
      const buffer = Buffer.from(base64Data, 'base64');
      let textContent = "";
      
      const fileType = type || name.split('.').pop()?.toLowerCase() || 'txt';
      
      if (fileType === 'pdf') {
        try {
          const parsed = await pdfParse(buffer);
          textContent = parsed.text;
        } catch (err: any) {
          console.error("PDF Parse error, fallback to visual mock parsing:", err);
          textContent = buffer.toString('utf-8');
        }
      } else if (fileType === 'csv') {
        const rawText = buffer.toString('utf-8');
        textContent = rawText;
      } else if (fileType === 'docx') {
        // Fallback or binary text decoding for DOCX
        textContent = buffer.toString('utf-8').replace(/[^\x20-\x7E\r\n\t]/g, '');
      } else {
        textContent = buffer.toString('utf-8');
      }
      
      if (!textContent.trim()) {
        textContent = `[Parsed empty file content or binary format for ${name}]`;
      }
      
      const newDoc = {
        caseId,
        name,
        type: fileType,
        size: size || buffer.length,
        content: textContent,
        createdAt: new Date().toISOString()
      };
      
      const docRef = await db.collection("documents").add(newDoc);
      res.json({ success: true, document: { id: docRef.id, ...newDoc } });
    } catch (error: any) {
      console.error("Error saving document:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Cognee-inspired Entity & Relationship Extraction (Cognify Engine)
  app.post("/api/cases/:id/documents/:docId/cognify", async (req, res) => {
    try {
      const { id: caseId, docId } = req.params;
      if (!db) return res.status(500).json({ success: false, error: "Database not available" });
      
      const docSnapshot = await db.collection("documents").doc(docId).get();
      if (!docSnapshot.exists) {
        return res.status(404).json({ success: false, error: "Document not found" });
      }
      
      const document = docSnapshot.data();
      const content = document?.content || "";
      
      // Integrate real Cognee Cloud SaaS long-term memory via the Cognee Cloud Memory Skill REST API.
      let cogneeCloudStatus = "Inactive";
      
      if (COGNEE_API_KEY && COGNEE_API_KEY.trim() !== "") {
        try {
          console.log(`[Cognee Cloud] Ingesting document dataset "${document?.name}" for case ${caseId} into Cognee Cloud...`);
          
          const formData = new FormData();
          const fileBlob = new Blob([content], { type: "text/plain" });
          formData.append("data", fileBlob, document?.name || `doc_${docId}.txt`);
          formData.append("datasetName", `case_${caseId}`);

          const rememberRes = await fetch(`${COGNEE_BASE_URL}/api/v1/remember`, {
            method: "POST",
            headers: {
              "X-Api-Key": COGNEE_API_KEY
            },
            body: formData
          });
          
          if (rememberRes.ok) {
            const cogData = await rememberRes.json().catch(() => ({}));
            console.log(`[Cognee Cloud] /api/v1/remember completed successfully:`, cogData);
            cogneeCloudStatus = "Active (Success)";
          } else {
            const errText = await rememberRes.text();
            console.warn(`[Cognee Cloud] /api/v1/remember failed with status ${rememberRes.status}:`, errText);
            cogneeCloudStatus = `Active (Remember Failed: ${rememberRes.status})`;
          }
        } catch (err: any) {
          console.error("[Cognee Cloud] Exception occurred during remote API processing:", err);
          cogneeCloudStatus = `Active (Error: ${err.message})`;
        }
      }
      
      // Use Gemini structured output JSON to accurately cognify entities and relationships
      const prompt = `
      You are standard Cognee Memory Engine.
      Below is the content of an investigative piece of evidence named "${document?.name}".
      Extract ALL meaningful entities and ALL relationships between them in compliance with Cognee semantic graph guidelines.
      
      EVIDENCE CONTENT:
      ---
      ${content}
      ---
      
      ENTITIES SCHEMES to extract:
      - person (e.g. John Smith, Agent Dana)
      - company (e.g. Acme Inc, Shell Corp)
      - account (e.g. ACC-901123, Bank account at Chase)
      - location (e.g. Miami Branch, 5th Avenue Suite)
      - date (e.g. October 12, 1999)
      - transaction (e.g. $5,000 Transfer wire, Purchase order #45)
      
      RELATIONSHIPS to extract:
      Only map source and target names using EXACT string matching with extracted entity names.
      The type of relationships MUST fall STRICTLY into:
      - works_at
      - owns
      - transferred_to
      - associated_with
      - met_with
      - located_at
      
      Always provide precise descriptions explaining the evidence logic linking those entities.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash', // Using updated Gemini 3.5 Flash
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              entities: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    type: { 
                      type: Type.STRING, 
                      enum: ['person', 'company', 'account', 'location', 'date', 'transaction'] 
                    },
                    metadata: { type: Type.OBJECT, properties: {}, description: "Key-value pair fields like title, state, accountType, bank, or transactionAmount" }
                  },
                  required: ['name', 'type']
                }
              },
              relationships: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    source: { type: Type.STRING },
                    target: { type: Type.STRING },
                    type: { 
                      type: Type.STRING, 
                      enum: ['works_at', 'owns', 'transferred_to', 'associated_with', 'met_with', 'located_at'] 
                    },
                    description: { type: Type.STRING }
                  },
                  required: ['source', 'target', 'type', 'description']
                }
              }
            },
            required: ['entities', 'relationships']
          }
        }
      });

      const rawJson = response.text;
      if (!rawJson) {
        throw new Error("No response extracted from Gemini Agent");
      }
      
      const parsedGraph = JSON.parse(rawJson);
      
      // Perform Cognee entity resolution! Merge nodes that are synonymous:
      // Search for existing nodes in Firestore, merge attributes or write robustly.
      const existingEntitiesSnap = await db.collection("entities").where("caseId", "==", caseId).get();
      const existingEntities = existingEntitiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      
      const results: { entities: any[], relationships: any[] } = { entities: [], relationships: [] };
      
      // Batch write entities safely
      for (const ent of parsedGraph.entities || []) {
        const canonicalName = ent.name.trim();
        const dup = existingEntities.find(curr => curr.name.toLowerCase() === canonicalName.toLowerCase());
        
        const metadataMap: Record<string, string> = {};
        if (ent.metadata && typeof ent.metadata === 'object') {
          Object.entries(ent.metadata).forEach(([k, v]) => {
            metadataMap[k] = String(v);
          });
        }

        if (dup) {
          // Merge metadata
          const mergedMetadata = { ...(dup.metadata || {}), ...metadataMap };
          await db.collection("entities").doc(dup.id).update({
            metadata: mergedMetadata,
            lastUpdatedByDocId: docId
          });
          results.entities.push({ id: dup.id, name: canonicalName, type: dup.type, metadata: mergedMetadata });
        } else {
          const freshEntity = {
            caseId,
            documentId: docId,
            name: canonicalName,
            type: ent.type,
            metadata: metadataMap,
            createdAt: new Date().toISOString()
          };
          const ref = await db.collection("entities").add(freshEntity);
          results.entities.push({ id: ref.id, ...freshEntity });
        }
      }
      
      // Write relationships
      for (const rel of parsedGraph.relationships || []) {
        const freshRel = {
          caseId,
          documentId: docId,
          source: rel.source.trim(),
          target: rel.target.trim(),
          type: rel.type,
          description: rel.description,
          createdAt: new Date().toISOString()
        };
        const ref = await db.collection("relationships").add(freshRel);
        results.relationships.push({ id: ref.id, ...freshRel });
      }
      
      // Mark document as cognified
      await db.collection("documents").doc(docId).update({ cognified: true });
      
      res.json({ success: true, graph: results, cogneeCloudStatus });
    } catch (error: any) {
      console.error("Error cognifying document:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Memory Search & Chat Agent with Gemini
  app.post("/api/cases/:id/chat", async (req, res) => {
    try {
      const { id: caseId } = req.params;
      const { messages, query } = req.body;
      
      if (!query) {
        return res.status(400).json({ success: false, error: "Query is required" });
      }
      
      if (!db) return res.status(500).json({ success: false, error: "Database not available" });
      
      // 1. PERFORM COGNEE COGNITIVE PERSISTENT LOOKUP IN FIRESTORE
      // Query documents, entities, and relationships for the graph context
      const [entitiesSnap, relsSnap, docsSnap] = await Promise.all([
        db.collection("entities").where("caseId", "==", caseId).get(),
        db.collection("relationships").where("caseId", "==", caseId).get(),
        db.collection("documents").where("caseId", "==", caseId).get()
      ]);
      
      const allEntities = entitiesSnap.docs.map(doc => doc.data());
      const allRels = relsSnap.docs.map(doc => doc.data());
      const allDocs = docsSnap.docs.map(doc => ({ name: doc.data().name, contentSummary: doc.data().content?.substring(0, 500) }));
      
      // Filter entities or relationships matching query keywords to simulate semantic graph search
      const queryLower = query.toLowerCase();
      const filteredEntities = allEntities.filter(e => 
        e.name.toLowerCase().includes(queryLower) || 
        (e.metadata && Object.values(e.metadata).some(val => String(val).toLowerCase().includes(queryLower)))
      );
      
      const filteredRels = allRels.filter(r => 
        r.source.toLowerCase().includes(queryLower) || 
        r.target.toLowerCase().includes(queryLower) || 
        r.description.toLowerCase().includes(queryLower)
      );

      // Optional Real Cognee Cloud SaaS Search block (v1 Recall)
      let cogneeCloudResults = "";
      
      if (COGNEE_API_KEY && COGNEE_API_KEY.trim() !== "") {
        try {
          console.log(`[Cognee Cloud] Recalling memory graph registry under tenant: ${COGNEE_BASE_URL} with query: "${query}"`);
          const searchRes = await fetch(`${COGNEE_BASE_URL}/api/v1/recall`, {
            method: "POST",
            headers: {
              "X-Api-Key": COGNEE_API_KEY,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              query: query,
              session_id: `casemind_${caseId || "global"}`,
              search_type: "GRAPH_COMPLETION"
            })
          });
          
          if (searchRes.ok) {
            const rawSearch = await searchRes.json();
            cogneeCloudResults = JSON.stringify(rawSearch, null, 2);
            console.log("[Cognee Cloud] Recall memory trace successfully integrated into system prompt.");
          } else {
            console.error("[Cognee Cloud] recall failed with status:", searchRes.status, await searchRes.text());
            cogneeCloudResults = `[Cognee Cloud recall failed with status: ${searchRes.status}]`;
          }
        } catch (err: any) {
          console.error("[Cognee Cloud] Recall request error:", err);
          cogneeCloudResults = `[Cognee Cloud Recall Error: ${err.message}]`;
        }
      }
 
       // Create rich context prompt injected directly into the Gemini Session
       const systemContext = `
       You are CaseMind Detective, a full-stack automated investigative assistant.
       You run on top of an active Cognee Cognitive Memory Graph.
       Below is the knowledge graph retrieved from the long-term session memory for the current case in Firestore.
       
       --- COGNEE CLOUD REAL-TIME VECTOR GRAPH SEARCH DIALECT (REMOTE ENGINE) ---
       ${cogneeCloudResults || "Cognee Cloud key not provided in workspace secrets - serving local extraction graph directory."}
       
       --- MEMORY GRAPH NODES (ENTITIES) ---
       ${JSON.stringify(allEntities, null, 2)}
       
       --- MEMORY GRAPH RELATIONSHIPS (CONNECTIONS) ---
       ${JSON.stringify(allRels, null, 2)}
       
       --- RELEVANT SEED ARGUMENTS (QUERY-SPECIFIC MATCHES) ---
       Matches Nodes: ${JSON.stringify(filteredEntities, null, 2)}
       Matches Edges: ${JSON.stringify(filteredRels, null, 2)}
       
       --- SOURCES INGESTED ---
       ${JSON.stringify(allDocs, null, 2)}
       
       Use this deep knowledge graph and multi-session memories to answer the investigator's question.
       If the user is asking about suspicious connections, look for accounts, corporations, date timestamps, or transactions involving multiple companies/persons.
       Provide a highly realistic, professional, legal-forensic and structural detective report. Keep formatting exceptionally clean, with beautiful list formats.
       `;
 
       // Structure conversational prompts
       const formattedHistory = (messages || []).map((msg: any) => ({
         role: msg.role === 'assistant' ? 'model' : 'user',
         parts: [{ text: msg.content }]
       }));
       
       // Push the current query and custom contextual wrapper
       const userPrompt = `${query}\n\n[INVESTIGATIVE SYSTEM REQUEST: Provide professional analysis using only verified Graph connections above where possible. If facts are absent, explain what details are missing in the current memory state]`;
       
       const chatInstance = ai.chats.create({
         model: 'gemini-3.5-flash',
         history: formattedHistory,
         config: {
           systemInstruction: systemContext
         }
       });
       
       const response = await chatInstance.sendMessage({ message: userPrompt });
       const replyText = response.text;
 
       // Asynchronously store this QA interaction into Cognee Cloud as session memory entry
       if (COGNEE_API_KEY && COGNEE_API_KEY.trim() !== "") {
         console.log("[Cognee Cloud] Storing session remember entry asynchronously...");
         fetch(`${COGNEE_BASE_URL}/api/v1/remember/entry`, {
           method: "POST",
           headers: {
             "X-Api-Key": COGNEE_API_KEY,
             "Content-Type": "application/json"
           },
           body: JSON.stringify({
             entry: {
               type: "qa",
               question: query,
               answer: replyText
             },
             dataset_name: `case_${caseId}`,
             session_id: `casemind_${caseId || "global"}`
           })
         }).then((res) => {
           if (res.ok) console.log("[Cognee Cloud] Session QA entry saved.");
           else console.warn("[Cognee Cloud] Failed to save QA entry:", res.status);
         }).catch((err) => {
           console.error("[Cognee Cloud] Async remember/entry error:", err);
         });
       }
 
       res.json({ success: true, reply: replyText });
    } catch (error: any) {
      console.error("Error in AI Detective chat:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Report Generator Endpoint
  app.post("/api/cases/:id/reports", async (req, res) => {
    try {
      const { id: caseId } = req.params;
      const { title } = req.body;
      
      if (!db) return res.status(500).json({ success: false, error: "Database not available" });
      
      // Get all content for this case
      const [caseSnap, docsSnap, entitiesSnap, relsSnap] = await Promise.all([
        db.collection("cases").doc(caseId).get(),
        db.collection("documents").where("caseId", "==", caseId).get(),
        db.collection("entities").where("caseId", "==", caseId).get(),
        db.collection("relationships").where("caseId", "==", caseId).get()
      ]);
      
      if (!caseSnap.exists) {
        return res.status(404).json({ success: false, error: "Case not found" });
      }
      
      const caseName = caseSnap.data()?.name || "Untitled Case";
      
      const documentsText = docsSnap.docs.map(doc => `Document: ${doc.data().name}\nContent:\n${doc.data().content || ""}`).join("\n\n---\n\n");
      const entities = entitiesSnap.docs.map(doc => doc.data());
      const relationships = relsSnap.docs.map(doc => doc.data());
      
      const prompt = `
      You are the CaseMind AI lead Forensic Detective and Report Generator.
      Generate a formal, highly comprehensive Investigation Intelligence Report based on the compiled multi-session evidence graph below:
      
      CASE: ${caseName}
      
      --- TOTAL RESOLVED KNOWLEDGE GRAPH ---
      Entities:
      ${JSON.stringify(entities, null, 2)}
      
      Relationships:
      ${JSON.stringify(relationships, null, 2)}
      
      --- RAW DOCUMENT CORPUS ---
      ${documentsText.substring(0, 15000)} ${documentsText.length > 15000 ? "... [TRUNCATED DUE TO SIZE]" : ""}
      
      You must return structured JSON matching the sections perfectly. Be extremely precise, structured, and dense. Provide actual timeline arrays, risk scores, and actionable paths.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: { type: Type.STRING },
              entitiesAnalysis: { type: Type.STRING },
              relationshipAnalysis: { type: Type.STRING },
              suspiciousConnections: { type: Type.STRING },
              timeline: { type: Type.STRING },
              riskAssessment: { type: Type.STRING },
              recommendedActions: { type: Type.STRING }
            },
            required: [
              'executiveSummary', 
              'entitiesAnalysis', 
              'relationshipAnalysis', 
              'suspiciousConnections', 
              'timeline', 
              'riskAssessment', 
              'recommendedActions'
            ]
          }
        }
      });

      const parsedContent = JSON.parse(response.text || "{}");
      
      const newReport = {
        caseId,
        title: title || `Comprehensive Case Intelligence - ${new Date().toLocaleDateString()}`,
        content: parsedContent,
        createdAt: new Date().toISOString()
      };
      
      const ref = await db.collection("reports").add(newReport);
      res.json({ success: true, report: { id: ref.id, ...newReport } });
    } catch (error: any) {
      console.error("Error generating report:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite Integration for Client SPA Applet
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  return app;
})();

appPromise.then((app) => {
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`CaseMind AI running at http://0.0.0.0:${PORT}`);
    });
  }
});
