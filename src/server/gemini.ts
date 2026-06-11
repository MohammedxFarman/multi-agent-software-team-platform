/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required to run the team execution.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Check helper to see if Gemini can be run
export function hasGeminiKey(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

// Interfaces for structured parser values
export interface PromptResultPM {
  prd: string;
  tasks: Array<{
    title: string;
    description: string;
    assignedAgentId: 'pm' | 'architect' | 'backend' | 'frontend' | 'qa' | 'devops';
    priority: 'low' | 'medium' | 'high';
    order: number;
    dependencies: string[];
  }>;
}

export interface PromptResultArchitect {
  architectureMarkdown: string;
  decisions: Array<{
    key: string;
    value: string;
    type: 'preference' | 'decision' | 'learned_fact';
  }>;
}

export interface CodeGenerationResult {
  files: Array<{
    path: string;
    content: string;
    language: 'python' | 'typescript' | 'tsx' | 'yaml' | 'markdown' | 'dockerfile';
    fileType: 'code' | 'config' | 'doc' | 'test';
  }>;
  explanation: string;
}

// Generate PRD and plan tasks
export async function runPMAgent(requirements: string, projectName: string): Promise<PromptResultPM> {
  const ai = getGeminiClient();
  const prompt = `You are a professional Product Manager (Patricia). Your goal is to write a comprehensive design specification/PRD for a project named "${projectName}" with these requirements: "${requirements}".
  
  Please return a detailed markdown Product Requirement Document (PRD) detailing:
  1. Executive Summary
  2. Core Features list
  3. Detailed functional requirements (User Stories)
  4. Out of scope elements
  
  And generate a complete logical roadmap of tasks representing the implementation steps for the team. Assigned agents must be strictly selected from: 'pm', 'architect', 'backend', 'frontend', 'qa', 'devops'.
  Provide dependencies between tasks (e.g. backend depends on architect; frontend depends on backend). Ensure the task roadmap is rich and detailed.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          prd: { 
            type: Type.STRING, 
            description: "The Markdown formatted Product Requirement Document." 
          },
          tasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "A concise title of the development task, e.g. 'Setup PostgreSQL Schema' or 'Build React Dashboard'." },
                description: { type: Type.STRING, description: "Detailed description of what this task entails and technical criteria." },
                assignedAgentId: { 
                  type: Type.STRING, 
                  description: "Agent to handle it: 'pm' | 'architect' | 'backend' | 'frontend' | 'qa' | 'devops'",
                  enum: ['pm', 'architect', 'backend', 'frontend', 'qa', 'devops']
                },
                priority: { 
                  type: Type.STRING, 
                  description: "'low' | 'medium' | 'high'",
                  enum: ['low', 'medium', 'high']
                },
                order: { type: Type.INTEGER, description: "Ascending order sequence index count." },
                dependencies: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "List of other task titles that this task depends on (can refer to titles or order IDs)."
                }
              },
              required: ['title', 'description', 'assignedAgentId', 'priority', 'order', 'dependencies']
            }
          }
        },
        required: ['prd', 'tasks']
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from Product Manager Agent");
  return JSON.parse(text) as PromptResultPM;
}

// Generate Architecture design (Architect)
export async function runArchitectAgent(
  projectName: string, 
  prd: string, 
  rawRequirements: string
): Promise<PromptResultArchitect> {
  const ai = getGeminiClient();
  const prompt = `You are Arthur (System Architect Agent). Review the Project PRD and raw user requirements.
  
  PROJECT NAME: "${projectName}"
  PRD:
  """
  ${prd}
  """
  RAW INPUTS:
  """
  ${rawRequirements}
  """
  
  Based on this, please output a detailed System Architecture Markdown file containing:
  1. Relational database schemas (PostgreSQL / SQLAlchemy DDL or model definitions)
  2. REST API definitions (HTTP Method, Route, Request Body, Response payload)
  3. Workflow execution boundaries
  
  Also, output a series of technical architectural decisions (keys and values) to store in our team memory registry (e.g. database_dialect: "PostgreSQL", auth_system: "JWT Auth").`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          architectureMarkdown: { 
            type: Type.STRING, 
            description: "The complete technical System Architecture Markdown Specification." 
          },
          decisions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                key: { type: Type.STRING, description: "The system key (e.g., db_type, backend_framework)" },
                value: { type: Type.STRING, description: "The architecture selection (e.g., PostgreSQL / FastAPI)" },
                type: { 
                  type: Type.STRING, 
                  description: "'preference' | 'decision' | 'learned_fact'",
                  enum: ['preference', 'decision', 'learned_fact']
                }
              },
              required: ['key', 'value', 'type']
            }
          }
        },
        required: ['architectureMarkdown', 'decisions']
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from Architect Agent");
  return JSON.parse(text) as PromptResultArchitect;
}

// Generate Backend code
export async function runBackendAgent(
  projectName: string,
  prd: string,
  architecture: string,
  existingMemories: string
): Promise<CodeGenerationResult> {
  const ai = getGeminiClient();
  const prompt = `You are Ben, the expert Backend Engineer Agent.
  
  PROJECT NAME: "${projectName}"
  PRD DETAILS:
  """
  ${prd}
  """
  SYSTEM ARCHITECTURE:
  """
  ${architecture}
  """
  TEAM MEMORY CONTEXT:
  """
  ${existingMemories}
  """
  
  Generate all critical, functional Python files using FastAPI and SQLAlchemy to make a perfectly running backend according to the spec! 
  Do NOT write pseudocode or shortcuts. Provide complete, implementation-heavy source code files. Include files like "backend/main.py", "backend/models.py", "backend/schemas.py", and "backend/database.py".
  Make sure every FastAPI route is detailed and matches the Architect endpoints exactly.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          files: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                path: { type: Type.STRING, description: "Self-contained file path, e.g. 'backend/main.py'" },
                content: { type: Type.STRING, description: "The complete executable code of the Python file." },
                language: { type: Type.STRING, description: "'python'" },
                fileType: { type: Type.STRING, description: "'code'" }
              },
              required: ['path', 'content', 'language', 'fileType']
            }
          },
          explanation: { type: Type.STRING, description: "Brief design log of what files you compiled and setup directions." }
        },
        required: ['files', 'explanation']
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from Backend Agent");
  return JSON.parse(text) as CodeGenerationResult;
}

