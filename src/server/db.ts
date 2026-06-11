/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { 
  User, Project, Task, Agent, AgentMessage, 
  Execution, GeneratedFile, MemoryStore, Log 
} from '../types.js';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Interface representing the database structure
export interface Schema {
  users: User[];
  projects: Project[];
  tasks: Task[];
  agents: Agent[];
  agentMessages: AgentMessage[];
  executions: Execution[];
  generatedFiles: GeneratedFile[];
  memoryStore: MemoryStore[];
  logs: Log[];
}

const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'pm',
    name: 'Patricia (PM)',
    role: 'Product Manager Agent',
    avatarEmoji: '💼',
    colorClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    systemInstruction: `You are the Product Manager Agent. Your role is to analyze raw product requirements, structure them into a clear Product Requirement Document (PRD), compile standard user stories, and outline the initial high-level tasks needed for this software project. Output a clear markdown PRD and generate tasks for the team.`
  },
  {
    id: 'architect',
    name: 'Arthur (Architect)',
    role: 'System Architect Agent',
    avatarEmoji: '📐',
    colorClass: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
    systemInstruction: `You are the System Architect Agent. Your role is to design the technical architecture. Based on the PM's PRD, design the SQL/NoSQL database schema (tables, fields, relations) and construct clean REST API definitions with payloads. Output detailed REST specs, endpoints, schema diagrams, or conceptual workflow diagrams in Markdown.`
  },
  {
    id: 'backend',
    name: 'Ben (Backend)',
    role: 'Backend Developer Agent',
    avatarEmoji: '⚙️',
    colorClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    systemInstruction: `You are the Backend Engineer Agent. Your task is to implement the API services, data models, routes, or mock handlers based on the Architect's designs. You write highly readable, standard, complete and executable Python (FastAPI/Flask) or Node.js backend files. Output real code blocks that the user can explore.`
  },
  {
    id: 'frontend',
    name: 'Fiona (Frontend)',
    role: 'Frontend Developer Agent',
    avatarEmoji: '🎨',
    colorClass: 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800',
    systemInstruction: `You are the Frontend Engineer Agent. Your task is to generate React (TypeScript, Vite, Tailwind CSS) user interface components, forms, detail views, and charts to correspond to the mock backend routes. Output detailed, ready-to-run React component code.`
  },
  {
    id: 'qa',
    name: 'Quentin (QA)',
    role: 'QA / Testing Specialist Agent',
    avatarEmoji: '🧪',
    colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
    systemInstruction: `You are the QA Engineer Agent. Your task is to generate end-to-end unit tests, integration test scripts, or list manual verification criteria to validate the backend and frontend components. Output functional code for tests (e.g., green PyTest assertions) or list full validation checklists.`
  },
  {
    id: 'devops',
    name: 'Diana (DevOps)',
    role: 'DevOps / Platform Engineer Agent',
    avatarEmoji: '🐳',
    colorClass: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
    systemInstruction: `You are the DevOps Engineer Agent. Your task is to dockerize the newly designed full-stack system by generating the Dockerfile and docker-compose.yml files, and documenting environment setup scripts. Output actual Docker deployment files.`
  }
];

