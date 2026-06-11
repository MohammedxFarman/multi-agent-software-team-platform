/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Github, Key, Shield, Info, AlertCircle, CheckCircle, 
  Copy, Check, Loader2, Link2, Settings, Lock, Globe 
} from 'lucide-react';
import { Project } from '../types.js';

interface GithubAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onSettingsSaved: (updatedProject: Project) => void;
  hasOauthConfig: boolean;
  onGithubConnectPopup: () => Promise<void>;
}

export const GithubAuthModal: React.FC<GithubAuthModalProps> = ({
  isOpen,
  onClose,
  project,
  onSettingsSaved,
  hasOauthConfig,
  onGithubConnectPopup
}) => {
  // Tabs
  const [activeTab, setActiveTab] = useState<'oauth' | 'ssh'>('oauth');

  // OAuth States
  const [patInput, setPatInput] = useState('');
  const [patSaving, setPatSaving] = useState(false);
  const [patSuccess, setPatSuccess] = useState(false);

  // SSH States
  const [sshPrivateKey, setSshPrivateKey] = useState('');
  const [sshPublicKey, setSshPublicKey] = useState('');
  const [sshRepoUrl, setSshRepoUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sshCopied, setSshCopied] = useState(false);

  // Shared status metrics
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Populating initial values from project.githubSettings when modal opens or project changes
  useEffect(() => {
    if (isOpen && project) {
      const gs = project.githubSettings;
      if (gs) {
        setActiveTab(gs.authMethod || 'oauth');
        setSshPrivateKey(gs.sshPrivateKey || '');
        setSshPublicKey(gs.sshPublicKey || '');
        setSshRepoUrl(gs.sshRepoUrl || '');
      } else {
        // Fallback to localstorage values for smoother upgrade
        setSshPrivateKey(localStorage.getItem('github_ssh_private_key') || '');
        setSshPublicKey(localStorage.getItem('github_ssh_public_key') || '');
        setSshRepoUrl(localStorage.getItem('github_ssh_repo_url') || '');
      }
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, project]);

  // Validation routines
  const validateSSHKeys = (): boolean => {
    setErrorMsg(null);

    // Repo URL validation
    if (!sshRepoUrl.trim()) {
      setErrorMsg('Repository SSH URL is required.');
      return false;
    }
    if (sshRepoUrl.startsWith('https://')) {
      setErrorMsg('HTTPS URLs are not supported for Git-SSH synchronization. Please use the SSH format (e.g. git@github.com:owner/repo.git).');
      return false;
    }
    if (!sshRepoUrl.includes('git@') && !sshRepoUrl.includes('ssh://')) {
      setErrorMsg('Invalid SSH Remote protocol. URL should look like git@github.com:owner/repository.git');
      return false;
    }

    // Private key validation
    const priv = sshPrivateKey.trim();
    if (!priv) {
      setErrorMsg('SSH Private Key is required.');
      return false;
    }
    if (!priv.includes('-----BEGIN') || !priv.includes('-----END')) {
      setErrorMsg('Invalid SSH Private Key. The content must contain start/end demarcations (e.g., -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY-----).');
      return false;
    }

    // Public key validation
    const pub = sshPublicKey.trim();
    if (!pub) {
      setErrorMsg('SSH Public Key is required.');
      return false;
    }
    const acceptedPrefixes = ['ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp', 'ssh-ed25519', 'ssh-xmss'];
    const hasPrefix = acceptedPrefixes.some(pref => pub.startsWith(pref));
    if (!hasPrefix) {
      setErrorMsg('Invalid SSH Public Key. It must start with a valid cryptographic token prefix (e.g., ssh-rsa, ssh-ed25519).');
      return false;
    }

    const parts = pub.split(/\s+/);
    if (parts.length < 2) {
      setErrorMsg('Invalid SSH Public format. The credential must include both key type and base64 value separated by spaces.');
      return false;
    }

    return true;
  };

  // Generate cryptographic keys
  const handleGenerateKeys = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/github/generate-ssh-key', { method: 'POST' });
      if (!res.ok) {
        throw new Error('Keypair generation failed on server endpoint.');
      }
      const data = await res.json() as { privateKey: string; publicKey: string };
      setSshPrivateKey(data.privateKey);
      setSshPublicKey(data.publicKey);
      setSuccessMsg('Successfully created robust 2048-bit RSA Deploy Keys.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not generate authentication keypair.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save PAT
  const handleSavePat = async () => {
    if (!patInput.trim()) {
      setErrorMsg('Please paste your Personal Access Token before attempting to save.');
      return;
    }
    setPatSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/projects/${project.id}/github-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authMethod: 'oauth',
          githubToken: patInput.trim()
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update project GitHub settings on server.');
      }

      const updatedProj = await res.json() as Project;
      localStorage.setItem('github_sync_token', patInput.trim());
      onSettingsSaved(updatedProj);
      setPatInput('');
      setPatSuccess(true);
      setSuccessMsg('Personal Access Token saved securely to project settings.');
      setTimeout(() => setPatSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not save personal access token.');
    } finally {
      setPatSaving(false);
    }
  };

  // Save SSH Configuration
  const handleSaveSshConfig = async () => {
    if (!validateSSHKeys()) {
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/projects/${project.id}/github-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authMethod: 'ssh',
          sshPrivateKey: sshPrivateKey.trim(),
          sshPublicKey: sshPublicKey.trim(),
          sshRepoUrl: sshRepoUrl.trim()
        })
      });

      if (!res.ok) {
        throw new Error('Failed to save SSH Deploy Key options to server project database.');
      }

      const updatedProj = await res.json() as Project;
      // Also cache in localStorage for backward compatibility
      localStorage.setItem('github_sync_auth_method', 'ssh');
      localStorage.setItem('github_ssh_private_key', sshPrivateKey.trim());
      localStorage.setItem('github_ssh_public_key', sshPublicKey.trim());
      localStorage.setItem('github_ssh_repo_url', sshRepoUrl.trim());

      onSettingsSaved(updatedProj);
      setSuccessMsg('SSH Handshake configuration saved securely to project settings.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not save credentials.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          
          {/* Backdrop closer */}
          <div className="absolute inset-0 cursor-default" onClick={onClose} />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.35 }}
            className="relative bg-white dark:bg-[#1a1a1e] border border-gray-200 dark:border-zinc-800 rounded-xl max-w-2xl w-full shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-150 dark:border-zinc-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Github className="w-4.5 h-4.5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100">
                    GitHub Authentication Settings
                  </h3>
                  <p className="text-[10px] text-gray-500 dark:text-zinc-400">
                    Configure repo push authorization for <span className="font-bold font-mono">{project.name}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="text-gray-400 hover:text-gray-650 dark:hover:text-zinc-200 text-xs font-semibold px-2.5 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800/50 transition-all cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Segmented Toggles */}
            <div className="px-5 pt-3 shrink-0">
              <div className="bg-gray-100 dark:bg-[#121215] p-1 rounded-lg flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('oauth');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'oauth' 
                      ? 'bg-white dark:bg-zinc-805 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                      : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  OAuth / Token Integration
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('ssh');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'ssh' 
                      ? 'bg-white dark:bg-zinc-805 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                      : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  SSH Deploy Keys
                </button>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              
              {/* Warnings and errors container */}
              {errorMsg && (
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-400 p-2.5 rounded-lg text-[10px] font-medium flex items-start gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-750 dark:text-emerald-400 p-2.5 rounded-lg text-[10px] font-medium flex items-start gap-2 animate-fadeIn">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* ======================= */}
              {/* TAB 1: OAUTH FLOW & PAT */}
              {/* ======================= */}
              {activeTab === 'oauth' && (
                <div className="space-y-4 animate-fadeIn">
                  
                  {/* OAuth Flow Status */}
                  <div className="bg-gray-50 dark:bg-[#121215] border border-gray-150 dark:border-zinc-800/80 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-550 tracking-wider">GitHub OAuth Handshake</span>
                      <p className="text-[11px] font-medium text-gray-700 dark:text-zinc-300">
                        {hasOauthConfig 
                          ? 'OAuth Server Configuration parameters detected. You can authenticate with a secure single click pop-up.' 
                          : 'Standard OAuth server environment keys are unconfigured. Use a Personal Token instead.'
                        }
                      </p>
                    </div>
                    
                    {hasOauthConfig && (
                      <button
                        onClick={onGithubConnectPopup}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                      >
                        <Github className="w-4 h-4" />
                        Authorize via Pop-up
                      </button>
                    )}
                  </div>

                  {/* Personal Access Token Entry Header */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-extrabold text-gray-700 dark:text-zinc-300">
                        Or Provide GitHub Personal Access Token (PAT)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          value={patInput}
                          onChange={(e) => setPatInput(e.target.value)}
                          className="flex-1 text-xs bg-gray-50 dark:bg-[#121215] border border-gray-200 dark:border-zinc-750 px-3 py-2 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-gray-805 dark:text-zinc-100 font-mono"
                        />
                        <button
                          onClick={handleSavePat}
                          disabled={patSaving || !patInput.trim()}
                          className="px-4 py-2 bg-gray-800 hover:bg-gray-950 dark:bg-zinc-750 dark:hover:bg-zinc-650 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors border border-gray-700/50 cursor-pointer shrink-0"
                        >
                          {patSaving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : patSuccess ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            'Save Token'
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3 text-[10px] text-amber-700 dark:text-amber-400 flex items-start gap-2">
                      <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold">Token Permission Scopes Requirements:</p>
                        <p className="opacity-90 leading-normal">
                          For successful commits, ensure your PAT has active <code className="font-mono bg-amber-500/10 px-1 py-0.5 rounded font-bold">repo</code> read and write access scopes. Create personal tokens on GitHub under Developer Settings.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* ======================= */}
              {/* TAB 2: SSH KEY DEPLOY   */}
              {/* ======================= */}
              {activeTab === 'ssh' && (
                <div className="space-y-4 animate-fadeIn">
                  
                  {/* SSH Repo URL and generation controls */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-extrabold text-gray-700 dark:text-zinc-300">
                      GitHub Repository SSH URL
                    </label>
                    <input
                      type="text"
                      placeholder="git@github.com:username/repository-name.git"
                      value={sshRepoUrl}
                      onChange={(e) => setSshRepoUrl(e.target.value)}
                      className="w-full text-xs bg-gray-50 dark:bg-[#121215] border border-gray-200 dark:border-zinc-750 p-2.5 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-gray-805 dark:text-zinc-100 font-mono shadow-inner"
                    />
                    <p className="text-[9.5px] text-gray-400 dark:text-zinc-500 leading-normal">
                      The target git repository must be created in advance on GitHub. Must be in the form: <code className="font-semibold text-gray-650 dark:text-zinc-400">git@github.com:owner/repo.git</code>
                    </p>
                  </div>

                  {/* Two Column Cryptographic Layout */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Column 1: Private Key */}
                    <div className="flex flex-col min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-extrabold text-gray-700 dark:text-zinc-300">
                          SSH Private Key (RSA)
                        </label>
                        <button
                          type="button"
                          disabled={isGenerating}
                          onClick={handleGenerateKeys}
                          className="text-[9.5px] font-bold text-indigo-600 hover:text-indigo-750 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded cursor-pointer transition-colors"
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            'Generate New pair'
                          )}
                        </button>
                      </div>
                      <textarea
                        placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;..."
                        rows={6}
                        value={sshPrivateKey}
                        onChange={(e) => setSshPrivateKey(e.target.value)}
                        className="w-full text-[9.5px] leading-relaxed bg-gray-50 dark:bg-[#121215] border border-gray-200 dark:border-zinc-750 p-2.5 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-gray-800 dark:text-zinc-200 font-mono resize-none h-32 select-all shadow-inner"
                      />
                    </div>

                    {/* Column 2: Public Key */}
                    <div className="flex flex-col min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-extrabold text-gray-700 dark:text-zinc-300">
                          SSH Public Key (Deploy Key)
                        </label>
                        {sshPublicKey && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(sshPublicKey);
                              setSshCopied(true);
                              setTimeout(() => setSshCopied(false), 2000);
                            }}
                            className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline cursor-pointer bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded"
                          >
                            {sshCopied ? (
                              <>
                                <Check className="w-3 h-3" /> Copied!
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
                        placeholder="Generates automatically upon trigger of Generate New keypair..."
                        rows={6}
                        value={sshPublicKey}
                        className="w-full text-[9.5px] leading-relaxed bg-gray-100/60 dark:bg-[#0f0f12] border border-gray-200 dark:border-zinc-800 p-2.5 rounded-lg text-gray-500 dark:text-zinc-400 font-mono resize-none h-32 select-all"
                      />
                    </div>

                  </div>

                  {/* Simple deploy guide */}
                  <div className="bg-slate-50 dark:bg-zinc-900/65 border border-gray-150 dark:border-zinc-800/80 rounded-lg p-3 space-y-1.5">
                    <span className="block font-bold text-gray-800 dark:text-zinc-200 text-[10px]">How to configure Deploy Rights:</span>
                    <ol className="list-decimal list-inside text-[9.5px] space-y-1 text-gray-600 dark:text-zinc-400 leading-normal">
                      <li>Copy the generated <strong className="text-emerald-600 dark:text-emerald-400">Public Key</strong> above.</li>
                      <li>Go to your repository settings page on GitHub and select <strong>Deploy Keys</strong> on the sidebar.</li>
                      <li>Click <strong>Add Deploy Key</strong>, paste the content, and ensure you check <strong>"Allow write access"</strong> before saving.</li>
                    </ol>
                  </div>

                </div>
              )}

            </div>

            {/* Footer with actions */}
            <div className="p-4 bg-gray-50 dark:bg-zinc-900/40 border-t border-gray-150 dark:border-zinc-800 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-750 text-gray-700 dark:text-zinc-300 rounded-lg text-xs font-semibold hover:bg-gray-50 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
              >
                Cancel
              </button>

              {activeTab === 'ssh' && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveSshConfig}
                  className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 min-w-[120px]"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Globe className="w-3.5 h-3.5" />
                      Save Configuration
                    </>
                  )}
                </button>
              )}
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
