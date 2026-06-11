/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Project } from '../types.js';
import { Plus, FolderKanban, Trash2, Code2, Play, AlertCircle } from 'lucide-react';

interface ProjectSelectorProps {
  projects: (Project & { stats?: { tasksTotal: number; tasksCompleted: number; filesGenerated: number; messagesExchanged: number } })[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  onCreateProject: (name: string, description: string, requirements: string) => void;
  onDeleteProject: (id: string) => void;
  onRunSimulation: (id: string) => void;
  hasGeminiKey: boolean;
}

export default function ProjectSelector({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onRunSimulation,
  hasGeminiKey
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [reqs, setReqs] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !reqs.trim()) {
      setError('Project Name and Requirements are required.');
      return;
    }
    onCreateProject(name, desc, reqs);
    setName('');
    setDesc('');
    setReqs('');
    setError('');
    setIsOpen(false);
  };

  return (
    <div className="bg-white dark:bg-[#1a1a1e] border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col h-full shadow-sm" id="project-selector-panel">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-indigo-500" />
          <h2 className="font-semibold text-gray-900 dark:text-zinc-100 font-sans tracking-tight">Projects</h2>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors cursor-pointer"
          id="btn-add-project"
        >
          <Plus className="w-3.5 h-3.5" />
          New Project
        </button>
      </div>

      {isOpen && (
        <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-[#202024] p-3 rounded-lg border border-gray-200 dark:border-zinc-800 mb-4 space-y-3">
          <h3 className="text-xs font-bold text-gray-700 dark:text-zinc-300">Create Dev Project</h3>
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-zinc-400 mb-1">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Real-Time Chat App"
              className="w-full text-xs px-2.5 py-1.5 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-[#151518] text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-zinc-400 mb-1">Brief Description</label>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="e.g. Chat app with auth & websockets"
              className="w-full text-xs px-2.5 py-1.5 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-[#151518] text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-zinc-400 mb-1">Core Requirements</label>
            <textarea
              value={reqs}
              onChange={(e) => setReqs(e.target.value)}
              placeholder="What should the agents generate? e.g. A multi-user dashboard, FastAPI with Postgres, with JWT token auth and visual analytics chart on client."
              rows={4}
              className="w-full text-xs px-2.5 py-1.5 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-[#151518] text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
            />
          </div>
          {error && <span className="text-[10px] text-red-500 font-semibold">{error}</span>}
          <div className="flex justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-750 text-white rounded font-semibold transition-colors cursor-pointer"
            >
              Save Project
            </button>
          </div>
        </form>
      )}

      {/* Warning on missing API key */}
      {!hasGeminiKey && (
        <div className="flex gap-2 p-2.5 mb-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg text-amber-800 dark:text-amber-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Missing GEMINI_API_KEY</div>
            <p className="text-[11px] leading-relaxed opacity-90">Please configure your Gemini API Key in the AI Studio side panel to enable full code generation sessions.</p>
          </div>
        </div>
      )}

      {/* Project Catalog List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {projects.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-zinc-500 font-sans text-xs">
            <Code2 className="w-8 h-8 mx-auto mb-2 opacity-50 text-gray-300 dark:text-zinc-600" />
            No projects in catalog.<br />Click "New Project" to start.
          </div>
        ) : (
          projects.map((p) => {
            const isSelected = selectedProjectId === p.id;
            const percentage = p.stats && p.stats.tasksTotal > 0
              ? Math.round((p.stats.tasksCompleted / p.stats.tasksTotal) * 100)
              : 0;

            return (
              <div
                key={p.id}
                onClick={() => onSelectProject(p.id)}
                className={`p-3 rounded-lg border text-left cursor-pointer transition-all duration-150 relative overflow-hidden group ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/10'
                    : 'border-gray-200 dark:border-zinc-800/80 hover:border-gray-300 dark:hover:border-zinc-700/80 hover:bg-gray-50/50 dark:hover:bg-[#202024]/50'
                }`}
              >
                {/* Active running pulse bar */}
                {p.status !== 'completed' && p.status !== 'failed' && p.currentPhase !== 'idle' && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-400 via-indigo-500 to-pink-500 animate-[pulse_1.5s_infinite]" />
                )}

                <div className="flex justify-between items-start">
                  <div className="font-semibold text-xs text-gray-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate max-w-[130px]">
                    {p.name}
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRunSimulation(p.id);
                      }}
                      title="Run Full simulation flow"
                      disabled={p.status !== 'completed' && p.status !== 'failed' && p.currentPhase !== 'idle'}
                      className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 p-1 rounded transition-colors disabled:opacity-40"
                    >
                      <Play className="w-3 h-3 fill-current" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this project and all agent generated content?')) {
                          onDeleteProject(p.id);
                        }
                      }}
                      title="Delete Project"
                      className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 p-1 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                  {p.description}
                </p>

                {/* Micro indicators */}
                <div className="grid grid-cols-2 gap-2 mt-3 text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
                  <div>Files: <span className="text-gray-700 dark:text-zinc-300 font-semibold">{p.stats?.filesGenerated || 0}</span></div>
                  <div>Chat: <span className="text-gray-700 dark:text-zinc-300 font-semibold">{p.stats?.messagesExchanged || 0}</span></div>
                </div>

                {/* Progress bar */}
                <div className="mt-2 text-right">
                  <div className="flex justify-between text-[9px] font-semibold text-gray-500 dark:text-zinc-400">
                    <span className="uppercase tracking-wider">{p.status}</span>
                    <span>{percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-zinc-800 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        p.status === 'failed'
                          ? 'bg-red-500'
                          : p.status === 'completed'
                          ? 'bg-emerald-500'
                          : 'bg-indigo-500'
                      }`}
                      style={{ width: `${percentage || (p.status === 'completed' ? 100 : 5)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