// Generate Frontend React components
export async function runFrontendAgent(
  projectName: string,
  prd: string,
  architecture: string,
  backendFilesInfo: string
): Promise<CodeGenerationResult> {
  const ai = getGeminiClient();
  const prompt = `You are Fiona, the Frontend Engineer Agent.
  
  PROJECT NAME: "${projectName}"
  PRD DETAILS:
  """
  ${prd}
  """
  ARCHITECT SPECIFICATIONS:
  """
  ${architecture}
  """
  BACKEND SOURCE LAYOUT:
  """
  ${backendFilesInfo}
  """
  
  Generate highly interactive, full-featured React frontend source code files written in TypeScript (TSX) that communicate with this backend.
  Use Tailwind CSS and beautiful styling layout. Write complete, elegant code without any shorthand, placeholders or 'TODO' instructions. 
  Create beautiful components: e.g. "frontend/App.tsx", "frontend/components/Dashboard.tsx", "frontend/components/ProjectForm.tsx" or details. Return the files.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          files: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                path: { type: Type.STRING, description: "File path, e.g. 'frontend/src/App.tsx'" },
                content: { type: Type.STRING, description: "The complete React code of the TypeScript file." },
                language: { type: Type.STRING, description: "'typescript' | 'tsx'", enum: ['typescript', 'tsx'] },
                fileType: { type: Type.STRING, description: "'code'" }
              },
              required: ['path', 'content', 'language', 'fileType']
            }
          },
          explanation: { type: Type.STRING, description: "Explain your design structure and interactive flows." }
        },
        required: ['files', 'explanation']
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from Frontend Agent");
  return JSON.parse(text) as CodeGenerationResult;
}

// Generate QA Tests
export async function runQAAgent(
  projectName: string,
  prd: string,
  backendCode: string,
  frontendCode: string
): Promise<CodeGenerationResult> {
  const ai = getGeminiClient();
  const prompt = `You are Quentin, the QA Engineer Agent. Your task is to generate diagnostic, fully functional testing suites to test the generated Backend and Frontend code.
  
  PROJECT: "${projectName}"
  PRD:
  """
  ${prd}
  """
  BACKEND SCRIPTS:
  """
  ${backendCode}
  """
  FRONTEND SCRIPTS:
  """
  ${frontendCode}
  """
  
  Please write functional PyTest files (e.g. "tests/test_api.py") or testing script assertions verifying all main routes and auth bounds. Provide fully executable code, explaining mock parameters.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          files: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                path: { type: Type.STRING, description: "File path, e.g., 'tests/test_endpoints.py'" },
                content: { type: Type.STRING, description: "Complete, functional pytest code blocks." },
                language: { type: Type.STRING, description: "'python'" },
                fileType: { type: Type.STRING, description: "'test'" }
              },
              required: ['path', 'content', 'language', 'fileType']
            }
          },
          explanation: { type: Type.STRING, description: "Provide verification scripts context and test plan log." }
        },
        required: ['files', 'explanation']
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from QA Agent");
  return JSON.parse(text) as CodeGenerationResult;
}

// Generate DevOps configuration
export async function runDevOpsAgent(
  projectName: string,
  prd: string,
  filesContext: string
): Promise<CodeGenerationResult> {
  const ai = getGeminiClient();
  const prompt = `You are Diana, the DevOps Agent. Your job is to draft the dockerization and platform setup files to run this entire system.
  
  PROJECT: "${projectName}"
  PRD:
  """
  ${prd}
  """
  GENERATED CODE FILE PATHS:
  """
  ${filesContext}
  """
  
  Please output complete configuration files:
  1. A "docker-compose.yml" setting up a FastAPI web service and a PostgreSQL DB service.
  2. A "Dockerfile" for compiling the backend python container safely.
  3. An environment config file layout or README deployment instructions.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          files: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                path: { type: Type.STRING, description: "File path, e.g. 'devops/Dockerfile' or 'docker-compose.yml'" },
                content: { type: Type.STRING, description: "Complete ready-to-use DevOps configuration script." },
                language: { type: Type.STRING, description: "'dockerfile' | 'yaml'", enum: ['dockerfile', 'yaml'] },
                fileType: { type: Type.STRING, description: "'config'" }
              },
              required: ['path', 'content', 'language', 'fileType']
            }
          },
          explanation: { type: Type.STRING, description: "Explain system dependencies, Docker orchestration variables, and deployment instructions." }
        },
        required: ['files', 'explanation']
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from DevOps Agent");
  return JSON.parse(text) as CodeGenerationResult;
}
