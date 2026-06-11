/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { AgentMessage, Agent } from '../types.js';
import { Bot, MessageSquare, Terminal } from 'lucide-react';

interface ChatPanelProps {
  messages: AgentMessage[];
  agents: Agent[];
  currentPhase: string;
}

export default function ChatPanel({ messages, agents, currentPhase }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom on new messages
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getAgentColor = (senderId: string) => {
    const agent = agents.find(a => a.id === senderId);
    if (agent) return agent.colorClass;
    if (senderId === 'user') return 'bg-indigo-50 border-indigo-200 text-indigo-900 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-300';
    return 'bg-gray-100 border-gray-200 text-gray-800 dark:bg-zinc-800/40 dark:border-zinc-800 dark:text-zinc-300';
  };

  const getAgentEmoji = (senderId: string) => {
    const agent = agents.find(a => a.id === senderId);
    if (agent) return agent.avatarEmoji;
    if (senderId === 'user') return '👤';
    return '🤖';
  };

  return (
    <div className="bg-white dark:bg-[#1a1a1e] border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col h-full shadow-sm" id="chat-interactions-panel">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-indigo-500" />
          <h2 className="font-semibold text-gray-900 dark:text-zinc-100 font-sans tracking-tight">Agent Standup Messenger</h2>
        </div>
        {currentPhase !== 'idle' && (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Agent speaking...</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 dark:text-zinc-500 py-10">
            <Bot className="w-10 h-10 mb-2 opacity-30 text-gray-400 dark:text-zinc-650" />
            <p className="font-sans leading-relaxed">
              No messenger communications.<br />Start project flow generation to see agents debate,<br />design, and verify source codes.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isSelf = m.senderId === 'user';
            
            return (
              <div 
                key={m.id} 
                className={`flex gap-3 max-w-[90%] items-start ${
                  isSelf ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full border border-gray-200 dark:border-zinc-800 flex items-center justify-center text-base shrink-0 bg-white dark:bg-[#151518] shadow-sm select-none">
                  {getAgentEmoji(m.senderId)}
                </div>

                {/* Message Bubble container */}
                <div className={`rounded-xl border p-3 flex flex-col gap-1 shadow-sm leading-relaxed ${getAgentColor(m.senderId)}`}>
                  <div className="flex items-center justify-between gap-4 border-b border-black/5 dark:border-white/5 pb-1">
                    <span className="font-bold text-[11px] tracking-tight">{m.senderName}</span>
                    <span className="text-[9px] font-mono opacity-60">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  {/* Body Text / Markdown preview style */}
                  <div className="text-[11.5px] mt-1 space-y-2 select-text text-gray-800 dark:text-zinc-250 font-sans whitespace-pre-wrap max-w-full overflow-x-auto">
                    {m.content}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