class Database {
  private state: Schema = {
    users: [],
    projects: [],
    tasks: [],
    agents: [...DEFAULT_AGENTS],
    agentMessages: [],
    executions: [],
    generatedFiles: [],
    memoryStore: [],
    logs: []
  };

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.state = {
          users: parsed.users || [],
          projects: parsed.projects || [],
          tasks: parsed.tasks || [],
          agents: parsed.agents && parsed.agents.length > 0 ? parsed.agents : [...DEFAULT_AGENTS],
          agentMessages: parsed.agentMessages || [],
          executions: parsed.executions || [],
          generatedFiles: parsed.generatedFiles || [],
          memoryStore: parsed.memoryStore || [],
          logs: parsed.logs || []
        };
      } else {
        // Create initial file
        this.save();
      }

      if (this.state.projects.length === 0) {
        this.seedStarterProject();
      }
    } catch (e) {
      console.error('Failed to initialize database, falling back to memory-only', e);
    }
  }

  private seedStarterProject() {
    const projId = 'starter-retail-app';
    const sampleProject: Project = {
      id: projId,
      name: 'E-Commerce Gateway and Dashboard',
      description: 'An interactive payment webhook transaction processor with visual analytics streaming views.',
      requirements: 'Build a containerized webhook server using FastAPI that listens to checkout events, processes state changes, registers logs in PostgreSQL, and streams metrics to a React client displaying visual dashboard conversion stats.',
      status: 'completed',
      currentPhase: 'idle',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.state.projects.push(sampleProject);

    // Seed tasks
    const tasks: Task[] = [
      {
        id: 't-px1',
        projectId: projId,
        title: 'Draft transaction webhook PRD spec',
        description: 'Detail functional layout of event-driven hooks, schemas, and analytics scopes.',
        assignedAgentId: 'pm',
        status: 'completed',
        priority: 'high',
        order: 1,
        dependencies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 't-px2',
        projectId: projId,
        title: 'Create PostgreSQL database definitions',
        description: 'Map tables, index schema fields, foreign-key connections, and index payloads.',
        assignedAgentId: 'architect',
        status: 'completed',
        priority: 'high',
        order: 2,
        dependencies: ['Draft transaction webhook PRD spec'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 't-px3',
        projectId: projId,
        title: 'Generate FastAPI REST endpoints & controller services',
        description: 'Build robust database session injections, schema validations, and mock controllers.',
        assignedAgentId: 'backend',
        status: 'completed',
        priority: 'high',
        order: 3,
        dependencies: ['Create PostgreSQL database definitions'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 't-px4',
        projectId: projId,
        title: 'Implement React conversion statistics visual screen',
        description: 'Design charts reflecting checkout drop-offs, success ratios, and dynamic alerts.',
        assignedAgentId: 'frontend',
        status: 'completed',
        priority: 'medium',
        order: 4,
        dependencies: ['Generate FastAPI REST endpoints & controller services'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 't-px5',
        projectId: projId,
        title: 'Author API test cases and mock assertions',
        description: 'Check payloads response status, endpoint invalid bounds, and success ratios.',
        assignedAgentId: 'qa',
        status: 'completed',
        priority: 'low',
        order: 5,
        dependencies: ['Generate FastAPI REST endpoints & controller services'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 't-px6',
        projectId: projId,
        title: 'Dockerize local dev container orchestration',
        description: 'Author standard Docker files, Docker-compose cluster structures for Postgres & Web.',
        assignedAgentId: 'devops',
        status: 'completed',
        priority: 'medium',
        order: 6,
        dependencies: ['Implement React conversion statistics visual screen'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    this.state.tasks.push(...tasks);

    // Seed Standup messages
    const execId = 'starter-execution';
    const messages: AgentMessage[] = [
      {
        id: 'm1',
        projectId: projId,
        executionId: execId,
        senderId: 'pm',
        senderName: 'Patricia (PM)',
        content: `Hi team! I've finalized our product requirements checklist for our new **E-Commerce Gateway and Dashboard** service.
        
I've outlined functional requirements in \`requirements/PRD.md\` focusing on reliable payment handling and client-facing live dashboards. Arthur, please design the tables and REST architecture so Ben and Fiona can begin code development!`,
        timestamp: new Date(Date.now() - 3400000).toISOString()
      },
      {
        id: 'm2',
        projectId: projId,
        executionId: execId,
        senderId: 'architect',
        senderName: 'Arthur (Architect)',
        content: `Acknowledged Patricia. I have mapped out the backend model schemas and specified modular API REST routes.
        
I've selected **PostgreSQL** as our structured relational store due to transaction guarantees. Endpoint details are stored in \`specs/Architecture.md\`. Ben, you can begin constructing the FastAPI models!`,
        timestamp: new Date(Date.now() - 3000000).toISOString()
      },
      {
        id: 'm3',
        projectId: projId,
        executionId: execId,
        senderId: 'backend',
        senderName: 'Ben (Backend)',
        content: `FastAPI server is complete! I've implemented models, database session layers, schemas, and routes.
        
The core codebase is available in \`backend/main.py\`. Fiona, you can fetch checkout statistics directly from our \`/api/v1/metrics\` route. Quentin, the test specifications are ready for verification!`,
        timestamp: new Date(Date.now() - 2500000).toISOString()
      },
      {
        id: 'm4',
        projectId: projId,
        executionId: execId,
        senderId: 'frontend',
        senderName: 'Fiona (Frontend)',
        content: `Beautiful work Ben! I have constructed our browser dashboard using React and Tailwind CSS.
        
It features gorgeous responsive bento cards showing active transaction loops and Conversion charts. Find the client codebase inside \`frontend/src/Dashboard.tsx\`. Diana, container orchestration scripts are all yours!`,
        timestamp: new Date(Date.now() - 1800000).toISOString()
      },
      {
        id: 'm5',
        projectId: projId,
        executionId: execId,
        senderId: 'qa',
        senderName: 'Quentin (QA)',
        content: `Greetings team, test coverage is verified and solid. I have authored API testing scripts in \`tests/test_endpoints.py\` using PyTest.
        
All transactional simulation cases passed perfectly with healthy database session state tracking!`,
        timestamp: new Date(Date.now() - 1400000).toISOString()
      },
      {
        id: 'm6',
        projectId: projId,
        executionId: execId,
        senderId: 'devops',
        senderName: 'Diana (DevOps)',
        content: `Excellent progress everyone. I've dockerized our applications. Check out our \`Dockerfile\` and \`docker-compose.yml\` in the root space.
        
We run a Multi-stage slim Python image linked directly with a local secure PostgreSQL container! Ready for deployment.`,
        timestamp: new Date(Date.now() - 800000).toISOString()
      }
    ];
    this.state.agentMessages.push(...messages);

    // Seed memories
    const memories: MemoryStore[] = [
      { id: 'me1', projectId: projId, agentId: 'architect', key: 'database_dialect', value: 'PostgreSQL relational store', type: 'decision', createdAt: new Date().toISOString() },
      { id: 'me2', projectId: projId, agentId: 'architect', key: 'rest_endpoints', value: 'GET /api/v1/metrics, POST /api/v1/webhooks', type: 'decision', createdAt: new Date().toISOString() },
      { id: 'me3', projectId: projId, agentId: 'architect', key: 'auth_protection', value: 'Bearer Token secret validation', type: 'decision', createdAt: new Date().toISOString() }
    ];
    this.state.memoryStore.push(...memories);

    // Seed logs
    const logs: Log[] = [
      { id: 'l1', projectId: projId, level: 'info', source: 'agent_orchestrator', message: 'Bootstrap team orchestration workspace.', timestamp: new Date(Date.now() - 3500000).toISOString() },
      { id: 'l2', projectId: projId, level: 'info', source: 'agent_orchestrator', message: 'PM Patricia completed requirements/PRD.md successfully.', timestamp: new Date(Date.now() - 3400000).toISOString() },
      { id: 'l3', projectId: projId, level: 'info', source: 'agent_orchestrator', message: 'Architect Arthur registered database definitions in specs/Architecture.md.', timestamp: new Date(Date.now() - 3000000).toISOString() },
      { id: 'l4', projectId: projId, level: 'info', source: 'agent_orchestrator', message: 'Backend Ben built main server layer in backend/main.py.', timestamp: new Date(Date.now() - 2500000).toISOString() },
      { id: 'l5', projectId: projId, level: 'info', source: 'agent_orchestrator', message: 'Frontend Fiona deployed dashboard view components.', timestamp: new Date(Date.now() - 1800000).toISOString() },
      { id: 'l6', projectId: projId, level: 'info', source: 'agent_orchestrator', message: 'QA Quentin created test suites and executed assertions.', timestamp: new Date(Date.now() - 1400000).toISOString() },
      { id: 'l7', projectId: projId, level: 'info', source: 'agent_orchestrator', message: 'DevOps Diana structured multi-container docker orchestration.', timestamp: new Date(Date.now() - 800000).toISOString() },
      { id: 'l8', projectId: projId, level: 'info', source: 'agent_orchestrator', message: 'Simulation cycle succeeded perfectly.', timestamp: new Date().toISOString() }
    ];
    this.state.logs.push(...logs);

    // Seed files
    const files: GeneratedFile[] = [
      {
        id: 'f1',
        projectId: projId,
        path: 'requirements/PRD.md',
        content: `# E-Commerce Webhook and Dashboard Spec (PRD)

## 1. Executive Summary
This document outlines the implementation plan for an event-driven payment webhook gateway and real-time dashboard visualization portal. 

## 2. Core Features
- **Webhook Receiver**: Open FastAPI listener validating payment processing handshakes.
- **Relational Ledger**: Stores purchase stats with absolute data integrity.
- **Client Workspace**: Displays real-time charts including success metrics and checkout logs.

## 3. Scope Boundaries
- **In Scope**: Secure database schema setup, backend listener routes, pytest checks, and visual dashboards.
- **Out of Scope**: Third-party SMS gateway integrations or real credit card processors.`,
        fileType: 'doc',
        language: 'markdown',
        createdPhase: 'pm',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'f2',
        projectId: projId,
        path: 'specs/Architecture.md',
        content: `# System Architecture Specification

## 1. Relational Database Mapping (PostgreSQL)
\`\`\`sql
CREATE TABLE transaction_records (
    id UUID PRIMARY KEY,
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
\`\`\`

## 2. REST API Specifications
- **POST /api/v1/webhooks**
  - Payload: \`{"transaction_id": "uuid", "amount": 99.50, "status": "success"}\`
  - Response: \`{"status": "received", "code": 200}\`
- **GET /api/v1/metrics**
  - Output: \`{"success_ratio": 0.94, "total_processed": 14205.00}\``,
        fileType: 'doc',
        language: 'markdown',
        createdPhase: 'architect',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'f3',
        projectId: projId,
        path: 'backend/main.py',
        content: `from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict
import uvicorn

app = FastAPI(title="E-Commerce Payment Gateway", version="1.0.0")

class WebhookPayload(BaseModel):
    transaction_id: str
    amount: float
    status: str
    payment_method: str = "credit_card"

# Mock Database Store
db_transactions = []

@app.get("/api/v1/health")
def read_health():
    return {"status": "healthy", "service": "payment_gateway"}

@app.post("/api/v1/webhooks", status_code=202)
def register_purchase_webhook(payload: WebhookPayload):
    if not payload.transaction_id:
        raise HTTPException(status_code=400, detail="Missing transaction identifier")
    db_transactions.append(payload.dict())
    return {"status": "received", "webhook_id": payload.transaction_id}

@app.get("/api/v1/metrics")
def read_transaction_metrics():
    total_count = len(db_transactions)
    success_count = sum(1 for tx in db_transactions if tx["status"] == "success")
    success_ratio = (success_count / total_count) if total_count > 0 else 1.0
    return {
        "total_transactions": total_count,
        "success_ratio": success_ratio,
        "latest_records": db_transactions[-10:]
    }`,
        fileType: 'code',
        language: 'python',
        createdPhase: 'backend',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'f4',
        projectId: projId,
        path: 'frontend/src/Dashboard.tsx',
        content: `import React, { useEffect, useState } from 'react';
import { ShoppingCart, CheckCircle, TrendingUp, RefreshCw } from 'lucide-react';

export default function CheckoutDashboard() {
  const [metrics, setMetrics] = useState({ total_transactions: 120, success_ratio: 0.96 });
  const [loading, setLoading] = useState(false);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-zinc-900 text-white p-4 rounded-xl">
        <h1 className="font-bold text-lg">Checkout Conversion Insights</h1>
        <button className="flex items-center gap-1.5 text-xs bg-zinc-800 px-3 py-1.5 rounded-lg hover:bg-zinc-750 transition-colors">
          <RefreshCw className="w-4 h-4" /> Sync Metrics
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-5 shadow-xs">
          <div className="text-gray-400 font-semibold text-xs tracking-wider uppercase">Transactions Processed</div>
          <div className="text-3xl font-bold text-slate-900 mt-2">{metrics.total_transactions}</div>
        </div>
        <div className="bg-white border rounded-xl p-5 shadow-xs">
          <div className="text-gray-400 font-semibold text-xs tracking-wider uppercase">Conversion Ratios</div>
          <div className="text-3xl font-bold text-emerald-500 mt-2">{(metrics.success_ratio * 100).toFixed(1)}%</div>
        </div>
        <div className="bg-white border rounded-xl p-5 shadow-xs">
          <div className="text-gray-400 font-semibold text-xs tracking-wider uppercase">Active Ingress Gateway</div>
          <div className="text-lg font-mono text-indigo-500 mt-3 font-semibold">FastAPI v1.0.0</div>
        </div>
      </div>
    </div>
  );
}`,
        fileType: 'code',
        language: 'tsx',
        createdPhase: 'frontend',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'f5',
        projectId: projId,
        path: 'tests/test_endpoints.py',
        content: `import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_gateway_health():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_webhook_ingress_processing():
    payload = {
        "transaction_id": "txn_8910401",
        "amount": 250.00,
        "status": "success",
        "payment_method": "paypal"
    }
    res = client.post("/api/v1/webhooks", json=payload)
    assert res.status_code == 202
    assert res.json()["webhook_id"] == "txn_8910401"`,
        fileType: 'test',
        language: 'python',
        createdPhase: 'qa',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'f6',
        projectId: projId,
        path: 'docker-compose.yml',
        content: `version: '3.8'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=postgresql://root:secret@db:5432/gateway
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: root
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: gateway
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:`,
        fileType: 'config',
        language: 'yaml',
        createdPhase: 'devops',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    this.state.generatedFiles.push(...files);

    // Save changes
    this.save();
  }

  public save() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save to database file', e);
    }
  }

  // ---- HELPER CRUD METHODS ----

  // --- Users ---
  public getUsers(): User[] {
    return this.state.users;
  }
  public createUser(user: Omit<User, 'id' | 'createdAt'>): User {
    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    this.state.users.push(newUser);
    this.save();
    return newUser;
  }

  // --- Projects ---
  public getProjects(): Project[] {
    return this.state.projects;
  }
  public getProject(id: string): Project | undefined {
    return this.state.projects.find(p => p.id === id);
  }
  public createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'currentPhase'>): Project {
    const newProject: Project = {
      ...project,
      id: crypto.randomUUID(),
      status: 'planning',
      currentPhase: 'idle',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.state.projects.push(newProject);
    this.save();
    return newProject;
  }
  public updateProject(id: string, updates: Partial<Project>): Project {
    const index = this.state.projects.findIndex(p => p.id === id);
    if (index === -1) throw new Error(`Project with id ${id} not found`);
    
    this.state.projects[index] = {
      ...this.state.projects[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.state.projects[index];
  }
  public deleteProject(id: string): boolean {
    const lengthBefore = this.state.projects.length;
    this.state.projects = this.state.projects.filter(p => p.id !== id);
    this.state.tasks = this.state.tasks.filter(t => t.projectId !== id);
    this.state.agentMessages = this.state.agentMessages.filter(m => m.projectId !== id);
    this.state.executions = this.state.executions.filter(e => e.projectId !== id);
    this.state.generatedFiles = this.state.generatedFiles.filter(f => f.projectId !== id);
    this.state.memoryStore = this.state.memoryStore.filter(m => m.projectId !== id);
    this.state.logs = this.state.logs.filter(l => l.projectId !== id);
    this.save();
    return this.state.projects.length < lengthBefore;
  }

  // --- Tasks ---
  public getTasks(projectId?: string): Task[] {
    if (projectId) {
      return this.state.tasks.filter(t => t.projectId === projectId);
    }
    return this.state.tasks;
  }
  public getTask(id: string): Task | undefined {
    return this.state.tasks.find(t => t.id === id);
  }
  public createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.state.tasks.push(newTask);
    this.save();
    return newTask;
  }
  public updateTask(id: string, updates: Partial<Task>): Task {
    const index = this.state.tasks.findIndex(t => t.id === id);
    if (index === -1) throw new Error(`Task with id ${id} not found`);

    this.state.tasks[index] = {
      ...this.state.tasks[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return this.state.tasks[index];
  }
  public clearTasksForProject(projectId: string): void {
    this.state.tasks = this.state.tasks.filter(t => t.projectId !== projectId);
    this.save();
  }

  // --- Agents ---
  public getAgents(): Agent[] {
    return this.state.agents;
  }

  // --- Agent Messages ---
  public getMessages(projectId?: string): AgentMessage[] {
    if (projectId) {
      return this.state.agentMessages.filter(m => m.projectId === projectId);
    }
    return this.state.agentMessages;
  }
  public createMessage(message: Omit<AgentMessage, 'id' | 'timestamp'>): AgentMessage {
    const newMessage: AgentMessage = {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };
    this.state.agentMessages.push(newMessage);
    this.save();
    return newMessage;
  }
  public clearMessagesForProject(projectId: string): void {
    this.state.agentMessages = this.state.agentMessages.filter(m => m.projectId !== projectId);
    this.save();
  }

  // --- Executions ---
  public getExecutions(projectId?: string): Execution[] {
    if (projectId) {
      return this.state.executions.filter(e => e.projectId === projectId);
    }
    return this.state.executions;
  }
  public createExecution(execution: Omit<Execution, 'id' | 'startedAt'>): Execution {
    const newExec: Execution = {
      ...execution,
      id: crypto.randomUUID(),
      startedAt: new Date().toISOString()
    };
    this.state.executions.push(newExec);
    this.save();
    return newExec;
  }
  public updateExecution(id: string, updates: Partial<Execution>): Execution {
    const index = this.state.executions.findIndex(e => e.id === id);
    if (index === -1) throw new Error(`Execution with id ${id} not found`);

    this.state.executions[index] = {
      ...this.state.executions[index],
      ...updates,
      endedAt: updates.status === 'completed' || updates.status === 'failed' ? new Date().toISOString() : undefined
    };
    this.save();
    return this.state.executions[index];
  }
  public clearExecutionsForProject(projectId: string): void {
    this.state.executions = this.state.executions.filter(e => e.projectId !== projectId);
    this.save();
  }

  // --- Generated Files ---
  public getFiles(projectId?: string): GeneratedFile[] {
    if (projectId) {
      return this.state.generatedFiles.filter(f => f.projectId === projectId);
    }
    return this.state.generatedFiles;
  }
  public getFile(id: string): GeneratedFile | undefined {
    return this.state.generatedFiles.find(f => f.id === id);
  }
  public createOrUpdateFile(file: Omit<GeneratedFile, 'id' | 'createdAt' | 'updatedAt'>): GeneratedFile {
    const existingIndex = this.state.generatedFiles.findIndex(
      f => f.projectId === file.projectId && f.path === file.path
    );

    if (existingIndex !== -1) {
      const existing = this.state.generatedFiles[existingIndex];
      const updated: GeneratedFile = {
        ...existing,
        ...file,
        updatedAt: new Date().toISOString()
      };
      this.state.generatedFiles[existingIndex] = updated;
      this.save();
      return updated;
    } else {
      const newFile: GeneratedFile = {
        ...file,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.state.generatedFiles.push(newFile);
      this.save();
      return newFile;
    }
  }
  public clearFilesForProject(projectId: string): void {
    this.state.generatedFiles = this.state.generatedFiles.filter(f => f.projectId !== projectId);
    this.save();
  }

  // --- Memory Store ---
  public getMemories(projectId?: string): MemoryStore[] {
    if (projectId) {
      return this.state.memoryStore.filter(m => m.projectId === projectId);
    }
    return this.state.memoryStore;
  }
  public createMemory(memory: Omit<MemoryStore, 'id' | 'createdAt'>): MemoryStore {
    const newMemory: MemoryStore = {
      ...memory,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    this.state.memoryStore.push(newMemory);
    this.save();
    return newMemory;
  }
  public clearMemoriesForProject(projectId: string): void {
    this.state.memoryStore = this.state.memoryStore.filter(m => m.projectId !== projectId);
    this.save();
  }

  // --- Logs ---
  public getLogs(projectId?: string): Log[] {
    if (projectId) {
      return this.state.logs.filter(l => l.projectId === projectId);
    }
    return this.state.logs;
  }
  public createLog(log: Omit<Log, 'id' | 'timestamp'>): Log {
    const newLog: Log = {
      ...log,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };
    this.state.logs.push(newLog);
    // Limit to last 500 logs to prevent memory bloat
    if (this.state.logs.length > 500) {
      this.state.logs.shift();
    }
    this.save();
    return newLog;
  }
  public clearLogsForProject(projectId: string): void {
    this.state.logs = this.state.logs.filter(l => l.projectId !== projectId);
    this.save();
  }
}

export const db = new Database();
