/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Task } from '../types.js';
import { CheckCircle2, Circle, Loader2, AlertCircle, Sparkles } from 'lucide-react';

interface TaskBoardProps {
  tasks: Task[];
  currentPhase: 'pm' | 'architect' | 'backend' | 'frontend' | 'qa' | 'devops' | 'idle';
  status: string;
}

export default function TaskBoard({ tasks, currentPhase, status }: TaskBoardProps) {
  // Agent constant configurations
  const AGENT_META: Record<string, { name: string; emoji: string; color: string }> = {
    pm: { name: 'PM', emoji: '💼', color: 'bg-blue-500' },
    architect: { name: 'Architect', emoji: '📐', color: 'bg-purple-500' },
    backend: { name: 'Backend', emoji: '⚙️', color: 'bg-amber-500' },
    frontend: { name: 'Frontend', emoji: '🎨', color: 'bg-pink-500' },
    qa: { name: 'QA', emoji: '🧪', color: 'bg-emerald-500' },
    devops: { name: 'DevOps', emoji: '🐳', color: 'bg-indigo-500' },
  };

  const sortedTasks = [...tasks].sort((a, b) => a.order - b.order);

  const getStatusIcon = (taskStatus: Task['status']) => {
    switch (taskStatus) {
      case 'completed':
        return <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />;
      case 'in_progress':
        return <Loader2 className="w-4.5 h-4.5 text-indigo-500 animate-spin shrink-0" />;
      case 'failed':
        return <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0" />;
      default:
        return <Circle className="w-4.5 h-4.5 text-gray-300 dark:text-zinc-700 shrink-0" />;
    }
  };

  return (
    <div className="bg-white dark:bg-[#1a1a1e] border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col h-full shadow-sm" id="pm-tasks-board">
      {/* Current phase banner */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-zinc-800">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <h2 className="font-semibold text-gray-900 dark:text-zinc-100 text-sm font-sans tracking-tight">Milestone Roadmap</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-gray-400">Current Phase:</span>
          {currentPhase !== 'idle' ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/40 uppercase">
              {currentPhase}
            </span>
          ) : (
            <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 capitalize">
              {status || 'Idle'}
            </span>
          )}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 dark:text-zinc-500 py-10">
          <div className="text-3xl mb-1.5">💼</div>
          <p className="text-[11px] font-sans">
            No work roadmap generated yet.<br />Trigger the execution simulation to start.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {sortedTasks.map((t) => {
            const meta = AGENT_META[t.assignedAgentId];
            const isActive = t.status === 'in_progress';
            
            return (
              <div
                key={t.id}
                className={`p-2.5 rounded-lg border transition-all duration-150 flex items-start gap-2.5 ${
                  isActive
                    ? 'border-indigo-400 bg-indigo-50/25 dark:bg-indigo-950/5 ring-1 ring-indigo-300 dark:ring-indigo-900/20'
                    : 'border-gray-150 dark:border-zinc-800/60 bg-gray-50/20 dark:bg-[#1a1a1e]'
                }`}
              >
                {/* Checkbox state */}
                <div className="mt-0.5">{getStatusIcon(t.status)}</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-semibold text-xs text-gray-900 dark:text-zinc-200 leading-tight truncate">
                      {t.title}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400 dark:text-zinc-500 shrink-0">
                      Step {t.order}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                    {t.description}
                  </p>

                  {/* Assignee pill */}
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-100 dark:border-zinc-805">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px]">{meta?.emoji || '🤖'}</span>
                      <span className="text-[10px] font-semibold text-gray-650 dark:text-zinc-350">
                        {meta?.name || t.assignedAgentId}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Priority badge */}
                      <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 rounded ${
                        t.priority === 'high' 
                          ? 'bg-red-50 dark:bg-red-950/20 text-red-500' 
                          : t.priority === 'medium' 
                          ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-500' 
                          : 'bg-gray-100 dark:bg-zinc-800 text-gray-500'
                      }`}>
                        {t.priority}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
