/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GeneratedFile } from '../types.js';
import { FileText, Folder, Eye, Terminal, Code, Cpu, Layout, CheckCircle, Copy, Search, Filter, X } from 'lucide-react';

interface CodeViewerProps {
  files: GeneratedFile[];
}

export default function CodeViewer({ files }: CodeViewerProps) {
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedPhase, setSelectedPhase] = useState<string>('all');

  // Filter files based on search term and selectors
  const filteredFiles = files.filter(file => {
    const matchesSearch = 
      file.path.toLowerCase().includes(searchTerm.toLowerCase()) || 
      file.language.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === 'all' || file.fileType === selectedType;
    const matchesPhase = selectedPhase === 'all' || file.createdPhase === selectedPhase;
    
    return matchesSearch && matchesType && matchesPhase;
  });

  // Handle files list changes or selections changing
  useEffect(() => {
    if (filteredFiles.length > 0) {
      const isStillAvailable = filteredFiles.some(f => f.id === selectedFile?.id);
      if (!isStillAvailable) {
        setSelectedFile(filteredFiles[0]);
      }
    } else {
      setSelectedFile(null);
    }
  }, [searchTerm, selectedType, selectedPhase, files]);

  const copyToClipboard = () => {
    if (!selectedFile) return;
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Organize files into folders logically
  const folders: Record<string, GeneratedFile[]> = {};
  filteredFiles.forEach(f => {
    const parts = f.path.split('/');
    const folderName = parts.length > 1 ? parts[0] : 'root';
    if (!folders[folderName]) {
      folders[folderName] = [];
    }
    folders[folderName].push(f);
  });

  const getLanguageColor = (lang: string) => {
    switch (lang) {
      case 'python': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'typescript':
      case 'tsx': return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300';
      case 'yaml': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
      case 'markdown': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      default: return 'bg-gray-150 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300';
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'doc': return <FileText className="w-4 h-4 text-emerald-500" />;
      case 'code': return <Code className="w-4 h-4 text-blue-500" />;
      case 'test': return <Cpu className="w-4 h-4 text-amber-500" />;
      case 'config': return <Layout className="w-4 h-4 text-purple-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="bg-white dark:bg-[#1a1a1e] border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col h-full shadow-sm" id="code-viewer-panel">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-indigo-500" />
          <h2 className="font-semibold text-gray-900 dark:text-zinc-100 font-sans tracking-tight">Codebase Explorer</h2>
        </div>
        {selectedFile && (
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${getLanguageColor(selectedFile.language)}`}>
              {selectedFile.language}
            </span>
            <button
              onClick={copyToClipboard}
              className="p-1 px-2.5 rounded bg-gray-50 dark:bg-zinc-850 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-800 font-semibold text-[10px] text-gray-600 dark:text-zinc-300 flex items-center gap-1 transition-colors cursor-pointer"
              title="Copy to clipboard"
            >
              {copied ? <CheckCircle className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-0 overflow-hidden">
        {/* File Tree Selector (Span 4) */}
        <div className="md:col-span-4 border-r border-gray-100 dark:border-zinc-850 pr-2 flex flex-col min-h-0 overflow-hidden">
          {/* Search & Status Filters */}
          <div className="space-y-2 mb-3 shrink-0">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-405 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-gray-50/70 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs text-gray-900 dark:text-zinc-150 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-gray-400 dark:placeholder-zinc-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2 h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 flex items-center justify-center cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Selector Grid */}
            <div className="grid grid-cols-2 gap-1.5">
              {/* Type Category Filter */}
              <div className="flex flex-col">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-2 py-1.5 bg-gray-50/70 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-md text-[10.5px] text-gray-600 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="code">Code</option>
                  <option value="config">Config</option>
                  <option value="doc">Doc</option>
                  <option value="test">Test</option>
                </select>
              </div>

              {/* Development Status / Phase Filter */}
              <div className="flex flex-col">
                <select
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value)}
                  className="w-full px-2 py-1.5 bg-gray-50/70 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-md text-[10.5px] text-gray-600 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">All Phases</option>
                  <option value="pm">PM</option>
                  <option value="architect">Architect</option>
                  <option value="backend">Backend</option>
                  <option value="frontend">Frontend</option>
                  <option value="qa">QA</option>
                  <option value="devops">DevOps</option>
                </select>
              </div>
            </div>
          </div>

          {/* Scrollable File List */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs font-sans">
            {files.length === 0 ? (
              <div className="py-12 text-center text-gray-400 dark:text-zinc-500">
                <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
                Workspace is empty.
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="py-10 text-center text-gray-400 dark:text-zinc-500">
                <Filter className="w-5 h-5 mx-auto mb-1.5 text-gray-300 dark:text-zinc-700 opacity-60" />
                <span className="block text-[11px]">No matching files found</span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedType('all');
                    setSelectedPhase('all');
                  }}
                  className="mt-2 mx-auto px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold hover:underline rounded text-[10px] transition-all cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              Object.keys(folders).map(folderName => (
                <div key={folderName} className="space-y-1">
                  <div className="flex items-center gap-1.5 text-gray-450 dark:text-zinc-550 font-semibold px-1 text-[10px] uppercase tracking-wider">
                    <Folder className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{folderName}</span>
                  </div>
                  <div className="space-y-0.5 pl-2.5 border-l border-gray-150 dark:border-zinc-800 ml-2">
                    {folders[folderName].map(file => {
                      const isSelected = selectedFile?.id === file.id;
                      const name = file.path.split('/').pop() || file.path;
                      return (
                        <button
                          key={file.id}
                          onClick={() => setSelectedFile(file)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors cursor-pointer group ${
                            isSelected
                              ? 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-bold border-l-2 border-indigo-500 pl-1.5'
                              : 'text-gray-600 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800/40 hover:text-gray-900 dark:hover:text-zinc-150'
                          }`}
                        >
                          {getFileIcon(file.fileType)}
                          <span className="truncate flex-1 font-mono text-[11px]">{name}</span>
                          <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 text-gray-400 transition-opacity shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Code Content Screen (Span 8) */}
        <div className="md:col-span-8 flex flex-col min-h-0 bg-gray-50 dark:bg-[#151518] border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden relative">
          {selectedFile ? (
            <div className="flex flex-col h-full overflow-hidden select-text">
              {/* Path Bar */}
              <div className="px-3.5 py-2.5 bg-gray-100 dark:bg-[#1a1a1f] border-b border-gray-200 dark:border-zinc-800 text-[11px] font-mono text-gray-600 dark:text-indigo-300/85 flex items-center justify-between">
                <span>filepath: {selectedFile.path}</span>
                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-sans">
                  {selectedFile.fileType}
                </span>
              </div>
              
              {/* Actual Code */}
              <div className="flex-1 overflow-auto p-4 font-mono text-[11.5px] leading-relaxed text-gray-800 dark:text-zinc-200">
                <pre className="whitespace-pre select-text font-mono">
                  {selectedFile.content}
                </pre>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 dark:text-zinc-500 p-8">
              <Folder className="w-12 h-12 mb-3 text-zinc-300 dark:text-zinc-700 opacity-60" />
              <p className="font-sans text-xs">No generated files loaded.<br />Select or compile an active simulation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
