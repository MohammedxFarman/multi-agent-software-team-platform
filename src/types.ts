/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ==========================================
// 1. DATABASE SCHEMAS & ENTITY INTERFACES
// ==========================================

export interface User {
  id: string; // uuid string
  email: string;
  fullName: string;
  role: 'admin' | 'developer' | 'viewer';
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  requirements: string; // The user raw input requirements
  status: 'planning' | 'designing' | 'developing' | 'testing' | 'deploying' | 'completed' | 'failed';
  currentPhase: 'pm' | 'architect' | 'backend' | 'frontend' | 'qa' | 'devops' | 'idle';
  createdAt: string;
  updatedAt: string;
  githubSettings?: {
    authMethod: 'oauth' | 'ssh';
    githubToken?: string | null;
    sshPrivateKey?: string;
    sshPublicKey?: string;
    sshRepoUrl?: string;
    repoName?: string;
    repoPrivate?: boolean;
  };
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assignedAgentId: string; // 'pm' | 'architect' | 'backend' | 'frontend' | 'qa' | 'devops'
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high';
  order: number;
  dependencies: string[]; // List of task IDs that must complete first
  result?: string; // Markdown or code snippet result
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string; // 'pm' | 'architect' | 'backend' | 'frontend' | 'qa' | 'devops'
  name: string;
  role: string;
  systemInstruction: string;
  avatarEmoji: string;
  colorClass: string; // Tailwind color class
}

export interface AgentMessage {
  id: string;
  projectId: string;
  executionId: string;
  senderId: string; // agent ID or 'user' or 'system'
  senderName: string;
  content: string; // The markdown response/message text
  recipientId?: string; // target agent
  timestamp: string;
}

export interface Execution {
  id: string;
  projectId: string;
  phaseId: 'pm' | 'architect' | 'backend' | 'frontend' | 'qa' | 'devops';
  status: 'idle' | 'running' | 'completed' | 'failed';
  logs: string[]; // Execution logs of the agent's internal reasoning
  artifacts: {
    prd?: string; // Generated PM PRD
    architecture?: string; // Architect's database & API design
    backendCode?: string[]; // Generated Backend source paths
    frontendCode?: string[]; // Generated Frontend source components
    testSuites?: string[]; // Generated Test files / run validations
    dockerConfigs?: string[]; // Generated DevOps file paths
  };
  startedAt?: string;
  endedAt?: string;
}

export interface GeneratedFile {
  id: string;
  projectId: string;
  path: string; // e.g. "backend/main.py", "frontend/App.tsx", "docker-compose.yml"
  content: string;
  fileType: 'code' | 'config' | 'doc' | 'test';
  language: 'python' | 'typescript' | 'tsx' | 'yaml' | 'markdown' | 'dockerfile';
  createdPhase: 'pm' | 'architect' | 'backend' | 'frontend' | 'qa' | 'devops';
  createdAt: string;
  updatedAt: string;
}

export interface MemoryStore {
  id: string;
  projectId: string;
  agentId: string; // which agent remembered this
  key: string; // e.g. "database_dialect", "theme_color", "auth_mechanism"
  value: string; // serialized data or plain text
  type: 'preference' | 'decision' | 'learned_fact';
  createdAt: string;
}

export interface Log {
  id: string;
  projectId: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  source: 'system' | 'agent_orchestrator' | string;
  timestamp: string;
}

// ==========================================
// 2. MULTI-AGENT STATE MACHINE & GRAPH TYPES
// ==========================================

export interface AgentTeamState {
  projectId: string;
  projectRequirements: string;
  currentAgent: 'pm' | 'architect' | 'backend' | 'frontend' | 'qa' | 'devops' | 'idle';
  tasks: Task[];
  messages: AgentMessage[];
  currentExecution?: Execution;
  files: GeneratedFile[];
  memories: MemoryStore[];
  logs: Log[];
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  status: string;
  phase: string;
  taskCount: number;
  completedTasks: number;
}
