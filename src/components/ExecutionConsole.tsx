/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Execution, Log, MemoryStore, Task, Project } from '../types.js';
import { 
  Terminal, 
  Lightbulb, 
  Play, 
  Database, 
  Milestone, 
  BarChart4, 
  PieChart as PieChartIcon, 
  TrendingUp 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

interface ExecutionConsoleProps {
  project: Project | null;
  execution: Execution | null;
  logs: Log[];
  memories: MemoryStore[];
  tasks: Task[];
  onTriggerRun: () => void;
  isRunning: boolean;
  hasGeminiKey: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-[#1a1a1f] border border-gray-150 dark:border-zinc-800 p-2 rounded shadow-md text-[10.5px] font-sans">
        <p className="font-bold text-gray-900 dark:text-zinc-100 mb-1">{label}</p>
        <div className="space-y-0.5">
          <p className="text-indigo-600 dark:text-indigo-400 font-semibold">
            Completed: {payload[0].value}
          </p>
          <p className="text-amber-500 dark:text-amber-400 font-semibold">
            Pending: {payload[1].value}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const DonutTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-[#1a1a1f] border border-gray-150 dark:border-zinc-805 p-2 rounded shadow-md text-[10.5px] font-sans">
        <p className="font-bold text-gray-900 dark:text-zinc-100 mb-0.5">{data.name} Workload</p>
        <div className="space-y-0.5 text-indigo-600 dark:text-indigo-400 font-semibold">
          <p>Tasks Assigned: {data.value}</p>
          <p className="text-gray-500 dark:text-zinc-400 font-normal">Team Share: {data.percentage}%</p>
        </div>
      </div>
    );
  }
  return null;
};

const TimelineTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-[#1a1a1f] border border-gray-150 dark:border-zinc-805 p-2 rounded shadow-md text-[10.5px] font-sans max-w-[200px] whitespace-normal">
        <p className="font-bold text-gray-400 dark:text-zinc-500 text-[8.5px] uppercase tracking-wider mb-0.5">Timeline Milestone</p>
        <p className="font-semibold text-gray-900 dark:text-zinc-100 truncate">{data.title}</p>
        <p className="text-[9.5px] text-gray-500 dark:text-zinc-400 mt-0.5">{data.name || 'Initial State'}</p>
        <div className="mt-1.5 pt-1 border-t border-gray-100 dark:border-zinc-850 flex justify-between items-center text-purple-600 dark:text-purple-400 font-bold font-mono">
          <span>Cumulative Done:</span>
          <span>{data.count}</span>
        </div>
      </div>
    );
  }
  return null;
};

