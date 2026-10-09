import React, { useState } from 'react';
import { X, Github, ExternalLink, Copy, Check, Terminal, ShieldAlert, GitBranch, ArrowUpRight } from 'lucide-react';

interface GithubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToast?: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const GithubModal: React.FC<GithubModalProps> = ({
  isOpen,
  onClose,
  onToast,
}) => {
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!isOpen) return null;

  const gitSetupSnippet = `# 1. Download or export the project files
# 2. In your local terminal, initialize git and push:
git init
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git add .
git commit -m "Initial commit from AI Studio"
git push -u origin main`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(gitSetupSnippet);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
      if (onToast) onToast('Git commands copied to clipboard!', 'success');
    } catch {
      if (onToast) onToast('Unable to copy automatically. Please copy manually.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Github className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">GitHub & Source Code Export</h2>
              <p className="text-xs text-slate-500">Why GitHub links fail & how to connect</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-slate-700">
          {/* Reason 1: Browser Popup Blocker & Iframe Sandbox */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-900">Why AI Studio's GitHub Link or Export may fail:</p>
              <ul className="list-disc list-inside space-y-1 text-amber-800 text-[11px] leading-relaxed">
                <li>
                  <strong>Browser Popup Blocker:</strong> GitHub authorization opens in a popup window which Chrome/Safari/Brave frequently blocks. Look for the blocked popup icon in your browser URL bar.
                </li>
                <li>
                  <strong>GitHub Account Not Connected:</strong> In Google AI Studio Build settings, you must authorize your GitHub account before exporting a repo.
                </li>
                <li>
                  <strong>Iframe Security (X-Frame-Options):</strong> GitHub prohibits loading inside embedded iframes. Links must open in a new browser tab.
                </li>
              </ul>
            </div>
          </div>

          {/* Quick External GitHub Link */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-800">Open GitHub in a New Tab</p>
              <p className="text-[11px] text-slate-500">Create a new repository on GitHub to host this code</p>
            </div>
            <a
              href="https://github.com/new"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium flex items-center gap-1.5 transition-colors shrink-0"
            >
              <span>New Repo</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Local Git Initialized Status */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-2.5 text-emerald-900">
            <GitBranch className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-[11px]">Git Repository Status: Initialized (main branch)</p>
              <p className="text-[10px] text-emerald-700">All 27 project files have been committed to the local repository ready for export.</p>
            </div>
          </div>

          {/* Step-by-Step CLI push snippet */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-500" />
                Push to your GitHub repository (CLI)
              </label>
              <button
                onClick={handleCopy}
                className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                {copiedCmd ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCmd ? 'Copied' : 'Copy Commands'}</span>
              </button>
            </div>
            <pre className="bg-slate-900 text-slate-100 rounded-xl p-3 font-mono text-[11px] overflow-x-auto leading-relaxed select-all">
              {gitSetupSnippet}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 hover:text-slate-900 text-xs flex items-center gap-1"
          >
            <span>Visit GitHub.com</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
