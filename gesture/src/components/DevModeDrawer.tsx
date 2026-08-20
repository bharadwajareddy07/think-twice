import React, { useState, useEffect } from 'react';
import { X, Terminal, Code, Activity, RefreshCw } from 'lucide-react';
import { AssistantQueryResult } from '../types/slack';

interface DevModeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  queryResult: AssistantQueryResult | null;
}

export const DevModeDrawer: React.FC<DevModeDrawerProps> = ({ isOpen, onClose, queryResult }) => {
  const [trafficLogs, setTrafficLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'executed' | 'traffic' | 'raw_messages'>('executed');

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/mcp/logs');
      const data = await res.json();
      setTrafficLogs(data.logs || []);
    } catch (e) {
      // ignore
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-xl z-40 glass-panel-glow border-l border-cyan-500/40 shadow-2xl flex flex-col p-6 select-none bg-[#0a0d14]/95 backdrop-blur-xl">
      {/* Drawer Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2 text-cyan-400 font-orbitron font-bold text-base">
          <Terminal className="w-5 h-5" />
          <span>DEVELOPER DEBUG MODE</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchLogs}
            className="p-1.5 rounded-lg glass-panel border border-slate-700 hover:border-cyan-400 text-slate-300 transition-all cursor-pointer"
            title="Refresh Logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg glass-panel border border-slate-700 hover:border-cyan-400 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 my-4 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('executed')}
          className={`px-3 py-1.5 rounded-xl font-orbitron text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'executed'
              ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          EXECUTED TOOLS ({queryResult?.executedTools.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('traffic')}
          className={`px-3 py-1.5 rounded-xl font-orbitron text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'traffic'
              ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          JSON-RPC TRAFFIC ({trafficLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('raw_messages')}
          className={`px-3 py-1.5 rounded-xl font-orbitron text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'raw_messages'
              ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          MESSAGES ({queryResult?.rawMessages.length || 0})
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 font-mono text-xs">
        {activeTab === 'executed' && (
          <div className="space-y-4">
            {!queryResult || queryResult.executedTools.length === 0 ? (
              <div className="text-slate-500 italic p-4 text-center">No tool calls executed yet. Run a prompt to inspect.</div>
            ) : (
              queryResult.executedTools.map((t, idx) => (
                <div key={idx} className="glass-panel p-4 rounded-2xl border border-cyan-500/30 space-y-2">
                  <div className="flex items-center justify-between text-cyan-400 font-bold">
                    <span>{t.name}</span>
                    <span className="text-slate-500 text-[10px]">CALL #{idx + 1}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">ARGUMENTS:</span>
                    <pre className="p-2 bg-slate-950 rounded-lg border border-slate-800 text-slate-300 overflow-x-auto mt-1">
                      {JSON.stringify(t.args, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">RAW RESPONSE:</span>
                    <pre className="p-2 bg-slate-950 rounded-lg border border-slate-800 text-cyan-300 overflow-x-auto mt-1 max-h-40">
                      {JSON.stringify(t.response, null, 2)}
                    </pre>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'traffic' && (
          <div className="space-y-2">
            {trafficLogs.length === 0 ? (
              <div className="text-slate-500 italic p-4 text-center">No traffic logged yet.</div>
            ) : (
              trafficLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border ${
                    log.direction === 'SEND'
                      ? 'bg-blue-950/30 border-blue-500/40 text-blue-300'
                      : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                  }`}
                >
                  <div className="flex justify-between items-center font-bold text-[10px] mb-1">
                    <span>{log.direction === 'SEND' ? '➜ CLIENT -> MCP SERVER' : '✔ MCP SERVER -> CLIENT'}</span>
                    <span className="text-slate-400">{log.timestamp}</span>
                  </div>
                  <pre className="overflow-x-auto text-[11px] font-mono leading-relaxed">
                    {JSON.stringify(log.payload, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'raw_messages' && (
          <div className="space-y-2">
            {!queryResult || queryResult.rawMessages.length === 0 ? (
              <div className="text-slate-500 italic p-4 text-center">No normalized Slack messages retrieved yet.</div>
            ) : (
              queryResult.rawMessages.map((m) => (
                <div key={m.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex justify-between text-slate-400 text-[10px]">
                    <span className="font-bold text-cyan-300">{m.userName}</span>
                    <span>{m.formattedDate}</span>
                  </div>
                  <div className="text-slate-200">{m.text}</div>
                  <div className="text-[10px] text-slate-500">ID: {m.id}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