export default function ExecutionConsole({
  project,
  execution,
  logs,
  memories,
  tasks = [],
  onTriggerRun,
  isRunning,
  hasGeminiKey
}: ExecutionConsoleProps) {

  const getLogLevelClass = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-500 bg-red-50/50 dark:bg-red-950/20 px-2 rounded font-bold';
      case 'warn': return 'text-amber-500 bg-amber-50/50 dark:bg-amber-950/20 px-2 rounded';
      default: return 'text-gray-500 dark:text-zinc-400';
    }
  };

  const agentNames: Record<string, string> = {
    pm: 'PM',
    architect: 'Architect',
    backend: 'Backend',
    frontend: 'Frontend',
    qa: 'QA',
    devops: 'DevOps',
  };

  const AGENT_COLORS: Record<string, string> = {
    pm: '#3b82f6',        // Blue
    architect: '#a855f7', // Purple
    backend: '#f59e0b',   // Amber
    frontend: '#ec4899',  // Pink
    qa: '#10b981',        // Emerald
    devops: '#6366f1',    // Indigo
  };

  // 1. Task Progress chart data (completed vs pending)
  const barChartData = Object.keys(agentNames).map(agentId => {
    const agentTasks = tasks.filter(t => t.assignedAgentId === agentId);
    const completed = agentTasks.filter(t => t.status === 'completed').length;
    const pending = agentTasks.filter(t => t.status !== 'completed').length;
    return {
      name: agentNames[agentId],
      completed,
      pending,
    };
  });

  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.status === 'completed').length;
  const pendingTasksCount = totalTasksCount - completedTasksCount;

  // 2. Workload distribution Donut Chart data
  const distributionData = Object.keys(agentNames).map(agentId => {
    const count = tasks.filter(t => t.assignedAgentId === agentId).length;
    return {
      name: agentNames[agentId],
      value: count,
      percentage: totalTasksCount > 0 ? Math.round((count / totalTasksCount) * 100) : 0,
      agentId,
    };
  }).filter(item => item.value > 0);

  // 3. Completed tasks timeline data
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const sortedCompleted = [...completedTasks].sort(
    (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime() || a.order - b.order
  );

  let runCumulativeSum = 0;
  const timelineData = sortedCompleted.map((task) => {
    runCumulativeSum += 1;
    const dateObj = new Date(task.updatedAt);
    const label = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const fullDate = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
    
    return {
      name: `${fullDate} ${label}`,
      shortName: label,
      count: runCumulativeSum,
      title: task.title,
    };
  });

  // Prepended start node for smooth charts
  const timelineChartData = timelineData.length > 0 
    ? [{ name: 'Project Created', shortName: 'Start', count: 0, title: 'Project Initiated' }, ...timelineData]
    : [];

  return (
    <div className="bg-white dark:bg-[#1a1a1e] border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col min-h-[600px] shadow-sm select-none" id="execution-logs-console">
      {/* Header block */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-indigo-500" />
          <h2 className="font-semibold text-gray-900 dark:text-zinc-100 font-sans tracking-tight">Execution Control Center</h2>
        </div>
        
        <button
          onClick={onTriggerRun}
          disabled={isRunning || !hasGeminiKey}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold select-none transition-colors cursor-pointer ${
            isRunning
              ? 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-650 cursor-not-allowed'
              : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
          }`}
          id="btn-run-simulation"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          {isRunning ? 'Simulation running...' : 'Deploy Team Sim'}
        </button>
      </div>

      {/* STACK DECK 1: Performance Analytics Dashboard Grid (3 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5 shrink-0">
        
        {/* Card 1: Task Progress Analytics (Bar Chart) */}
        <div className="bg-gray-50/30 dark:bg-[#141416]/40 border border-gray-150 dark:border-zinc-850 rounded-xl p-3 flex flex-col h-[220px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <BarChart4 className="w-4 h-4 text-indigo-500" />
              <h3 className="font-semibold text-gray-950 dark:text-zinc-200 text-xs font-sans">Task Progress Analytics</h3>
            </div>
            {totalTasksCount > 0 && (
              <span className="text-[9px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded">
                {completedTasksCount}/{totalTasksCount} Done
              </span>
            )}
          </div>

          {totalTasksCount === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 dark:text-zinc-500 font-sans text-[11px] leading-relaxed">
              <BarChart4 className="w-6 h-6 mb-1 text-gray-300 dark:text-zinc-700 opacity-60" />
              Chart data empty.<br />Task analytics generate upon PM phase runs.
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barChartData}
                    margin={{ top: 5, right: 5, left: -32, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 120, 120, 0.08)" />
                    <XAxis
                      dataKey="name"
                      stroke="#888888"
                      fontSize={8.5}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={8.5}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(120, 120, 120, 0.04)' }} />
                    <Bar
                      dataKey="completed"
                      name="Completed"
                      fill="#6366f1"
                      radius={[2, 2, 0, 0]}
                    />
                    <Bar
                      dataKey="pending"
                      name="Pending"
                      fill="#f59e0b"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Agent Task Workload Balance (Donut Chart) */}
        <div className="bg-gray-50/30 dark:bg-[#141416]/40 border border-gray-150 dark:border-zinc-850 rounded-xl p-3 flex flex-col h-[220px]">
          <div className="flex items-center gap-1.5 mb-2">
            <PieChartIcon className="w-4 h-4 text-emerald-500" />
            <h3 className="font-semibold text-gray-950 dark:text-zinc-200 text-xs font-sans">Agent Task Distribution</h3>
          </div>

          {totalTasksCount === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 dark:text-zinc-500 font-sans text-[11px] leading-relaxed">
              <PieChartIcon className="w-6 h-6 mb-1 text-gray-300 dark:text-zinc-700 opacity-60" />
              Donut chart empty.<br />Workloads populate once tasks are assigned.
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-between min-w-0 gap-3 h-full">
              {/* Donut container */}
              <div className="w-[45%] h-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<DonutTooltip />} />
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={54}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={AGENT_COLORS[entry.agentId] || '#cbd5e1'} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center aggregate number absolute bubble */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[13px] font-bold text-gray-900 dark:text-zinc-100 font-mono">
                    {totalTasksCount}
                  </span>
                  <span className="text-[7.5px] uppercase tracking-wider font-bold text-gray-450 dark:text-zinc-500">
                    Schedules
                  </span>
                </div>
              </div>

              {/* Dynamic list legend */}
              <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto max-h-[160px] pr-1 text-[9px] font-sans scrollbar-thin">
                {distributionData.map((item) => (
                  <div key={item.agentId} className="flex items-center justify-between gap-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: AGENT_COLORS[item.agentId] }} />
                      <span className="font-semibold text-gray-750 dark:text-zinc-350 truncate">{item.name}</span>
                    </div>
                    <span className="font-mono font-bold text-gray-450 dark:text-zinc-500 shrink-0">
                      {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Card 3: Completed Tasks Timeline (Area Chart) */}
        <div className="bg-gray-50/30 dark:bg-[#141416]/40 border border-gray-150 dark:border-zinc-850 rounded-xl p-3 flex flex-col h-[220px]">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            <h3 className="font-semibold text-gray-950 dark:text-zinc-200 text-xs font-sans">Cumulative Progress Timeline</h3>
          </div>

          {completedTasksCount === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 dark:text-zinc-500 font-sans text-[11px] leading-relaxed">
              <TrendingUp className="w-6 h-6 mb-1 text-gray-300 dark:text-zinc-700 opacity-60" />
              Timeline empty.<br />Task completions chart as simulation rolls.
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={timelineChartData}
                    margin={{ top: 5, right: 10, left: -32, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.20}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.00}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 120, 120, 0.08)" />
                    <XAxis
                      dataKey="shortName"
                      stroke="#888888"
                      fontSize={8.5}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={8.5}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<TimelineTooltip />} cursor={{ stroke: 'rgba(120, 120, 120, 0.12)', strokeWidth: 1 }} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#8b5cf6"
                      strokeWidth={1.8}
                      fillOpacity={1}
                      fill="url(#colorCumulative)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

      </div>

      <div className="border-t border-gray-100 dark:border-zinc-850 my-1 mb-4" />

      {/* STACK DECK 2: Telemetry Logs and Architect Decision Matrix */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[300px]">
        
        {/* Left Aspect: Decision Memory Registry Matrix (Span 5) */}
        <div className="lg:col-span-5 flex flex-col border-r border-gray-100 dark:border-zinc-850 pr-2 min-h-[250px] overflow-y-auto space-y-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Milestone className="w-4 h-4 text-purple-500" />
            <h3 className="font-semibold text-gray-900 dark:text-zinc-200 text-xs font-sans">Arthur's Decision Memory Registry</h3>
          </div>
          
          {memories.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-gray-400 dark:text-zinc-500 font-sans text-[11px] leading-relaxed">
              <Lightbulb className="w-5 h-5 mb-1 text-gray-300 dark:text-zinc-700 opacity-60" />
              Memory store empty.<br />Memories register upon Architect phase runs.
            </div>
          ) : (
            <div className="space-y-2 select-text">
              {memories.map((m) => (
                <div key={m.id} className="p-2 bg-gray-50/55 dark:bg-[#151518]/60 border border-gray-150 dark:border-zinc-805 rounded text-[11px] space-y-1 font-sans">
                  <div className="flex justify-between font-mono text-[10px] text-indigo-500 dark:text-indigo-400">
                    <span className="font-bold underline">{m.key}</span>
                    <span className="opacity-70 font-sans lowercase">({m.type})</span>
                  </div>
                  <p className="text-gray-700 dark:text-zinc-350 font-mono break-all font-semibold select-all">
                    {m.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Aspect: Standup Orchestration Live Logs (Span 7) */}
        <div className="lg:col-span-7 flex flex-col min-h-[250px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-500" />
              <h3 className="font-semibold text-gray-900 dark:text-zinc-200 text-xs font-sans">Standup Orchestration Telemetry Logs</h3>
            </div>
            {isRunning && (
              <span className="text-[10px] uppercase font-bold text-emerald-500 flex items-center gap-1 animate-pulse">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                Live
              </span>
            )}
          </div>

          <div className="flex-1 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-900 rounded-lg p-3 overflow-y-auto font-mono text-[11px] space-y-1.5 leading-relaxed select-text shadow-inner">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500 font-sans text-center text-[11px] py-12">
                No orchestration telemetry events logged.
              </div>
            ) : (
              logs.map((l) => (
                <div key={l.id} className="flex gap-1.5 items-start">
                  <span className="text-gray-400 dark:text-zinc-650 tracking-tight shrink-0">
                    [{new Date(l.timestamp).toLocaleTimeString([], { hour12: false })}]
                  </span>
                  <span className={`${getLogLevelClass(l.level)} font-bold text-[10px] uppercase tracking-wider shrink-0`}>
                    {l.level}
                  </span>
                  <span className="text-zinc-750 dark:text-zinc-200 font-mono break-words leading-relaxed flex-1">
                    {l.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
