/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { Project, GeneratedFile, Task, AgentMessage, MemoryStore } from '../types.js';

/**
 * Packs the active project's source files, requirements, memories, 
 * and full communication logs into a structured ZIP download.
 */
export async function exportProjectAsZip(
  project: Project,
  files: GeneratedFile[],
  tasks: Task[],
  messages: AgentMessage[],
  memories: MemoryStore[]
): Promise<Blob> {
  const zip = new JSZip();

  // 1. Create a beautiful main README.md explaining the project
  const readmeContent = `# ${project.name}

${project.description}

This project codebase was automatically collaborated on, designed, developed, verified, and orchestrated using an autonomous AI Developer Team simulation.

---

## 📋 Raw Requirements Specifications
\`\`\`text
${project.requirements || 'No custom requirement specification provided.'}
\`\`\`

## 📊 Workspace Execution Overview
- **Project Status**: \`${project.status.toUpperCase()}\`
- **Last Active Development Phase**: \`${project.currentPhase.toUpperCase()}\`
- **Creation Timestamp**: ${new Date(project.createdAt).toLocaleString()}
- **Exported Timestamp**: ${new Date().toLocaleString()}
- **Generated Code Files**: ${files.length}

---

## 📐 Multi-Agent Milestone Roadmaps
Below is the execution schedule compiled by the Product Manager (Patricia) and completed by the specialized agents:

${tasks.length === 0 ? '*No workspace milestones generated yet.*' : tasks
  .sort((a, b) => a.order - b.order)
  .map(
    (t) =>
      `### Step ${t.order}: ${t.title}
- **Assigned Agent**: \`${t.assignedAgentId.toUpperCase()}\`
- **Milestone Priority**: \`${t.priority.toUpperCase()}\`
- **Milestone Status**: \`${t.status.toUpperCase()}\`
- **Description**: ${t.description}
${t.dependencies.length > 0 ? `- **Prerequisite Milestones**: ${t.dependencies.map(d => `\`${d}\``).join(', ')}` : ''}`
  )
  .join('\n\n')}

---

## 💡 Arthur's Decision Memory Database
Key technical decisions, database dialect preferences, and architecture patterns registered during the structural design phase:

${memories.length === 0 ? '*No memory logs registered in the database memory store.*' : memories
  .map((m) => `- **[${m.type.toUpperCase()}] ${m.key}**: ${m.value} *(Registered by ${m.agentId})*`)
  .join('\n')}

---
*Packaged and exported by Dev Team Workspace Platform.*
`;

  zip.file('README.md', readmeContent);

  // 2. Add full chat standup conversations transcript as team-standup-chat.md
  const chatTranscript = `# Multi-Agent Meeting Dialogs and Chat Transcripts

Project: **${project.name}**
Exported: **${new Date().toLocaleString()}**

Below is the chronological board record of dialogs, standup progress updates, and code reviews exchanged between Patricia (PM), Arthur (Architect), Ben (Backend), Fiona (Frontend), Quentin (QA), and Diana (DevOps):

---

${messages.length === 0 ? '*No team communications registered yet.*' : messages
  .map(
    (m) => `### 🤖 **${m.senderName}**
*Timestamp: ${new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} (UTC)*

${m.content}

---`
  )
  .join('\n\n')}
`;

  zip.file('team-standup-chat.md', chatTranscript);

  // 3. Add complete programmatic workspace JSON parameters
  zip.file('project-meta-registry.json', JSON.stringify({
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      requirements: project.requirements,
      status: project.status,
      currentPhase: project.currentPhase,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    },
    totalTasks: tasks.length,
    tasksList: tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      assignedAgentId: t.assignedAgentId,
      status: t.status,
      priority: t.priority,
      order: t.order,
      dependencies: t.dependencies
    })),
    decisionsRegistry: memories.map(m => ({
      key: m.key,
      value: m.value,
      type: m.type,
      agentId: m.agentId,
      createdAt: m.createdAt
    })),
    exportedAt: new Date().toISOString()
  }, null, 2));

  // 4. Create the core workspace codebase directory and embed code files
  const codebaseFolder = zip.folder('workspace-codebase');
  if (codebaseFolder) {
    files.forEach((file) => {
      // Normalizes the folder paths automatically and creates subdirectories inside the zip
      codebaseFolder.file(file.path, file.content);
    });
  }

  // 5. Generate zip compression blob
  return await zip.generateAsync({ type: 'blob' });
}
