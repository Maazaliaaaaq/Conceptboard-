import React, { useState } from 'react';
import { X, Flame, Check, Copy, ExternalLink, HelpCircle, Save } from 'lucide-react';
import {
  getStoredFirebaseCredentials,
  saveFirebaseCredentials,
  isFirebaseConnected,
  initFirebase,
} from '../services/firebaseService';
import { FirebaseCredentials } from '../types/board';

interface FirebaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const FirebaseSetupModal: React.FC<FirebaseSetupModalProps> = ({
  isOpen,
  onClose,
  onToast,
}) => {
  const existing = getStoredFirebaseCredentials();
  const [apiKey, setApiKey] = useState(existing?.apiKey || '');
  const [databaseURL, setDatabaseURL] = useState(existing?.databaseURL || '');
  const [projectId, setProjectId] = useState(existing?.projectId || '');
  const [authDomain, setAuthDomain] = useState(existing?.authDomain || '');
  const [rawSnippet, setRawSnippet] = useState('');
  const [activeTab, setActiveTab] = useState<'form' | 'guide'>('form');
  const [rulesCopied, setRulesCopied] = useState(false);

  if (!isOpen) return null;

  const connected = isFirebaseConnected();

  const handlePasteSnippet = (snippet: string) => {
    setRawSnippet(snippet);
    try {
      // Extract from const firebaseConfig = { ... }
      const matchApiKey = snippet.match(/apiKey:\s*["']([^"']+)["']/);
      const matchDbUrl = snippet.match(/databaseURL:\s*["']([^"']+)["']/);
      const matchProjectId = snippet.match(/projectId:\s*["']([^"']+)["']/);
      const matchAuthDomain = snippet.match(/authDomain:\s*["']([^"']+)["']/);

      if (matchApiKey) setApiKey(matchApiKey[1]);
      if (matchDbUrl) setDatabaseURL(matchDbUrl[1]);
      if (matchProjectId) setProjectId(matchProjectId[1]);
      if (matchAuthDomain) setAuthDomain(matchAuthDomain[1]);

      if (matchDbUrl || matchApiKey) {
        onToast('Firebase config extracted from snippet!', 'success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = () => {
    if (!apiKey.trim() || !databaseURL.trim()) {
      onToast('API Key and Database URL are required', 'error');
      return;
    }

    const creds: FirebaseCredentials = {
      apiKey: apiKey.trim(),
      databaseURL: databaseURL.trim(),
      projectId: projectId.trim() || 'whiteboard-project',
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
    };

    saveFirebaseCredentials(creds);
    const success = initFirebase(creds);

    if (success) {
      onToast('Connected to Firebase Realtime Database!', 'success');
      onClose();
    } else {
      onToast('Saved! Connecting to Firebase...', 'info');
      onClose();
    }
  };

  const handleClear = () => {
    saveFirebaseCredentials(null);
    setApiKey('');
    setDatabaseURL('');
    setProjectId('');
    setAuthDomain('');
    onToast('Firebase credentials cleared. Reverted to local multi-tab mode.', 'info');
  };

  const sampleRules = `{
  "rules": {
    "boards": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    }
  }
}`;

  const copyRules = async () => {
    try {
      await navigator.clipboard.writeText(sampleRules);
      setRulesCopied(true);
      setTimeout(() => setRulesCopied(false), 2000);
      onToast('Firebase security rules copied to clipboard!', 'success');
    } catch {
      onToast('Copy failed, please copy manually', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Flame className="w-4 h-4 fill-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Firebase Realtime Database Setup</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-slate-500">100% Free Spark Plan · Low latency worldwide</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${connected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                  {connected ? '● Live Connected' : '○ Standby / Local'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-100 px-6 pt-2 bg-slate-50/50 shrink-0">
          <button
            onClick={() => setActiveTab('form')}
            className={`pb-2.5 text-xs font-semibold px-3 border-b-2 transition-colors ${
              activeTab === 'form'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Database Credentials
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2.5 text-xs font-semibold px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Step-by-Step Setup Guide
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {activeTab === 'form' ? (
            <div className="space-y-4">
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 text-indigo-900 leading-relaxed text-[11px]">
                Paste your Firebase project credentials here. They are stored locally in your browser so teacher and students can sync in real-time across Pakistan/Saudi Arabia and UK/Australia with zero server costs.
              </div>

              {/* Paste full config snippet */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Quick Paste: Paste your entire <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono text-[11px]">firebaseConfig = {'{...}'}</code> snippet:
                </label>
                <textarea
                  rows={2}
                  value={rawSnippet}
                  onChange={(e) => handlePasteSnippet(e.target.value)}
                  placeholder={`const firebaseConfig = {\n  apiKey: "AIza...",\n  databaseURL: "https://my-app-default-rtdb.firebaseio.com",\n  projectId: "my-app"\n};`}
                  className="w-full text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    API Key <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Database URL <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={databaseURL}
                    onChange={(e) => setDatabaseURL(e.target.value)}
                    placeholder="https://your-project-rtdb.firebaseio.com"
                    className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Project ID
                  </label>
                  <input
                    type="text"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="my-whiteboard-app"
                    className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Auth Domain (Optional)
                  </label>
                  <input
                    type="text"
                    value={authDomain}
                    onChange={(e) => setAuthDomain(e.target.value)}
                    placeholder="my-whiteboard-app.firebaseapp.com"
                    className="w-full text-xs font-mono bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <div>
                    <h4 className="font-semibold text-slate-900">Create a Free Firebase Project</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Open{' '}
                      <a
                        href="https://console.firebase.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        console.firebase.google.com <ExternalLink className="w-3 h-3" />
                      </a>{' '}
                      and click <strong>"Add project"</strong>. Name it (e.g., <em>ClassroomWhiteboard</em>) and proceed on the free Spark plan.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <div>
                    <h4 className="font-semibold text-slate-900">Enable Realtime Database</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      In the Firebase console left menu under <strong>Build</strong>, click <strong>Realtime Database</strong> &gt; <strong>Create Database</strong>. Choose your nearest region (e.g. Europe or US).
                    </p>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </span>
                  <div>
                    <h4 className="font-semibold text-slate-900">Set Database Security Rules</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      In the Realtime Database section, click the <strong>Rules</strong> tab and replace with the following room-isolated rules:
                    </p>
                    <div className="relative mt-2">
                      <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] overflow-x-auto">
                        {sampleRules}
                      </pre>
                      <button
                        onClick={copyRules}
                        className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-medium flex items-center gap-1"
                      >
                        {rulesCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {rulesCopied ? 'Copied' : 'Copy Rules'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    4
                  </span>
                  <div>
                    <h4 className="font-semibold text-slate-900">Get Your Web Config Keys</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Click the Gear icon ⚙️ &gt; <strong>Project settings</strong> &gt; General &gt; Under <strong>"Your apps"</strong>, click the Web icon <code>&lt;/&gt;</code>, register your app, and copy the <code>firebaseConfig</code> object into the "Database Credentials" tab!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div>
            {existing && (
              <button
                onClick={handleClear}
                className="text-xs text-rose-600 hover:text-rose-700 font-medium"
              >
                Clear Credentials
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Save & Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
