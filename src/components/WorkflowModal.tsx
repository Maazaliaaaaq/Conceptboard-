import React, { useState } from 'react';
import {
  X,
  Workflow,
  GitBranch,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Database,
  ArrowRight,
  Sparkles,
  Layers,
  FileCheck,
  Rocket,
  Bug,
  Users,
  Terminal,
  Copy,
  Check,
} from 'lucide-react';
import { BoardObject, Point } from '../types/board';

interface WorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertWorkflow: (objects: BoardObject[]) => void;
  canvasCenter?: Point;
}

interface WorkflowPreset {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  stepsCount: number;
  generate: (origin: Point) => BoardObject[];
}

export const WorkflowModal: React.FC<WorkflowModalProps> = ({
  isOpen,
  onClose,
  onInsertWorkflow,
  canvasCenter = { x: 300, y: 250 },
}) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'elements' | 'github'>('templates');
  const [copiedCi, setCopiedCi] = useState(false);

  if (!isOpen) return null;

  const presets: WorkflowPreset[] = [
    {
      id: 'feature_dev',
      title: 'Product Feature Lifecycle',
      description: 'Standard end-to-end agile workflow from customer discovery to production deploy.',
      category: 'Product & Agile',
      icon: Rocket,
      color: '#4f46e5',
      stepsCount: 6,
      generate: (origin: Point) => {
        const objects: BoardObject[] = [];
        const startX = origin.x;
        const startY = origin.y;
        const stepWidth = 190;
        const stepHeight = 110;
        const gapX = 70;

        const steps = [
          {
            title: '1. Discovery & Research',
            desc: 'Gather user problems, metrics, and business requirements.',
            color: '#059669',
            stickyColor: '#d1fae5',
          },
          {
            title: '2. Product Spec & UX',
            desc: 'Wireframes, acceptance criteria, and tech design doc.',
            color: '#2563eb',
            stickyColor: '#dbeafe',
          },
          {
            title: '3. Engineering Sprint',
            desc: 'Implement client & server logic with unit test coverage.',
            color: '#7c3aed',
            stickyColor: '#ede9fe',
          },
          {
            title: '4. Code & QA Review',
            desc: 'Peer code review, CI test suites, and staging validation.',
            color: '#d97706',
            stickyColor: '#fef3c7',
          },
          {
            title: '5. Production Release',
            desc: 'Canary rollout, telemetry monitoring, and user comms.',
            color: '#059669',
            stickyColor: '#dcfce7',
          },
        ];

        steps.forEach((s, idx) => {
          const posX = startX + idx * (stepWidth + gapX);
          const posY = startY;

          // Process Card (Sticky card style)
          const stepObj: BoardObject = {
            id: `wf_step_${Date.now()}_${idx}`,
            type: 'sticky',
            x: posX,
            y: posY,
            width: stepWidth,
            height: stepHeight,
            text: `📌 ${s.title}\n\n${s.desc}`,
            stickyColor: s.stickyColor,
            createdAt: Date.now() + idx * 2,
            zIndex: Date.now() + idx * 2,
          };
          objects.push(stepObj);

          // Arrow to next step
          if (idx < steps.length - 1) {
            const arrowObj: BoardObject = {
              id: `wf_arrow_${Date.now()}_${idx}`,
              type: 'arrow',
              x: posX + stepWidth + 6,
              y: posY + stepHeight / 2,
              width: gapX - 12,
              height: 0,
              color: '#64748b',
              strokeWidth: 3,
              createdAt: Date.now() + idx * 2 + 1,
              zIndex: Date.now() + idx * 2 + 1,
            };
            objects.push(arrowObj);
          }
        });

        return objects;
      },
    },
    {
      id: 'approval_flow',
      title: 'Review & Approval Workflow',
      description: 'Two-branch decision workflow for sign-offs, purchase orders, or legal approvals.',
      category: 'Management & Ops',
      icon: FileCheck,
      color: '#059669',
      stepsCount: 5,
      generate: (origin: Point) => {
        const objects: BoardObject[] = [];
        const startX = origin.x;
        const startY = origin.y;

        // Step 1: Submission
        objects.push({
          id: `wf_appr_1_${Date.now()}`,
          type: 'sticky',
          x: startX,
          y: startY + 60,
          width: 170,
          height: 100,
          text: '📝 Request Submitted\n\nInitiator fills out form and attaches documents.',
          stickyColor: '#e0e7ff',
          createdAt: Date.now(),
          zIndex: Date.now(),
        });

        // Arrow 1
        objects.push({
          id: `wf_arr_1_${Date.now()}`,
          type: 'arrow',
          x: startX + 175,
          y: startY + 110,
          width: 55,
          height: 0,
          color: '#64748b',
          strokeWidth: 3,
          createdAt: Date.now() + 1,
          zIndex: Date.now() + 1,
        });

        // Step 2: Decision Node
        objects.push({
          id: `wf_appr_2_${Date.now()}`,
          type: 'sticky',
          x: startX + 235,
          y: startY + 50,
          width: 180,
          height: 120,
          text: '⚖️ Manager Review\n\nDecision Gate:\nMeets criteria & budget?',
          stickyColor: '#fef08a',
          createdAt: Date.now() + 2,
          zIndex: Date.now() + 2,
        });

        // Arrow 2: Branch Up (Approved)
        objects.push({
          id: `wf_arr_up_${Date.now()}`,
          type: 'arrow',
          x: startX + 420,
          y: startY + 80,
          width: 70,
          height: -60,
          color: '#16a34a',
          strokeWidth: 3,
          createdAt: Date.now() + 3,
          zIndex: Date.now() + 3,
        });

        // Step 3a: Approved
        objects.push({
          id: `wf_appr_ok_${Date.now()}`,
          type: 'sticky',
          x: startX + 495,
          y: startY - 20,
          width: 170,
          height: 100,
          text: '✅ Approved!\n\nAuthorized to proceed & funds disbursed.',
          stickyColor: '#bbf7d0',
          createdAt: Date.now() + 4,
          zIndex: Date.now() + 4,
        });

        // Arrow 3: Branch Down (Revisions)
        objects.push({
          id: `wf_arr_down_${Date.now()}`,
          type: 'arrow',
          x: startX + 420,
          y: startY + 140,
          width: 70,
          height: 60,
          color: '#dc2626',
          strokeWidth: 3,
          createdAt: Date.now() + 5,
          zIndex: Date.now() + 5,
        });

        // Step 3b: Needs Revisions
        objects.push({
          id: `wf_appr_rej_${Date.now()}`,
          type: 'sticky',
          x: startX + 495,
          y: startY + 160,
          width: 170,
          height: 100,
          text: '🔄 Revisions Required\n\nReturned to initiator with feedback comments.',
          stickyColor: '#fecdd3',
          createdAt: Date.now() + 6,
          zIndex: Date.now() + 6,
        });

        return objects;
      },
    },
    {
      id: 'bug_triage',
      title: 'Bug & Incident Triage',
      description: 'Reliable incident response pipeline from bug report to hotfix verification.',
      category: 'Engineering & DevOps',
      icon: Bug,
      color: '#dc2626',
      stepsCount: 5,
      generate: (origin: Point) => {
        const objects: BoardObject[] = [];
        const startX = origin.x;
        const startY = origin.y;
        const stepWidth = 180;
        const gapX = 65;

        const steps = [
          {
            title: '1. Bug / Alert Reported',
            desc: 'Stack trace, user logs, or monitoring alert triggered.',
            color: '#fee2e2',
          },
          {
            title: '2. Triage & Priority',
            desc: 'Reproduce on staging. Classify as P0 blocker or P2 minor.',
            color: '#fed7aa',
          },
          {
            title: '3. Hotfix Branch',
            desc: 'Root cause isolation and patch code authored.',
            color: '#fef08a',
          },
          {
            title: '4. Automated Tests',
            desc: 'Regression test suite run via GitHub CI workflow.',
            color: '#e0e7ff',
          },
          {
            title: '5. Deployed & Resolved',
            desc: 'Patch deployed live; customer notified & ticket closed.',
            color: '#dcfce7',
          },
        ];

        steps.forEach((s, idx) => {
          const posX = startX + idx * (stepWidth + gapX);
          objects.push({
            id: `wf_bug_${Date.now()}_${idx}`,
            type: 'sticky',
            x: posX,
            y: startY,
            width: stepWidth,
            height: 110,
            text: `🐞 ${s.title}\n\n${s.desc}`,
            stickyColor: s.color,
            createdAt: Date.now() + idx * 2,
            zIndex: Date.now() + idx * 2,
          });

          if (idx < steps.length - 1) {
            objects.push({
              id: `wf_arr_bug_${Date.now()}_${idx}`,
              type: 'arrow',
              x: posX + stepWidth + 5,
              y: startY + 55,
              width: gapX - 10,
              height: 0,
              color: '#64748b',
              strokeWidth: 3,
              createdAt: Date.now() + idx * 2 + 1,
              zIndex: Date.now() + idx * 2 + 1,
            });
          }
        });

        return objects;
      },
    },
    {
      id: 'cicd_pipeline',
      title: 'DevOps & CI/CD Pipeline',
      description: 'Continuous integration and continuous deployment workflow on GitHub Actions.',
      category: 'Engineering & DevOps',
      icon: Terminal,
      color: '#0284c7',
      stepsCount: 5,
      generate: (origin: Point) => {
        const objects: BoardObject[] = [];
        const startX = origin.x;
        const startY = origin.y;
        const stepWidth = 185;
        const gapX = 65;

        const steps = [
          {
            title: '1. Git Commit & Push',
            desc: 'Engineer pushes code or opens PR to main branch.',
            color: '#e2e8f0',
          },
          {
            title: '2. GitHub Actions CI',
            desc: 'Trigger .github/workflows/ci.yml with Node 20 runner.',
            color: '#bae6fd',
          },
          {
            title: '3. ESLint & TypeScript',
            desc: 'Static analysis check ensures code quality & zero regressions.',
            color: '#e0e7ff',
          },
          {
            title: '4. Production Build',
            desc: 'Vite compiles assets into minified production bundles.',
            color: '#fef08a',
          },
          {
            title: '5. Deploy Webhook',
            desc: 'Automated deployment to GitHub Pages / Cloud Run live.',
            color: '#bbf7d0',
          },
        ];

        steps.forEach((s, idx) => {
          const posX = startX + idx * (stepWidth + gapX);
          objects.push({
            id: `wf_cicd_${Date.now()}_${idx}`,
            type: 'sticky',
            x: posX,
            y: startY,
            width: stepWidth,
            height: 110,
            text: `⚡ ${s.title}\n\n${s.desc}`,
            stickyColor: s.color,
            createdAt: Date.now() + idx * 2,
            zIndex: Date.now() + idx * 2,
          });

          if (idx < steps.length - 1) {
            objects.push({
              id: `wf_arr_cicd_${Date.now()}_${idx}`,
              type: 'arrow',
              x: posX + stepWidth + 5,
              y: startY + 55,
              width: gapX - 10,
              height: 0,
              color: '#0284c7',
              strokeWidth: 3,
              createdAt: Date.now() + idx * 2 + 1,
              zIndex: Date.now() + idx * 2 + 1,
            });
          }
        });

        return objects;
      },
    },
    {
      id: 'user_onboarding',
      title: 'Customer Onboarding Journey',
      description: 'Engaging onboarding funnel mapping user conversion and aha-moment.',
      category: 'Growth & Marketing',
      icon: Users,
      color: '#db2777',
      stepsCount: 5,
      generate: (origin: Point) => {
        const objects: BoardObject[] = [];
        const startX = origin.x;
        const startY = origin.y;
        const stepWidth = 180;
        const gapX = 65;

        const steps = [
          {
            title: '1. User Sign Up',
            desc: 'Account created with email or Google Single Sign-On.',
            color: '#fbcfe8',
          },
          {
            title: '2. Welcome Flow',
            desc: 'Personalized question to determine role & team size.',
            color: '#ede9fe',
          },
          {
            title: '3. Interactive Tutorial',
            desc: 'First interactive canvas board loaded with sample sticky.',
            color: '#fed7aa',
          },
          {
            title: '4. Team Invite',
            desc: 'Shareable 6-digit room code sent to collaborators.',
            color: '#bae6fd',
          },
          {
            title: '5. Active Power User',
            desc: 'Real-time multi-user editing session underway!',
            color: '#bbf7d0',
          },
        ];

        steps.forEach((s, idx) => {
          const posX = startX + idx * (stepWidth + gapX);
          objects.push({
            id: `wf_usr_${Date.now()}_${idx}`,
            type: 'sticky',
            x: posX,
            y: startY,
            width: stepWidth,
            height: 110,
            text: `🎯 ${s.title}\n\n${s.desc}`,
            stickyColor: s.color,
            createdAt: Date.now() + idx * 2,
            zIndex: Date.now() + idx * 2,
          });

          if (idx < steps.length - 1) {
            objects.push({
              id: `wf_arr_usr_${Date.now()}_${idx}`,
              type: 'arrow',
              x: posX + stepWidth + 5,
              y: startY + 55,
              width: gapX - 10,
              height: 0,
              color: '#db2777',
              strokeWidth: 3,
              createdAt: Date.now() + idx * 2 + 1,
              zIndex: Date.now() + idx * 2 + 1,
            });
          }
        });

        return objects;
      },
    },
  ];

  const handleSelectPreset = (preset: WorkflowPreset) => {
    const generated = preset.generate(canvasCenter);
    onInsertWorkflow(generated);
    onClose();
  };

  const handleInsertSingleNode = (
    type: 'start' | 'process' | 'decision' | 'database' | 'end'
  ) => {
    const objects: BoardObject[] = [];
    const id = `node_${Date.now()}`;

    switch (type) {
      case 'start':
        objects.push({
          id,
          type: 'sticky',
          x: canvasCenter.x,
          y: canvasCenter.y,
          width: 170,
          height: 90,
          text: '🚀 Start Trigger\n\nInitial workflow event occurs.',
          stickyColor: '#dcfce7',
          createdAt: Date.now(),
          zIndex: Date.now(),
        });
        break;
      case 'process':
        objects.push({
          id,
          type: 'sticky',
          x: canvasCenter.x,
          y: canvasCenter.y,
          width: 180,
          height: 100,
          text: '⚙️ Action / Process\n\nExecute computation or task.',
          stickyColor: '#dbeafe',
          createdAt: Date.now(),
          zIndex: Date.now(),
        });
        break;
      case 'decision':
        objects.push({
          id,
          type: 'sticky',
          x: canvasCenter.x,
          y: canvasCenter.y,
          width: 180,
          height: 110,
          text: '❓ Decision Gate\n\nIf Yes -> Proceed\nIf No -> Fallback',
          stickyColor: '#fef08a',
          createdAt: Date.now(),
          zIndex: Date.now(),
        });
        break;
      case 'database':
        objects.push({
          id,
          type: 'sticky',
          x: canvasCenter.x,
          y: canvasCenter.y,
          width: 170,
          height: 90,
          text: '💾 Data Store / DB\n\nRead or persist records.',
          stickyColor: '#ede9fe',
          createdAt: Date.now(),
          zIndex: Date.now(),
        });
        break;
      case 'end':
        objects.push({
          id,
          type: 'sticky',
          x: canvasCenter.x,
          y: canvasCenter.y,
          width: 170,
          height: 90,
          text: '🏁 End / Outcome\n\nProcess successfully concluded.',
          stickyColor: '#fed7aa',
          createdAt: Date.now(),
          zIndex: Date.now(),
        });
        break;
    }

    onInsertWorkflow(objects);
    onClose();
  };

  const ciWorkflowSnippet = `name: CI Workflow
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run build`;

  const copyCiCode = () => {
    navigator.clipboard.writeText(ciWorkflowSnippet).then(() => {
      setCopiedCi(true);
      setTimeout(() => setCopiedCi(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-xs">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                Workflow Center
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                  Ready
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Insert flowchart diagrams, agile workflows, and view GitHub CI/CD automation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 border-b border-slate-100 flex items-center gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('templates')}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'templates'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Workflow Templates</span>
          </button>

          <button
            onClick={() => setActiveTab('elements')}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'elements'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Individual Elements</span>
          </button>

          <button
            onClick={() => setActiveTab('github')}
            className={`pb-2.5 flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'github'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>GitHub Actions CI/CD</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'templates' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Choose a workflow preset below. It will be generated right onto your canvas with connected steps and arrows:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {presets.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className="p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:shadow-md text-left transition-all bg-white hover:bg-indigo-50/20 group cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
                            style={{ backgroundColor: preset.color }}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            {preset.stepsCount} Steps
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {preset.title}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          {preset.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-indigo-600">
                        <span>Insert on Whiteboard</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'elements' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Click any workflow node to insert it directly onto your board:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <button
                  onClick={() => handleInsertSingleNode('start')}
                  className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl hover:shadow-sm text-left transition-all cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-2">
                    <PlayCircle className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-emerald-950">Start / Trigger</h4>
                  <p className="text-[11px] text-emerald-700 mt-0.5">Entry point of the workflow</p>
                </button>

                <button
                  onClick={() => handleInsertSingleNode('process')}
                  className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl hover:shadow-sm text-left transition-all cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-2">
                    <Workflow className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-blue-950">Action / Process</h4>
                  <p className="text-[11px] text-blue-700 mt-0.5">Execution task or milestone</p>
                </button>

                <button
                  onClick={() => handleInsertSingleNode('decision')}
                  className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl hover:shadow-sm text-left transition-all cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center mb-2">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-amber-950">Decision Gate</h4>
                  <p className="text-[11px] text-amber-700 mt-0.5">Conditional branching point</p>
                </button>

                <button
                  onClick={() => handleInsertSingleNode('database')}
                  className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl hover:shadow-sm text-left transition-all cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center mb-2">
                    <Database className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-purple-950">Data Store</h4>
                  <p className="text-[11px] text-purple-700 mt-0.5">Database or persistence storage</p>
                </button>

                <button
                  onClick={() => handleInsertSingleNode('end')}
                  className="p-3.5 bg-orange-50 border border-orange-200 rounded-xl hover:shadow-sm text-left transition-all cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-orange-950">End / Completion</h4>
                  <p className="text-[11px] text-orange-700 mt-0.5">Final result or target state</p>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'github' && (
            <div className="space-y-4 text-xs text-slate-700">
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h4 className="font-bold text-indigo-950 text-xs">GitHub Actions Workflow Active</h4>
                </div>
                <p className="text-indigo-800 text-[11px] leading-relaxed">
                  Your project repository has been equipped with a GitHub Actions Continuous Integration (CI) and Deployment workflow at <code className="font-mono bg-white/70 px-1 py-0.5 rounded border border-indigo-200">.github/workflows/ci.yml</code> and <code className="font-mono bg-white/70 px-1 py-0.5 rounded border border-indigo-200">.github/workflows/deploy.yml</code>.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-slate-500" />
                    <span>.github/workflows/ci.yml</span>
                  </label>
                  <button
                    onClick={copyCiCode}
                    className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCi ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCi ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed">
                  {ciWorkflowSnippet}
                </pre>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <h5 className="font-semibold text-slate-800 text-[11px] mb-1">How it triggers:</h5>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-[11px]">
                  <li>Automatically runs on every <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">git push</code> to <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">main</code></li>
                  <li>Validates dependencies, ESLint syntax rules, and compiles Vite bundles</li>
                  <li>Prevents broken builds or white screens from reaching production</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Interactive canvas workflows & GitHub CI/CD automation
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
