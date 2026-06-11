/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Project, Task, AgentMessage, GeneratedFile, MemoryStore, Log, Agent } from './types.js';
import ProjectSelector from './components/ProjectSelector.js';
import TaskBoard from './components/TaskBoard.js';
import ChatPanel from './components/ChatPanel.js';
import CodeViewer from './components/CodeViewer.js';
import ExecutionConsole from './components/ExecutionConsole.js';
import ProjectDashboard from './components/ProjectDashboard.js';
import { Cpu, Terminal, MessageSquare, Code2, ShieldAlert, Sparkles, RefreshCw, FolderDown, BarChart3 } from 'lucide-react';

export default function App() {
  const [projects, setProjects] = useState<(Project & { stats?: { tasksTotal: number; tasksCompleted: number; filesGenerated: number; messagesExchanged: number } })[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  // Active Project State
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [memories, setMemories] = useState<MemoryStore[]>([]);
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<'standup' | 'code' | 'control' | 'dashboard'>('standup');
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // 1. Initial Load: Fetch Projects & Agents & Healthcheck
  const loadInitialData = async () => {
    try {
      // Healthcheck for Gemini Key
      const healthRes = await fetch('/api/health');
      const healthData = await healthRes.json();
      setHasGeminiKey(healthData.hasGeminiKey);

      // Load Agents
      const agentsRes = await fetch('/api/agents');
      const agentsData = await agentsRes.json();
      setAgents(agentsData);

      // Load Projects
      await loadProjects();
    } catch (e) {
      console.error('Failed to connect to full-stack backend APIs on initial load:', e);
    }
  };

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data);

      // Auto-select first project if none is active
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    } catch (e) {
      console.error('Failed to load project catalogs:', e);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // 2. Load Selected Project Details
  const loadProjectDetails = async (projectId: string) => {
    try {
      // Find direct project status
      const p = projects.find(item => item.id === projectId);
      if (p) {
        setCurrentProject(p);
      }

      // Fetch Tasks
      const tasksRes = await fetch(`/api/projects/${projectId}/tasks`);
      const tasksData = await tasksRes.json();
      setTasks(tasksData);

      // Fetch Messages
      const msgRes = await fetch(`/api/projects/${projectId}/messages`);
      const msgData = await msgRes.json();
      setMessages(msgData);

      // Fetch Logs
      const logsRes = await fetch(`/api/projects/${projectId}/logs`);
      const logsData = await logsRes.json();
      setLogs(logsData);

      // Fetch Memories
      const memRes = await fetch(`/api/projects/${projectId}/memories`);
      const memData = await memRes.json();
      setMemories(memData);

      // Fetch Files
      const filesRes = await fetch(`/api/projects/${projectId}/files`);
      const filesData = await filesRes.json();
      setFiles(filesData);
    } catch (e) {
      console.error(`Failed to load project details for project ${projectId}:`, e);
    }
  };

  // Trigger details load whenever selectedProjectId or projects list updates
  useEffect(() => {
    if (selectedProjectId) {
      loadProjectDetails(selectedProjectId);
    } else {
      setCurrentProject(null);
      setTasks([]);
      setMessages([]);
      setLogs([]);
      setMemories([]);
      setFiles([]);
    }
  }, [selectedProjectId, projects]);

  // 3. Simple Polling Loop: Polling when the active project is actively generating codes
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    const pollStatus = async () => {
      if (!selectedProjectId) return;
      
      // Look up current project state
      const p = projects.find(item => item.id === selectedProjectId);
      const isGenerating = p && p.status !== 'completed' && p.status !== 'failed' && p.currentPhase !== 'idle';
      
      if (isGenerating) {
        await loadProjects(); // Updates project status list
        await loadProjectDetails(selectedProjectId); // Updates details
      }
    };

    // Polling every 2.5 seconds
    timer = setInterval(pollStatus, 2500);

    return () => clearInterval(timer);
  }, [selectedProjectId, projects]);

  // --- CRUD Actions ---

  const handleCreateProject = async (name: string, description: string, requirements: string) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, requirements })
      });
      if (res.ok) {
        const newProj = await res.json();
        setSelectedProjectId(newProj.id);
        await loadProjects();
      }
    } catch (e) {
      console.error('Failed to create new project:', e);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedProjectId === id) {
          setSelectedProjectId(null);
        }
        await loadProjects();
      }
    } catch (e) {
      console.error('Failed to delete project:', e);
    }
  };

  const handleRunSimulation = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/run`, { method: 'POST' });
      if (res.ok) {
        // Refresh catalog list
        await loadProjects();
        // Set active views
        setActiveTab('standup');
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to start agent simulation team.');
      }
    } catch (e) {
      console.error('Failed to execute simulation run:', e);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadProjects();
    if (selectedProjectId) {
      await loadProjectDetails(selectedProjectId);
    }
    setIsRefreshing(false);
  };

  const handleExportProject = async () => {
    if (!currentProject) return;
    setIsExporting(true);
    try {
      const { exportProjectAsZip } = await import('./utils/zipExporter.js');
      const blob = await exportProjectAsZip(currentProject, files, tasks, messages, memories);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const safeName = currentProject.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'project-directory';
        
      a.download = `${safeName}-workspace.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to bundle project files to ZIP download:', e);
      alert('An error occurred during project workspace compilation.');
    } finally {
      setIsExporting(false);
    }
  };

  // Helper variables
  const activePhase = currentProject?.currentPhase || 'idle';
  const isCurrentlySimulating = currentProject ? (currentProject.status !== 'completed' && currentProject.status !== 'failed' && currentProject.currentPhase !== 'idle') : false;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0f0f11] text-zinc-900 dark:text-[#a9a9b3] flex flex-col antialiased selection:bg-indigo-500/25">
      {/* 1. Global Header Bar */}
      <header className="bg-white dark:bg-[#1a1a1e] border-b border-gray-200 dark:border-zinc-850 px-5 py-3.5 flex justify-between items-center shrink-0 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-gray-900 dark:text-zinc-100 text-sm font-sans tracking-tight leading-none">
                Dev Team Workspace
              </h1>
              <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest font-extrabold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded leading-none">
                AI Platform v2.0
              </span>
            </div>
            <div className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 max-md:hidden">
              Collaborative multi-agent environments generating production code.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh indicators */}
          <button
            onClick={handleManualRefresh}
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-150 dark:border-zinc-800 text-gray-500 dark:text-zinc-300 transition-all cursor-pointer ${isRefreshing ? 'animate-spin' : ''}`}
            title="Manual sync workspace data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Active indicator */}
          {isCurrentlySimulating ? (
            <div className="flex items-center gap-2 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/45 dark:border-indigo-900/30 px-3 py-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 font-sans font-semibold text-xs animate-pulse">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <span>Team meeting ongoing ...</span>
            </div>
          ) : (
            <div className="text-xs font-semibold px-3 py-1.5 bg-gray-100 dark:bg-[#151518] text-gray-500 dark:text-zinc-450 rounded-lg">
              ● Team offline
            </div>
          )}
        </div>
      </header>

      {/* 2. Main Workspace Layout Grid */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 grid grid-cols-1 xl:grid-cols-12 gap-4 overflow-hidden min-h-0">
        
        {/* Left Side (Col-span 3) - Catalog Selection */}
        <div className="xl:col-span-3 flex flex-col min-h-0">
          <ProjectSelector
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
            onCreateProject={handleCreateProject}
            onDeleteProject={handleDeleteProject}
            onRunSimulation={handleRunSimulation}
            hasGeminiKey={hasGeminiKey}
          />
        </div>

        {/* Right Side (Col-span 9) - Workspace Panels */}
        <div className="xl:col-span-9 flex flex-col min-h-0">
          {currentProject ? (
            <div className="flex-1 flex flex-col min-h-0">
              
              {/* Workspace Header Panel */}
              <div className="bg-white dark:bg-[#1a1a1e] border border-gray-200 dark:border-zinc-800 rounded-xl p-4.5 mb-4 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2 font-sans tracking-tight">
                      {currentProject.name}
                      <span className={`text-[10px] uppercase font-mono tracking-widest font-extrabold px-2 py-0.5 rounded ${
                        currentProject.status === 'completed'
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/40 text-emerald-500'
                          : currentProject.status === 'failed'
                          ? 'bg-red-50 dark:bg-red-950/20 border border-red-200/40 text-red-500'
                          : 'bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200/40 text-indigo-500 animate-[pulse_2s_infinite]'
                      }`}>
                        {currentProject.status}
                      </span>
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 max-w-2xl font-sans">
                      {currentProject.description}
                    </p>
                  </div>

                  {/* Tab controllers and export actions */}
                  <div className="flex flex-wrap items-center gap-3 shrink-0 self-start">
                    {/* Zip Export Button */}
                    <button
                      onClick={handleExportProject}
                      disabled={isExporting || files.length === 0}
                      className={`flex items-center gap-2 py-1.5 px-3.5 rounded-lg border text-xs font-semibold select-none transition-all cursor-pointer ${
                        files.length === 0
                          ? 'bg-gray-50 dark:bg-[#1e1e24] text-gray-400 dark:text-zinc-600 border-gray-150 dark:border-zinc-800 cursor-not-allowed opacity-50'
                          : isExporting
                          ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 text-indigo-500 font-bold border-dashed animate-pulse'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent hover:shadow-xs shadow-xs transition-colors'
                      }`}
                      title={files.length === 0 ? "Generate workspace files first to export" : "Export workspace codebase to ZIP"}
                      id="btn-export-project-zip"
                    >
                      <FolderDown className="w-4 h-4 shrink-0" />
                      <span>{isExporting ? 'Packaging...' : 'Export Project'}</span>
                    </button>                    {/* Tab controllers */}
                    <div className="flex bg-slate-100 dark:bg-[#151518] p-1 rounded-lg border border-gray-200 dark:border-zinc-800 text-xs shrink-0">
                      <button
                        onClick={() => setActiveTab('standup')}
                        className={`flex items-center gap-2 py-1.5 px-3 rounded-md transition-colors font-semibold cursor-pointer ${
                          activeTab === 'standup'
                            ? 'bg-white dark:bg-[#1a1a1e] text-indigo-650 dark:text-indigo-400 font-bold shadow-xs'
                            : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-350'
                        }`}
                      >
                        <MessageSquare className="w-4.5 h-4.5" />
                        Engineering Standup
                      </button>
                      <button
                        onClick={() => setActiveTab('code')}
                        className={`flex items-center gap-2 py-1.5 px-3 rounded-md transition-colors font-semibold cursor-pointer ${
                          activeTab === 'code'
                            ? 'bg-white dark:bg-[#1a1a1e] text-indigo-650 dark:text-indigo-400 font-bold shadow-xs'
                            : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-350'
                        }`}
                      >
                        <Code2 className="w-4.5 h-4.5" />
                        Code & Assets Explorer
                      </button>
                      <button
                        onClick={() => setActiveTab('control')}
                        className={`flex items-center gap-2 py-1.5 px-3 rounded-md transition-colors font-semibold cursor-pointer ${
                          activeTab === 'control'
                            ? 'bg-white dark:bg-[#1a1a1e] text-indigo-650 dark:text-indigo-400 font-bold shadow-xs'
                            : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-350'
                        }`}
                      >
                        <Terminal className="w-4.5 h-4.5" />
                        Control Center
                      </button>
                      <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex items-center gap-2 py-1.5 px-3 rounded-md transition-colors font-semibold cursor-pointer ${
                          activeTab === 'dashboard'
                            ? 'bg-white dark:bg-[#1a1a1e] text-indigo-650 dark:text-indigo-400 font-bold shadow-xs'
                            : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-350'
                        }`}
                      >
                        <BarChart3 className="w-4.5 h-4.5" />
                        Project Dashboard
                      </button>
                    </div>
                  </div>
                </div>

                {/* Requirements dropdown drawer */}
                <details className="mt-3 group border-t border-gray-100 dark:border-zinc-850 pt-2.5">
                  <summary className="text-[10px] uppercase font-bold tracking-wider text-gray-400 group-hover:text-gray-600 dark:group-hover:text-zinc-300 cursor-pointer list-none flex items-center justify-between">
                    <span>Inspect Raw Requirements Specs</span>
                    <span className="text-[9px] group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <div className="mt-2 text-[11.5px] select-text text-gray-700 dark:text-zinc-300 bg-gray-50 dark:bg-zinc-950 border border-gray-150 dark:border-zinc-850 p-3 rounded-lg leading-relaxed font-sans whitespace-pre-wrap font-mono">
                    {currentProject.requirements}
                  </div>
                </details>
              </div>

              {/* Dynamic View panels based on Active tab */}
              <div className="flex-1 min-h-0">
                {activeTab === 'standup' && (
                  <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Standup Messages Frame (Col-span 7) */}
                    <div className="lg:col-span-7 h-full min-h-[400px] lg:min-h-0">
                      <ChatPanel
                        messages={messages}
                        agents={agents}
                        currentPhase={activePhase}
                      />
                    </div>
                    {/* Task Board Frame (Col-span 5) */}
                    <div className="lg:col-span-5 h-full min-h-[300px] lg:min-h-0">
                      <TaskBoard
                        tasks={tasks}
                        currentPhase={activePhase}
                        status={currentProject.status}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'code' && (
                  <div className="h-full">
                    <CodeViewer files={files} />
                  </div>
                )}

                {activeTab === 'control' && (
                  <div className="h-full">
                    <ExecutionConsole
                      project={currentProject}
                      execution={null}
                      logs={logs}
                      memories={memories}
                      tasks={tasks}
                      isRunning={isCurrentlySimulating}
                      onTriggerRun={() => handleRunSimulation(currentProject.id)}
                      hasGeminiKey={hasGeminiKey}
                    />
                  </div>
                )}

                {activeTab === 'dashboard' && (
                  <div className="h-full overflow-y-auto pr-1">
                    <ProjectDashboard
                      project={currentProject}
                      tasks={tasks}
                      files={files}
                      messages={messages}
                      memories={memories}
                      onProjectUpdated={(updated) => {
                        setCurrentProject(updated);
                        loadProjects();
                      }}
                    />
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-gray-300 dark:border-zinc-850 bg-white dark:bg-[#1a1a1e] rounded-xl p-10 text-center text-gray-400 dark:text-zinc-500">
              <Sparkles className="w-12 h-12 text-indigo-500 mb-3 opacity-60 animate-[pulse_2s_infinite]" />
              <h2 className="font-bold text-gray-700 dark:text-zinc-200 text-sm font-sans mb-1">
                Select or Setup a Dev Sandbox
              </h2>
              <p className="max-w-sm text-xs font-sans leading-relaxed">
                Click a project card in the sidebar or create a new developer environment. All architectural memories, standup transcripts, and files will instantiate on execution.
              </p>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
