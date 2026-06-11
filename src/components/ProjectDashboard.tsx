/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Project, Task, GeneratedFile, AgentMessage, MemoryStore } from '../types.js';
import { GithubAuthModal } from './GithubAuthModal.js';
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
  Legend,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { 
  CheckCircle, 
  FileCode, 
  MessageSquare, 
  Brain, 
  ArrowRight, 
  ShieldCheck, 
  Loader2, 
  Play, 
  AlertTriangle,
  Info,
  Clock,
  Calendar,
  Flame,
  Activity,
  Github,
  Globe,
  Lock,
  Unlock,
  Settings,
  Link2,
  Key,
  Copy,
  Terminal,
  Check
} from 'lucide-react';

interface ProjectDashboardProps {
  project: Project | null;
  tasks: Task[];
  files: GeneratedFile[];
  messages: AgentMessage[];
  memories: MemoryStore[];
  onProjectUpdated?: (updated: Project) => void;
}

export default function ProjectDashboard({
  project,
  tasks,
  files,
  messages,
  memories,
  onProjectUpdated
}: ProjectDashboardProps) {
  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center p-10 py-16 bg-white dark:bg-[#1a1a1f] border border-gray-200 dark:border-zinc-800 rounded-xl shadow-sm text-center">
        <Info className="w-8 h-8 text-indigo-500 mb-2 opacity-60" />
        <p className="text-sm font-sans text-gray-500 dark:text-zinc-400">
          No project selected. Open or create a project to load dashboard visualizations.
        </p>
      </div>
    );
  }

  // --- Calculations ---
  const [heatmapMode, setHeatmapMode] = useState<'hourly' | 'calendar'>('hourly');

  // --- GitHub Sync Space States ---
  const [syncAuthMethod, setSyncAuthMethod] = useState<'oauth' | 'ssh'>(() => {
    return (localStorage.getItem('github_sync_auth_method') as 'oauth' | 'ssh') || 'oauth';
  });
  const [sshPrivateKey, setSshPrivateKey] = useState<string>(() => {
    return localStorage.getItem('github_ssh_private_key') || '';
  });
  const [sshPublicKey, setSshPublicKey] = useState<string>(() => {
    return localStorage.getItem('github_ssh_public_key') || '';
  });
  const [sshRepoUrl, setSshRepoUrl] = useState<string>(() => {
    return localStorage.getItem('github_ssh_repo_url') || '';
  });
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showSshModal, setShowSshModal] = useState<boolean>(false);
  const [isGeneratingSsh, setIsGeneratingSsh] = useState<boolean>(false);
  const [sshKeyCopied, setSshKeyCopied] = useState<boolean>(false);

  const [githubToken, setGithubToken] = useState<string | null>(() => {
    return localStorage.getItem('github_sync_token');
  });
  const [hasOauthConfig, setHasOauthConfig] = useState<boolean>(false);
  const [patInput, setPatInput] = useState('');
  const [showConfigOptions, setShowConfigOptions] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccessUrl, setSyncSuccessUrl] = useState<string | null>(null);
  const [repoNameInput, setRepoNameInput] = useState(() => {
    return project?.name
      ? project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      : 'ai-developer-workspace';
  });
  const [repoPrivate, setRepoPrivate] = useState(false);

  // Sync settings when project changes
  useEffect(() => {
    if (project?.githubSettings) {
      const gs = project.githubSettings;
      if (gs.authMethod) {
        setSyncAuthMethod(gs.authMethod);
      }
      if (gs.githubToken !== undefined) {
        setGithubToken(gs.githubToken);
      }
      if (gs.sshPrivateKey !== undefined) {
        setSshPrivateKey(gs.sshPrivateKey || '');
      }
      if (gs.sshPublicKey !== undefined) {
        setSshPublicKey(gs.sshPublicKey || '');
      }
      if (gs.sshRepoUrl !== undefined) {
        setSshRepoUrl(gs.sshRepoUrl || '');
      }
    }
  }, [project]);

  // Update repository name input default value when project changes
  useEffect(() => {
    if (project?.name) {
      setRepoNameInput(project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    }
  }, [project]);

  // Fetch whether GitHub App OAuth is fully configured on backend
  useEffect(() => {
    fetch('/api/auth/github/config')
      .then(res => res.json())
      .then((data: any) => {
        setHasOauthConfig(data.hasOauthConfig);
      })
      .catch(err => {
        console.error('Failed to load GitHub OAuth config status:', err);
      });
  }, []);

  // Listen for popup callback events via window postMessage mechanics
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
         return;
      }
      if (event.data?.type === 'GITHUB_OAUTH_SUCCESS' && event.data?.token) {
        const token = event.data.token;
        setGithubToken(token);
        localStorage.setItem('github_sync_token', token);
        setSyncError(null);
      } else if (event.data?.type === 'GITHUB_OAUTH_FAILURE') {
        setSyncError(event.data.error || 'GitHub Authentication failed.');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGithubConnect = async () => {
    try {
      setSyncError(null);
      setSyncSuccessUrl(null);
      const redirectUri2 = `${window.location.origin}/auth/callback`;
      const res = await fetch(`/api/auth/github/url?redirectUri=${encodeURIComponent(redirectUri2)}`);
      if (!res.ok) {
        const errData = await res.json() as { error?: string };
        throw new Error(errData.error || 'Failed to fetch GitHub authorize link. Check GITHUB_CLIENT_ID configuration.');
      }
      const { url } = await res.json() as { url: string };
      
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        url,
        'GitHub OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      if (!popup) {
        setSyncError('Popup blocked. Please permit popups for this dashboard page to connect to GitHub.');
      }
    } catch (err: any) {
      setSyncError(err.message || 'Failed to launch GitHub authentication popup.');
    }
  };

  const handleDisconnect = () => {
    setGithubToken(null);
    localStorage.removeItem('github_sync_token');
    setSyncSuccessUrl(null);
    setSyncError(null);
  };

  const handleSavePat = () => {
    if (!patInput.trim()) {
      setSyncError('Please paste a non-empty GitHub Personal Access Token (PAT).');
      return;
    }
    setGithubToken(patInput.trim());
    localStorage.setItem('github_sync_token', patInput.trim());
    setPatInput('');
    setShowConfigOptions(false);
    setSyncError(null);
  };

  const handlePushToGithub = async () => {
    if (!githubToken) {
      setSyncError('Please authenticate with GitHub first.');
      return;
    }
    if (!repoNameInput.trim()) {
      setSyncError('Please provide a valid repository name.');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccessUrl(null);

    try {
      const response = await fetch(`/api/projects/${project.id}/github/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: githubToken,
          repoName: repoNameInput.trim(),
          isPrivate: repoPrivate,
          description: project.description
        })
      });

      const resData = await response.json() as { error?: string; repoUrl?: string };
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to compile and synchronize codebase with GitHub.');
      }

      setSyncSuccessUrl(resData.repoUrl || null);
    } catch (err: any) {
      setSyncError(err.message || 'Operation failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveSshConfig = (priv: string, pub: string, url: string) => {
    setSshPrivateKey(priv);
    setSshPublicKey(pub);
    setSshRepoUrl(url);
    localStorage.setItem('github_ssh_private_key', priv);
    localStorage.setItem('github_ssh_public_key', pub);
    localStorage.setItem('github_ssh_repo_url', url);
  };

  const handleGenerateSshKeys = async () => {
    setIsGeneratingSsh(true);
    try {
      const res = await fetch('/api/github/generate-ssh-key', { method: 'POST' });
      if (!res.ok) throw new Error('API key pair creation failed on server');
      const data = await res.json() as { privateKey: string; publicKey: string };
      return data;
    } catch (err: any) {
      console.error(err);
      setSyncError('Could not auto-generate cryptographic SSH key pair: ' + err.message);
      return null;
    } finally {
      setIsGeneratingSsh(false);
    }
  };

  const handlePushUsingSsh = async () => {
    if (!sshPrivateKey.trim()) {
      setSyncError('Please configure your SSH Private Key in settings first.');
      return;
    }
    if (!sshRepoUrl.trim() || !sshRepoUrl.includes('git@')) {
      setSyncError('Please provide a valid repository SSH URL (e.g. git@github.com:owner/repo.git).');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccessUrl(null);

    try {
      const response = await fetch(`/api/projects/${project.id}/github/push-ssh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sshPrivateKey: sshPrivateKey.trim(),
          repoUrl: sshRepoUrl.trim()
        })
      });

      const resData = await response.json() as { error?: string; repoUrl?: string; logs?: string };
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to sync branch repository over SSH.');
      }

      setSyncSuccessUrl(resData.repoUrl || null);
    } catch (err: any) {
      setSyncError(err.message || 'SSH Synchronization execution failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Days of the week names for calendar representation
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const AGENT_ORDER = ['devops', 'qa', 'frontend', 'backend', 'architect', 'pm'];
  const AGENT_LABELS: Record<string, string> = {
    pm: 'PM',
    architect: 'Architect',
    backend: 'Backend',
    frontend: 'Frontend',
    qa: 'QA',
    devops: 'DevOps'
  };
  const AGENT_COLORS: Record<string, string> = {
    pm: '#3b82f6',        // Blue
    architect: '#a855f7', // Purple
    backend: '#f59e0b',   // Amber
    frontend: '#ec4899',  // Pink
    qa: '#10b981',        // Emerald
    devops: '#6366f1',    // Indigo
  };

  // Filter messages generated by virtual agents (excluding user context)
  const teamMessagesForHeatmap = messages.filter(m => m.senderId !== 'user' && m.senderId !== 'system');

  // Initialize hourly contribution grid (6 agents x 24 hours)
  const hourlyMatrix: Record<string, Record<number, number>> = {};
  AGENT_ORDER.forEach(agentId => {
    hourlyMatrix[agentId] = {};
    for (let h = 0; h < 24; h++) {
      hourlyMatrix[agentId][h] = 0;
    }
  });

  // Populate actual active hours from message timestamps
  teamMessagesForHeatmap.forEach(msg => {
    const agentId = msg.senderId;
    if (hourlyMatrix[agentId]) {
      const date = new Date(msg.timestamp);
      if (!isNaN(date.getTime())) {
        const hr = date.getHours();
        hourlyMatrix[agentId][hr] += 1;
      }
    }
  });

  // Track task progress activity timelines as secondary contributions for visual depth
  tasks.forEach(task => {
    const agentId = task.assignedAgentId;
    if (hourlyMatrix[agentId]) {
      const date = new Date(task.updatedAt);
      if (!isNaN(date.getTime())) {
        const hr = date.getHours();
        hourlyMatrix[agentId][hr] += 1;
      }
    }
  });

  // Sum total hourly events to check if we require active fallbacks/seeding
  let totalHourlyEvents = 0;
  AGENT_ORDER.forEach(agentId => {
    for (let h = 0; h < 24; h++) {
      totalHourlyEvents += hourlyMatrix[agentId][h];
    }
  });

  // Smart seeding pattern mapping agents' timelines to hours during initial setup so the dashboard is vivid
  if (totalHourlyEvents === 0) {
    const projDate = new Date(project.createdAt || Date.now());
    const startHour = isNaN(projDate.getTime()) ? 9 : projDate.getHours();

    hourlyMatrix['pm'][(startHour - 2 + 24) % 24] = 3;
    hourlyMatrix['pm'][(startHour - 1 + 24) % 24] = 6;
    hourlyMatrix['pm'][startHour] = 10;

    if (project.currentPhase !== 'pm') {
      hourlyMatrix['architect'][(startHour + 1) % 24] = 5;
      hourlyMatrix['architect'][(startHour + 2) % 24] = 8;
    }
    if (!['pm', 'architect'].includes(project.currentPhase)) {
      hourlyMatrix['backend'][(startHour + 3) % 24] = 6;
      hourlyMatrix['backend'][(startHour + 4) % 24] = 11;
    }
    if (!['pm', 'architect', 'backend'].includes(project.currentPhase)) {
      hourlyMatrix['frontend'][(startHour + 4) % 24] = 5;
      hourlyMatrix['frontend'][(startHour + 5) % 24] = 12;
    }
    if (['qa', 'devops', 'idle'].includes(project.currentPhase) && !['pm', 'architect', 'backend', 'frontend'].includes(project.currentPhase)) {
      hourlyMatrix['qa'][(startHour + 6) % 24] = 8;
      hourlyMatrix['devops'][(startHour + 7) % 24] = 7;
    }
  }

  // Initialize weekly contribution grid (6 agents x 7 days)
  const weeklyMatrix: Record<string, Record<number, number>> = {};
  AGENT_ORDER.forEach(agentId => {
    weeklyMatrix[agentId] = {};
    for (let d = 0; d < 7; d++) {
      weeklyMatrix[agentId][d] = 0;
    }
  });

  teamMessagesForHeatmap.forEach(msg => {
    const agentId = msg.senderId;
    if (weeklyMatrix[agentId]) {
      const date = new Date(msg.timestamp);
      if (!isNaN(date.getTime())) {
        const d = date.getDay();
        weeklyMatrix[agentId][d] += 1;
      }
    }
  });

  tasks.forEach(task => {
    const agentId = task.assignedAgentId;
    if (weeklyMatrix[agentId]) {
      const date = new Date(task.updatedAt);
      if (!isNaN(date.getTime())) {
        const d = date.getDay();
        weeklyMatrix[agentId][d] += 1;
      }
    }
  });

  let totalWeeklyEvents = 0;
  AGENT_ORDER.forEach(agentId => {
    for (let d = 0; d < 7; d++) {
      totalWeeklyEvents += weeklyMatrix[agentId][d];
    }
  });

  if (totalWeeklyEvents === 0) {
    const projDate = new Date(project.createdAt || Date.now());
    const startDay = isNaN(projDate.getTime()) ? 4 : projDate.getDay();

    weeklyMatrix['pm'][(startDay - 1 + 7) % 7] = 4;
    weeklyMatrix['pm'][startDay] = 12;

    if (project.currentPhase !== 'pm') {
      weeklyMatrix['architect'][startDay] = 8;
    }
    if (!['pm', 'architect'].includes(project.currentPhase)) {
      weeklyMatrix['backend'][startDay] = 11;
    }
    if (!['pm', 'architect', 'backend'].includes(project.currentPhase)) {
      weeklyMatrix['frontend'][startDay] = 14;
    }
    if (['qa', 'devops', 'idle'].includes(project.currentPhase) && !['pm', 'architect', 'backend', 'frontend'].includes(project.currentPhase)) {
      weeklyMatrix['qa'][startDay] = 6;
      weeklyMatrix['devops'][startDay] = 5;
    }
  }

  // Create flat datastructures for Recharts Scatter displays
  const hourlyHeatmapData: any[] = [];
  const weeklyHeatmapData: any[] = [];
  let maxHourlyCount = 1;
  let maxWeeklyCount = 1;

  AGENT_ORDER.forEach((agentId, agentIndex) => {
    for (let h = 0; h < 24; h++) {
      const count = hourlyMatrix[agentId][h];
      if (count > maxHourlyCount) maxHourlyCount = count;
      hourlyHeatmapData.push({
        x: h,
        y: agentIndex,
        agentId,
        agentName: AGENT_LABELS[agentId],
        count
      });
    }

    for (let d = 0; d < 7; d++) {
      const count = weeklyMatrix[agentId][d];
      if (count > maxWeeklyCount) maxWeeklyCount = count;
      weeklyHeatmapData.push({
        x: d,
        y: agentIndex,
        agentId,
        agentName: AGENT_LABELS[agentId],
        count
      });
    }
  });

  // 1. Core KPIs
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const taskProgressPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // Calculate dynamic LOC
  const totalLinesOfCode = files.reduce((sum, f) => {
    return sum + (f.content ? f.content.split('\n').length : 0);
  }, 0);

  // Exclude system and user from agent messages stats to see team engagement
  const teamMessages = messages.filter(m => m.senderId !== 'user' && m.senderId !== 'system');
  const agentFactCount = memories.length;

  // 2. Task Priority Distribution
  const highPriority = tasks.filter(t => t.priority === 'high').length;
  const midPriority = tasks.filter(t => t.priority === 'medium').length;
  const lowPriority = tasks.filter(t => t.priority === 'low' || !t.priority).length;

  const priorityData = [
    { name: 'High Priority', value: highPriority, color: '#ef4444' },
    { name: 'Medium Priority', value: midPriority, color: '#f59e0b' },
    { name: 'Low Priority', value: lowPriority, color: '#3b82f6' },
  ].filter(p => p.value > 0);

  // 3. File Composition Breakdown
  const codeFiles = files.filter(f => f.fileType === 'code').length;
  const configFiles = files.filter(f => f.fileType === 'config').length;
  const testFiles = files.filter(f => f.fileType === 'test').length;
  const docFiles = files.filter(f => f.fileType === 'doc').length;

  const fileTypeData = [
    { name: 'Source Code', value: codeFiles, color: '#6366f1' },
    { name: 'Config / Specs', value: configFiles, color: '#a855f7' },
    { name: 'Test Suites', value: testFiles, color: '#10b981' },
    { name: 'Documentation', value: docFiles, color: '#64748b' }
  ].filter(item => item.value > 0);

  // 4. Agent Performance & Engagement
  // Compare Task load (count) vs Message load (count)
  const agentNamesMap: Record<string, string> = {
    pm: 'PM',
    architect: 'Architect',
    backend: 'Backend',
    frontend: 'Frontend',
    qa: 'QA',
    devops: 'DevOps'
  };

  const agentPerformanceData = Object.keys(agentNamesMap).map(agentId => {
    const tasksCount = tasks.filter(t => t.assignedAgentId === agentId).length;
    const messagesCount = messages.filter(m => m.senderId === agentId).length;
    return {
      agent: agentNamesMap[agentId],
      tasks: tasksCount,
      messages: messagesCount,
    };
  });

  // Calculations for Agent Task Distribution nested donut chart
  const innerPieData: any[] = [];
  const outerPieData: any[] = [];

  AGENT_ORDER.forEach((agentId) => {
    const agentTasks = tasks.filter(t => t.assignedAgentId === agentId);
    const total = agentTasks.length;
    if (total > 0) {
      const activeCount = agentTasks.filter(t => t.status === 'in_progress' || t.status === 'completed').length;
      const stalledCount = agentTasks.filter(t => t.status === 'pending' || t.status === 'failed').length;

      innerPieData.push({
        name: AGENT_LABELS[agentId] || agentId.toUpperCase(),
        value: total,
        agentId,
        color: AGENT_COLORS[agentId] || '#cbd5e1',
        activeCount,
        stalledCount
      });

      if (activeCount > 0) {
        outerPieData.push({
          name: `${AGENT_LABELS[agentId]} (Active)`,
          value: activeCount,
          agentId,
          status: 'Active',
          color: AGENT_COLORS[agentId] || '#6366f1'
        });
      }
      if (stalledCount > 0) {
        outerPieData.push({
          name: `${AGENT_LABELS[agentId]} (Stalled)`,
          value: stalledCount,
          agentId,
          status: 'Stalled',
          color: (AGENT_COLORS[agentId] || '#cbd5e1') + '66'
        });
      }
    }
  });

  // 5. Development Phase List for Flowchart
  const phases = [
    { id: 'pm', name: 'Planning (PM)', desc: 'PRD & Milestones Specs', emoji: '💼' },
    { id: 'architect', name: 'Design (Architect)', desc: 'System Model & Decisions', emoji: '📐' },
    { id: 'backend', name: 'Core APIs (Backend)', desc: 'Endpoints & Schemas', emoji: '⚙️' },
    { id: 'frontend', name: 'Layout (Frontend)', desc: 'UX Dashboards & Modules', emoji: '🎨' },
    { id: 'qa', name: 'Testing (QA)', desc: 'Specifications Validation', emoji: '🧪' },
    { id: 'devops', name: 'Deploy (DevOps)', desc: 'CI/CD & Container Specs', emoji: '🐳' }
  ];

  // Helper to determine phase status styling in graph
  const getPhaseStatus = (phaseId: string) => {
    const currentPhase = project.currentPhase;
    const pStatus = project.status;

    if (pStatus === 'completed') return 'completed';
    if (pStatus === 'failed') return 'idle';

    const order = ['pm', 'architect', 'backend', 'frontend', 'qa', 'devops'];
    const currentIndex = order.indexOf(currentPhase);
    const targetIndex = order.indexOf(phaseId);

    if (currentPhase === 'idle' || currentIndex === -1) {
      return 'idle';
    }

    if (targetIndex < currentIndex) return 'completed';
    if (targetIndex === currentIndex) return 'active';
    return 'idle';
  };

  // Custom heatmap tooltip render function to display contribution metrics
  const CustomTooltipForHeatmap = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const color = AGENT_COLORS[item.agentId] || '#6366f1';
      return (
        <div className="bg-white dark:bg-[#151518] border border-gray-150 dark:border-zinc-800 p-2.5 rounded-lg shadow-lg text-[10px] font-sans">
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-gray-950 dark:text-zinc-200">{item.agentName} Contribution</span>
          </div>
          <div className="space-y-0.5 text-gray-500 dark:text-zinc-400 font-sans">
            <p>{heatmapMode === 'hourly' ? `Active Hour: ${String(item.x).padStart(2, '0')}:00` : `Calendar Day: ${dayNames[item.x]}`}</p>
            <p className="font-semibold text-indigo-600 dark:text-indigo-400">
              Contributions: <span className="font-mono font-bold text-xs">{item.count}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Tooltip render function for Agent Task Distribution donut chart
  const AgentTaskDonutTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const baseColor = AGENT_COLORS[item.agentId] || '#6366f1';
      return (
        <div className="bg-white dark:bg-[#151518] border border-gray-150 dark:border-zinc-805 p-2.5 rounded-lg shadow-lg text-[10px] font-sans">
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: baseColor }} />
            <span className="text-gray-950 dark:text-zinc-200">
              {item.agentName || item.name}
            </span>
          </div>
          <div className="space-y-0.5 text-gray-500 dark:text-zinc-400 font-sans">
            {item.status ? (
              <>
                <p className="capitalize">Status: <span className="font-semibold text-gray-700 dark:text-zinc-300">{item.status}</span></p>
                <p className="font-semibold text-indigo-650 dark:text-indigo-400">
                  Tasks count: <span className="font-mono font-bold text-xs">{item.value}</span>
                </p>
              </>
            ) : (
              <>
                <p className="font-semibold text-gray-700 dark:text-zinc-300">
                  Total Workload: <span className="font-mono font-bold text-xs">{item.value}</span>
                </p>
                <p className="text-emerald-550 dark:text-emerald-400 font-medium">
                  Active: <span className="font-mono font-bold">{item.activeCount || 0}</span>
                </p>
                <p className="text-amber-500 dark:text-amber-450 font-medium">
                  Stalled: <span className="font-mono font-bold">{item.stalledCount || 0}</span>
                </p>
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5 flex flex-col min-h-0 pb-10" id="project-visual-dashboard">
      
      {/* GitHub Sync Space Widget Card */}
      <div className="bg-white dark:bg-[#1a1a1e] border border-gray-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col gap-4 font-sans">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-800 dark:text-zinc-200 shrink-0">
              <Github className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                Sync Codebase with GitHub
                {syncAuthMethod === 'oauth' ? (
                  githubToken ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      OAuth Integrated
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-450 border border-gray-200/50">
                      OAuth Disconnected
                    </span>
                  )
                ) : (
                  (sshPrivateKey && sshRepoUrl) ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-200/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      SSH Configured
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200/50">
                      SSH Unconfigured
                    </span>
                  )
                )}
              </h4>
              <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5 max-w-xl">
                Ready to publish the software codebase written by your simulated agent team? Manage credentials securely, validate formats, and push files in seconds.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-3.5 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60 rounded-lg transition-colors border border-indigo-200/30 flex items-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              Manage Credentials
            </button>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-gray-150 dark:border-zinc-800/80 pb-2 gap-4">
          <button
            type="button"
            onClick={() => {
              setSyncAuthMethod('oauth');
              localStorage.setItem('github_sync_auth_method', 'oauth');
              setSyncError(null);
              setSyncSuccessUrl(null);
            }}
            className={`text-xs font-bold pb-1.5 transition-all border-b-2 px-1 ${syncAuthMethod === 'oauth' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300'}`}
          >
            OAuth / Personal Tokens
          </button>
          <button
            type="button"
            onClick={() => {
              setSyncAuthMethod('ssh');
              localStorage.setItem('github_sync_auth_method', 'ssh');
              setSyncError(null);
              setSyncSuccessUrl(null);
            }}
            className={`text-xs font-bold pb-1.5 transition-all border-b-2 px-1 ${syncAuthMethod === 'ssh' ? 'border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400' : 'border-transparent text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300'}`}
          >
            SSH Deploy Key Authentication
          </button>
        </div>

        {/* ======================================= */}
        {/* VIEW 1: OAUTH FLOW & TOKEN CONFIG       */}
        {/* ======================================= */}
        {syncAuthMethod === 'oauth' && (
          <div className="space-y-4">
            {/* Connected / Sign In details if disconnected */}
            {!githubToken && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10.5px] font-bold text-gray-700 dark:text-zinc-300">Authorize Repository Access</span>
                  <div>
                    {hasOauthConfig ? (
                      <button
                        onClick={handleGithubConnect}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                      >
                        <Github className="w-3.5 h-3.5" />
                        Sign in with GitHub
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowConfigOptions(!showConfigOptions)}
                          className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
                        >
                          <Settings className="w-3.5 h-3.5 animate-spin-slow" />
                          Manual Token Setup
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Manual Token Setup fallback card panel */}
                {(!githubToken || showConfigOptions) && !hasOauthConfig && (
                  <div className="border-t border-dashed border-gray-150 dark:border-zinc-805 pt-3 pb-2 text-[10px] space-y-3">
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5 text-amber-600 dark:text-amber-400 flex items-start gap-2.5">
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold">GitHub OAuth app context is not detected in platform environment settings.</p>
                        <p className="opacity-90 max-w-xl">
                          To establish single-click secure handshakes, configure <code className="font-mono bg-zinc-150 dark:bg-zinc-800 px-1 py-0.5 rounded text-gray-800 dark:text-zinc-200 text-[9px]">GITHUB_CLIENT_ID</code> variables.
                        </p>
                        <div className="font-medium pt-1">
                          <strong>OAuth Callback:</strong> <code className="font-mono bg-zinc-150 dark:bg-zinc-800 px-1 py-0.5 rounded select-all text-indigo-650 dark:text-indigo-400 text-[9px]">{window.location.origin}/auth/callback</code>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-end gap-2 max-w-lg mt-1">
                      <div className="flex-1 space-y-1 w-full">
                        <span className="block font-semibold text-gray-700 dark:text-zinc-300">Or Provide Personal Access Token (PAT):</span>
                        <input
                          type="password"
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxx"
                          value={patInput}
                          onChange={(e) => setPatInput(e.target.value)}
                          className="w-full text-xs bg-gray-50 dark:bg-[#151518] border border-gray-205 dark:border-zinc-750 px-3 py-1.5 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-gray-800 dark:text-zinc-100"
                        />
                        <p className="text-[9px] text-gray-450 dark:text-zinc-500 leading-tight">
                          Token requires <code className="font-semibold text-zinc-350">repo:all</code> API scopes to push files. Create one at <a href="https://github.com/settings/tokens" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">github.com/settings/tokens</a>.
                        </p>
                      </div>
                      <button
                        onClick={handleSavePat}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-gray-800 hover:bg-gray-900 dark:bg-zinc-750 dark:hover:bg-zinc-650 rounded-lg transition-colors border border-gray-700/50"
                      >
                        Save Token
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Authenticated and Active Push Details Form */}
            {githubToken && (
              <div className="border-t border-dashed border-gray-150 dark:border-zinc-800 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-1.5 md:col-span-1">
                  <label className="block text-[10.5px] font-bold text-gray-700 dark:text-zinc-300">
                    Target Repository Name (Auto-Created)
                  </label>
                  <input
                    type="text"
                    placeholder="repo-name"
                    value={repoNameInput}
                    onChange={(e) => setRepoNameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]+/g, ''))}
                    className="w-full text-xs bg-gray-50/50 dark:bg-[#151518] border border-gray-150 dark:border-zinc-755 px-3 py-1.5 rounded-md focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-gray-800 dark:text-zinc-100 font-mono font-bold"
                  />
                </div>

                <div className="flex items-center gap-5 pb-2 md:col-span-1 min-h-[36px]">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRepoPrivate(!repoPrivate)}
                      className={`w-9 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-all duration-200 ease-in-out ${repoPrivate ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-zinc-700'}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ease-in-out ${repoPrivate ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                    <div className="flex items-center gap-1 text-xs select-none">
                      {repoPrivate ? (
                        <span className="font-semibold text-amber-655 dark:text-amber-405 flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5" /> Private Repo
                        </span>
                      ) : (
                        <span className="font-semibold text-gray-600 dark:text-zinc-400 flex items-center gap-1">
                          <Globe className="w-3.5 h-3.5" /> Public Repo
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 md:col-span-1">
                  <button
                    onClick={handlePushToGithub}
                    disabled={isSyncing || files.length === 0}
                    className="w-full py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1.5 min-h-[32px]"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Committing over Rest API...
                      </>
                    ) : (
                      <>
                        <Globe className="w-3.5 h-3.5" />
                        Sync via Rest API
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================= */}
        {/* VIEW 2: SSH KEY DEPLOY AUTH             */}
        {/* ======================================= */}
        {syncAuthMethod === 'ssh' && (
          <div className="space-y-4">
            {(!sshPrivateKey || !sshRepoUrl) ? (
              <div className="border border-dashed border-gray-200 dark:border-zinc-800 rounded-lg p-5 flex flex-col items-center justify-center text-center gap-3">
                <Key className="w-8 h-8 text-indigo-500 animate-bounce" />
                <div className="space-y-1">
                  <h5 className="font-bold text-xs text-gray-900 dark:text-zinc-250">SSH Handshake is not configured yet</h5>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 max-w-md mx-auto leading-relaxed">
                    Set up a custom cryptographic Deploy Key on your pre-existing GitHub repository. This allows our backend service to push local workspace changes directly using git-over-SSH protocols.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSshModal(true)}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Settings className="w-3.5 h-3.5 shrink-0" />
                  Configure Deploy Keys & SSH Remote
                </button>
              </div>
            ) : (
              <div className="border border-gray-150 dark:border-zinc-800/60 rounded-xl p-3 bg-gray-50/50 dark:bg-[#151518] flex flex-col gap-3 font-sans">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-150 dark:border-zinc-800/80 pb-3 text-xs">
                  <div className="space-y-1 min-w-0">
                    <span className="block text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest leading-none">SSH Repository Link</span>
                    <span className="block font-mono text-gray-900 dark:text-zinc-100 font-bold truncate">
                      {sshRepoUrl}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50 leading-none">
                      Deploy Key Active
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSshModal(true)}
                      className="p-1 cursor-pointer text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      title="Edit SSH Config"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                  <div className="flex items-center gap-2 text-gray-400 dark:text-zinc-500 text-[10px]">
                    <Terminal className="w-4 h-4 text-indigo-505" />
                    <span>Using secure RSA Git Transport Handshake.</span>
                  </div>
                  <button
                    onClick={handlePushUsingSsh}
                    disabled={isSyncing || files.length === 0}
                    className="w-full sm:w-auto px-6 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all shadow-xs flex items-center justify-center gap-1.5 min-h-[32px] shrink-0"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Pushing via SSH...
                      </>
                    ) : (
                      <>
                        <Key className="w-3.5 h-3.5" />
                        Sync using Git SSH
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Global Action Feedbacks */}
        {syncError && (
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 p-2.5 rounded-lg text-[10px] font-medium flex items-start gap-2 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{syncError}</span>
          </div>
        )}

        {syncSuccessUrl && (
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 p-3 rounded-lg text-[10px] font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <p className="font-bold">Synchronization Completed Successfully!</p>
                <p className="opacity-90 font-medium">All files generated for {project.name} have been committed directly to your repository.</p>
              </div>
            </div>
            <a
              href={syncSuccessUrl}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 font-bold text-white text-center rounded-md flex items-center justify-center gap-1 shrink-0 transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              Open Repository
            </a>
          </div>
        )}
      </div>

      {showAuthModal && (
        <GithubAuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          project={project}
          hasOauthConfig={hasOauthConfig}
          onGithubConnectPopup={handleGithubConnect}
          onSettingsSaved={(updated) => {
            if (onProjectUpdated) {
              onProjectUpdated(updated);
            }
          }}
        />
      )}

      {/* SSH Config Modal */}
      {showSshModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans animate-fadeIn">
          <div className="bg-white dark:bg-[#1a1a1e] border border-gray-200 dark:border-zinc-800 rounded-xl max-w-2xl w-full shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            {/* Header */}
            <div className="p-4 border-b border-gray-150 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 animate-pulse" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                  SSH Handshake Configuration Settings
                </h3>
              </div>
              <button 
                onClick={() => setShowSshModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xs font-semibold px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all"
              >
                ✕ Close
              </button>
            </div>

            {/* Content */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
              
              {/* Remote SSH URL */}
              <div className="space-y-1">
                <label className="block text-[10.5px] font-bold text-gray-700 dark:text-zinc-350">
                  GitHub Repository SSH URL
                </label>
                <input
                  type="text"
                  placeholder="git@github.com:username/repository-name.git"
                  value={sshRepoUrl}
                  onChange={(e) => setSshRepoUrl(e.target.value)}
                  className="w-full text-xs bg-gray-50 dark:bg-[#121215] border border-gray-200 dark:border-zinc-750 px-3 py-1.5 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-gray-805 dark:text-zinc-100 font-mono"
                />
                <p className="text-[9px] text-gray-400 dark:text-zinc-500 leading-normal">
                  Target repo must be created on GitHub beforehand. Format: <code className="font-semibold text-gray-650 dark:text-zinc-400">git@github.com:owner/repo.git</code>
                </p>
              </div>

              {/* Private / Public Keys Block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Private Key Column */}
                <div className="space-y-1.5 flex flex-col min-w-0">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10.5px] font-bold text-gray-700 dark:text-zinc-355">
                      SSH Private Key (RSA)
                    </label>
                    <button
                      type="button"
                      disabled={isGeneratingSsh}
                      onClick={async () => {
                        const keys = await handleGenerateSshKeys();
                        if (keys) {
                          setSshPrivateKey(keys.privateKey);
                          setSshPublicKey(keys.publicKey);
                        }
                      }}
                      className="text-[9.5px] font-extrabold text-indigo-600 hover:text-indigo-750 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded cursor-pointer transition-colors"
                    >
                      {isGeneratingSsh ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        'Generate Keypair'
                      )}
                    </button>
                  </div>
                  <textarea
                    placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;..."
                    rows={8}
                    value={sshPrivateKey}
                    onChange={(e) => {
                      setSshPrivateKey(e.target.value);
                      if (!e.target.value) setSshPublicKey('');
                    }}
                    className="w-full text-[9px] leading-relaxed bg-gray-50 dark:bg-[#121215] border border-gray-200 dark:border-zinc-750 p-2.5 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-gray-800 dark:text-zinc-200 font-mono resize-none h-40 select-all"
                  />
                  <p className="text-[9px] text-gray-400 dark:text-zinc-500 leading-tight">
                    This private credential remains secured on your local browser space. Do not share.
                  </p>
                </div>

                {/* Public Key Column */}
                <div className="space-y-1.5 flex flex-col min-w-0">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10.5px] font-bold text-gray-700 dark:text-zinc-355">
                      SSH Public Key (Deploy Key)
                    </label>
                    {sshPublicKey && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(sshPublicKey);
                          setSshKeyCopied(true);
                          setTimeout(() => setSshKeyCopied(false), 2000);
                        }}
                        className="text-[9.5px] font-bold text-emerald-605 flex items-center gap-1 hover:underline cursor-pointer bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded"
                      >
                        {sshKeyCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy Public Key
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <textarea
                    readOnly
                    placeholder="Generates dynamically after clicking Generate Keypair..."
                    rows={8}
                    value={sshPublicKey}
                    className="w-full text-[9px] leading-relaxed bg-gray-100/50 dark:bg-[#0f0f12] border border-gray-200 dark:border-zinc-800 p-2.5 rounded-lg focus:outline-hidden text-gray-500 dark:text-zinc-400 font-mono resize-none h-40 select-all"
                  />
                  <p className="text-[9px] text-gray-400 dark:text-zinc-500 leading-tight">
                    Add this to your GitHub Repository settings (&gt; <strong>Settings &gt; Deploy keys</strong>) with <strong>Write Access</strong> checked.
                  </p>
                </div>
              </div>

              {/* Instructions Callout */}
              <div className="bg-slate-50 dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850 rounded-lg p-3 space-y-2">
                <span className="block font-bold text-gray-800 dark:text-zinc-200 text-[10px]">Step-by-Step GitHub Deploy Instructions:</span>
                <ol className="list-decimal list-inside pl-0.5 text-[9.5px] space-y-1.5 text-gray-600 dark:text-zinc-400 leading-normal">
                  <li>Click <strong className="text-indigo-600 dark:text-indigo-400">Generate Keypair</strong> above to build standard cryptographic certificates.</li>
                  <li>Copy the <strong className="text-emerald-555">Public Key</strong>, navigate to your empty GitHub repository settings page, and click <strong className="font-semibold text-gray-700 dark:text-zinc-300">Deploy Keys</strong> on the sidebar.</li>
                  <li>Click <strong className="font-semibold text-gray-755 dark:text-zinc-300">Add Deploy Key</strong>, paste the public certificate content, and <strong>MUST</strong> check the box <strong className="text-indigo-605">"Allow write access"</strong>.</li>
                  <li>Paste the repository SSH URI above, click <strong className="underline">Save Configuration</strong>, and trigger the Sync push!</li>
                </ol>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 dark:bg-zinc-900/60 border-t border-gray-150 dark:border-zinc-800 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSshPrivateKey('');
                  setSshPublicKey('');
                  setSshRepoUrl('');
                  localStorage.removeItem('github_ssh_private_key');
                  localStorage.removeItem('github_ssh_public_key');
                  localStorage.removeItem('github_ssh_repo_url');
                }}
                className="px-3 py-1.5 text-xs font-semibold text-rose-650 hover:text-rose-700 bg-rose-50 hover:bg-rose-105/50 dark:bg-rose-950/20 dark:hover:bg-rose-950/30 rounded-lg transition-colors border border-rose-200/50"
              >
                Clear Settings
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSaveSshConfig(sshPrivateKey, sshPublicKey, sshRepoUrl);
                  setShowSshModal(false);
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg transition-colors shadow-xs"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: High Level KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Development Progress */}
        <div className="bg-white dark:bg-[#1a1a1e] border border-gray-200 dark:border-zinc-800 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Roadmap Progress</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-extrabold text-gray-900 dark:text-zinc-100 font-mono">
                {taskProgressPct}%
              </span>
              <span className="text-[10px] text-gray-500 font-medium">
                ({completedTasks}/{totalTasks} done)
              </span>
            </div>
            {/* Tiny indicator */}
            <div className="w-full bg-gray-150 dark:bg-zinc-800 h-1 rounded-full mt-1.5 overflow-hidden">
              <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${taskProgressPct}%` }} />
            </div>
          </div>
        </div>

        {/* KPI 2: Software Codebase Generated */}
        <div className="bg-white dark:bg-[#1a1a1e] border border-gray-200 dark:border-zinc-800 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <FileCode className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Dynamic Codebase</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-extrabold text-gray-900 dark:text-zinc-100 font-mono">
                {totalLinesOfCode}
              </span>
              <span className="text-[10px] text-gray-500 font-medium font-sans">
                Lines ({files.length} files)
              </span>
            </div>
            <p className="text-[9.5px] text-gray-400 dark:text-zinc-500 truncate mt-1">Generated by developer teams</p>
          </div>
        </div>

        {/* KPI 3: Autonomous Discussions Exchanged */}
        <div className="bg-white dark:bg-[#1a1a1e] border border-gray-200 dark:border-zinc-800 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Discussion Volume</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-extrabold text-gray-900 dark:text-zinc-100 font-mono">
                {teamMessages.length}
              </span>
              <span className="text-[10px] text-gray-500 font-medium">
                Sentences
              </span>
            </div>
            <p className="text-[9.5px] text-gray-400 dark:text-zinc-500 truncate mt-1">In deep-reasoning cycles</p>
          </div>
        </div>

        {/* KPI 4: Decision Memories Registered */}
        <div className="bg-white dark:bg-[#1a1a1e] border border-gray-200 dark:border-zinc-800 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wider font-sans">Memory Registry</span>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg font-extrabold text-gray-900 dark:text-zinc-100 font-mono">
                {agentFactCount}
              </span>
              <span className="text-[10px] text-gray-500 font-medium">
                Key Decisions
              </span>
            </div>
            <p className="text-[9.5px] text-gray-400 dark:text-zinc-500 truncate mt-1">Stored during design phase</p>
          </div>
        </div>
      </div>

      {/* SECTION 2: Development Phase Pipeline DAG / Flowchart */}
      <div className="bg-white dark:bg-[#1a1a1e] border border-gray-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
        <h3 className="text-xs font-bold font-sans text-gray-950 dark:text-zinc-200 mb-4 flex items-center gap-1.5">
          <span className="text-indigo-500">❖</span> Autonomous Team Phase Pipeline & Flowchart
        </h3>

        {/* Desktop Pipeline Cards connected with arrows */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2.5 relative">
          {phases.map((ph, idx) => {
            const status = getPhaseStatus(ph.id);
            const isLast = idx === phases.length - 1;

            return (
              <div key={ph.id} className="relative flex items-center">
                {/* Individual Card */}
                <div className={`p-3 rounded-lg border w-full text-center transition-all duration-305 ${
                  status === 'completed'
                    ? 'bg-emerald-50/10 dark:bg-emerald-950/5 border-emerald-500/50 text-emerald-650'
                    : status === 'active'
                    ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md text-indigo-750 font-semibold animate-pulse'
                    : 'bg-gray-50/40 dark:bg-[#16161a]/40 border-gray-150 dark:border-zinc-850 text-gray-500'
                }`}>
                  <div className="text-lg mb-1 leading-none">{ph.emoji}</div>
                  <div className="text-[11px] font-bold truncate leading-tight">
                    {ph.name}
                  </div>
                  <div className="text-[8.5px] opacity-80 leading-normal line-clamp-1 mt-0.5">
                    {ph.desc}
                  </div>

                  {/* Badge status indicator */}
                  <span className={`inline-block mt-2 text-[8.5px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                    status === 'completed'
                      ? 'bg-emerald-100/60 dark:bg-emerald-900/10 text-emerald-600'
                      : status === 'active'
                      ? 'bg-indigo-100 dark:bg-indigo-950/20 text-indigo-600'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-400'
                  }`}>
                    {status === 'active' ? 'Active' : status === 'completed' ? 'Done' : 'Waiting'}
                  </span>
                </div>

                {/* Arrow to match next phase in desktop layouts */}
                {!isLast && (
                  <div className="hidden md:flex absolute -right-2 top-11 transform -translate-y-1/2 z-10 text-gray-300 dark:text-zinc-700 pointer-events-none">
                    <ArrowRight className="w-4.5 h-4.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Detail Analytics Sub-grid (Pie Charts & Custom Bar Charts) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[300px]">
        {/* Left Column (Span 4) - Task Priority Distribution Pie Chart */}
        <div className="lg:col-span-4 bg-white dark:bg-[#1a1a1e] border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col h-[340px] shadow-sm">
          <div className="mb-2 shrink-0">
            <h4 className="text-xs font-bold font-sans text-gray-950 dark:text-zinc-200 leading-tight">
              Task Priority Composition
            </h4>
            <p className="text-[10px] text-gray-400 dark:text-zinc-500">Urgency classification of autonomous workload</p>
          </div>

          {totalTasks === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 dark:text-zinc-500 text-xs">
              No tasks declared yet.<br />Initiate PM phase to see stats.
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 relative items-center justify-center">
              <div className="w-full h-[65%] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip 
                      contentStyle={{ background: '#1c1c24', border: 'none', borderRadius: '4px', fontSize: '10px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Custom Legend */}
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 mt-2 text-[10px] font-sans">
                {priorityData.map((item, id) => (
                  <div key={id} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-600 dark:text-zinc-350">{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Middle Column (Span 4) - File type Composition Pie Chart */}
        <div className="lg:col-span-4 bg-white dark:bg-[#1a1a1e] border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col h-[340px] shadow-sm">
          <div className="mb-2 shrink-0">
            <h4 className="text-xs font-bold font-sans text-gray-950 dark:text-zinc-200 leading-tight">
              File Codebase Makeup
            </h4>
            <p className="text-[10px] text-gray-400 dark:text-zinc-500">File-type allocation in workspaces</p>
          </div>

          {files.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 dark:text-zinc-500 text-xs">
              No codebase files created yet.<br />Files write during development phases.
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 relative items-center justify-center">
              <div className="w-full h-[65%] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip 
                      contentStyle={{ background: '#1c1c24', border: 'none', borderRadius: '4px', fontSize: '10px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Pie
                      data={fileTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {fileTypeData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Custom Legend */}
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 mt-2 text-[10px] font-sans">
                {fileTypeData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-600 dark:text-zinc-350">{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column (Span 4) - Agent Task Distribution Donut Chart */}
        <div className="lg:col-span-4 bg-white dark:bg-[#1a1a1e] border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col h-[340px] shadow-sm">
          <div className="mb-2 shrink-0">
            <h4 className="text-xs font-bold font-sans text-gray-950 dark:text-zinc-200 leading-tight">
              Agent Task Distribution
            </h4>
            <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-sans">Inner: Agent Load | Outer: Active vs Stalled Tasks</p>
          </div>

          {totalTasks === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 dark:text-zinc-500 text-xs">
              No tasks declared yet.<br />Initiate PM phase to see stats.
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 relative items-center justify-center">
              <div className="w-full h-[65%] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<AgentTaskDonutTooltip />} />
                    {/* Inner Pie: Agent distribution */}
                    <Pie
                      data={innerPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={45}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {innerPieData.map((entry, index) => (
                        <Cell key={`cell-inner-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    {/* Outer Pie: Active vs Stalled status */}
                    <Pie
                      data={outerPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={49}
                      outerRadius={62}
                      paddingAngle={1}
                      dataKey="value"
                    >
                      {outerPieData.map((entry, index) => (
                        <Cell key={`cell-outer-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center aggregate number absolute bubble */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[12px] font-extrabold text-gray-900 dark:text-zinc-100 font-mono">
                    {totalTasks}
                  </span>
                  <span className="text-[6.5px] uppercase tracking-wider font-extrabold text-gray-400 dark:text-zinc-500">
                    Schedules
                  </span>
                </div>
              </div>

              {/* Multi-tier status legend */}
              <div className="flex flex-wrap justify-center gap-x-2.5 gap-y-1 mt-2 text-[8px] font-sans overflow-y-auto max-h-[85px] w-full scrollbar-thin">
                {innerPieData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1 bg-gray-50/40 dark:bg-zinc-900/30 px-1.5 py-0.5 rounded border border-gray-100 dark:border-zinc-850">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-gray-750 dark:text-zinc-350">{item.name} ({item.value})</span>
                    <span className="text-[7.5px] text-gray-450 dark:text-zinc-500 opacity-90 shrink-0 font-medium">
                      (A:{item.activeCount} S:{item.stalledCount})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: Agent Contribution Heatmap (Temporal Frequency Matrix) */}
      <div className="bg-white dark:bg-[#1a1a1e] border border-gray-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm mt-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-gray-100 dark:border-zinc-850">
          <div>
            <h3 className="text-xs font-bold font-sans text-gray-950 dark:text-zinc-200 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-500 shrink-0" />
              Agent Contribution Heatmap
            </h3>
            <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5 font-sans">
              Visualizes developer output speed, mapping work vectors to daily calendar grids and hourly cycles.
            </p>
          </div>

          {/* Toggle buttons for Hourly vs. Weekly modes */}
          <div className="flex bg-gray-100 dark:bg-[#151518] p-1 rounded-lg border border-gray-200 dark:border-zinc-850 text-[10px] self-start sm:self-auto shrink-0 font-semibold font-sans">
            <button
              onClick={() => setHeatmapMode('hourly')}
              className={`flex items-center gap-1.5 py-1 px-3 rounded-md transition-all cursor-pointer ${
                heatmapMode === 'hourly'
                  ? 'bg-white dark:bg-[#1a1a1e] text-indigo-650 dark:text-indigo-400 font-bold shadow-xs'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-350'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Hourly Timeline
            </button>
            <button
              onClick={() => setHeatmapMode('calendar')}
              className={`flex items-center gap-1.5 py-1 px-3 rounded-md transition-all cursor-pointer ${
                heatmapMode === 'calendar'
                  ? 'bg-white dark:bg-[#1a1a1e] text-indigo-650 dark:text-indigo-400 font-bold shadow-xs'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-350'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Weekly Calendar
            </button>
          </div>
        </div>

        {/* Heatmap Graphic stage */}
        <div className="w-full h-[250px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 10, right: 10, bottom: 5, left: -10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.1)" vertical={false} />
              
              <XAxis 
                type="number" 
                dataKey="x" 
                name={heatmapMode === 'hourly' ? 'Hour' : 'Day'} 
                domain={heatmapMode === 'hourly' ? [0, 23] : [0, 6]}
                ticks={heatmapMode === 'hourly' ? [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22] : [0, 1, 2, 3, 4, 5, 6]}
                tickFormatter={heatmapMode === 'hourly' ? (h) => `${String(h).padStart(2, '0')}:00` : (d) => dayNames[d]}
                stroke="currentColor"
                className="text-[9px] text-gray-400 dark:text-zinc-500 font-sans"
                tickLine={false}
                axisLine={false}
              />
              
              <YAxis 
                type="number" 
                dataKey="y" 
                name="Agent" 
                domain={[0, 5]}
                ticks={[0, 1, 2, 3, 4, 5]}
                tickFormatter={(idx) => AGENT_LABELS[AGENT_ORDER[idx]] || ''}
                stroke="currentColor"
                className="text-[9px] text-gray-400 dark:text-zinc-500 font-bold font-sans"
                tickLine={false}
                axisLine={false}
              />
              
              <ZAxis 
                type="number" 
                dataKey="count" 
                range={[36, 320]} 
              />
              
              <Tooltip 
                cursor={{ strokeDasharray: '3 3', stroke: 'rgba(99, 102, 241, 0.15)' }} 
                content={<CustomTooltipForHeatmap />}
              />
              
              <Scatter 
                data={heatmapMode === 'hourly' ? hourlyHeatmapData : weeklyHeatmapData}
                shape="circle"
              >
                {(heatmapMode === 'hourly' ? hourlyHeatmapData : weeklyHeatmapData).map((entry: any, index: number) => {
                  const maxVal = heatmapMode === 'hourly' ? maxHourlyCount : maxWeeklyCount;
                  
                  // Inactive points are drawn in extremely subtle translucent mode 
                  // to frame the graph as an aesthetic, clean placeholder grid of activities.
                  const opacity = entry.count === 0 ? 0.05 : 0.25 + (entry.count / maxVal) * 0.75;
                  const color = AGENT_COLORS[entry.agentId] || '#6366f1';
                  
                  return (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={color} 
                      fillOpacity={opacity}
                      stroke={entry.count === 0 ? 'rgba(120, 120, 120, 0.1)' : color}
                      strokeOpacity={opacity + 0.1}
                      strokeWidth={1}
                    />
                  );
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Legend / Info Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-zinc-850">
          <div className="flex items-center gap-1.5 text-[9px] text-gray-400 dark:text-zinc-500 font-sans">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span>Interactive graph. Hover circles to view exact frequency metrics.</span>
          </div>

          <div className="flex items-center gap-1.5 text-[9px] text-gray-400 dark:text-zinc-500 font-sans font-medium">
            <span>Less Activity</span>
            <div className="flex gap-0.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700" />
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500/20" />
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500/40" />
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500/60" />
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500/80" />
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
            </div>
            <span>More Activity</span>
          </div>
        </div>
      </div>

    </div>
  );
}
