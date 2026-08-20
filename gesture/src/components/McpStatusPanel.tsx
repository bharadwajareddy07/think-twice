import React, { useState } from 'react';
import { McpStatus } from '../types/slack';
import { Activity, ShieldCheck, Terminal, Cpu, X, Play, RefreshCw } from 'lucide-react';

interface McpStatusPanelProps {
  status: McpStatus | null;
  onRefresh: () => void;
}

export const McpStatusPanel: React.FC<McpStatusPanelProps> = ({ status, onRefresh }) => {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string>('slack_get_channel_history');
  const [toolArgsText, setToolArgsText] = useState<string>('{\n  "channel_id": "C0BRC2NRJ5T",\n  "limit": 10\n}');
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const isConnected = status?.connected || false;

  const handleTestCall = async () => {
    setIsTesting(true);
    setTestOutput(null);
    try {
      let args = {};
      try {
        args = JSON.parse(toolArgsText);
      } catch (e) {
        setTestOutput('Invalid JSON input in arguments.');
        setIsTesting(false);
        return;
      }

      const res = await fetch('/api/mcp/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: selectedTool, args }),
      });
      const data = await res.json();
      setTestOutput(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setTestOutput(`Error: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <>
      {/* Header Status Badge */}
      <button
        onClick={() => setShowDiagnostics(true)}
        className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 transition-all text-xs cursor-pointer shadow-sm"
      >
        <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
        <span className="font-bold text-slate-200">
          {isConnected ? `MCP Connected (${status?.serverName || 'Slack Server'})` : 'MCP Disconnected'}
        </span>
        <span className="text-slate-500 font-mono">[{status?.transport || 'stdio'}]</span>
      </button>

      {/* Diagnostics Modal */}
      {showDiagnostics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none">
          <div className="w-full max-w-3xl glass-panel-glow p-6 md:p-8 rounded-3xl flex flex-col max-h-[90vh] border border-cyan-500/40">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-orbitron font-black text-xl text-cyan-300">LOCAL MCP DIAGNOSTICS</h2>
                  <p className="text-xs text-slate-400">Server: {status?.serverName} v{status?.serverVersion}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={onRefresh}
                  className="p-2 rounded-xl glass-panel border border-slate-700 hover:border-cyan-400 text-slate-300 transition-all cursor-pointer"
                  title="Refresh MCP Connection"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowDiagnostics(false)}
                  className="p-2 rounded-xl glass-panel border border-slate-700 hover:border-cyan-400 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Status Summary */}
            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="glass-panel p-3 rounded-xl border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase">STATUS</span>
                <span className={`font-orbitron font-bold text-sm mt-1 ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isConnected ? 'ONLINE (ACTIVE)' : 'OFFLINE'}
                </span>
              </div>

              <div className="glass-panel p-3 rounded-xl border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase">TRANSPORT</span>
                <span className="font-orbitron font-bold text-sm text-cyan-300 mt-1 uppercase">
                  {status?.transport || 'STDIO'}
                </span>
              </div>

              <div className="glass-panel p-3 rounded-xl border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase">DISCOVERED TOOLS</span>
                <span className="font-orbitron font-bold text-sm text-amber-400 mt-1">
                  {status?.tools?.length || 0} TOOLS
                </span>
              </div>
            </div>

            {/* Tool Inspector & Tester */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <h3 className="font-orbitron font-bold text-sm text-slate-200 uppercase tracking-wider">
                Discovered MCP Tools & Schemas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {status?.tools?.map((t) => (
                  <div key={t.name} className="glass-panel p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="font-mono font-bold text-cyan-400 text-xs">{t.name}</div>
                    <p className="text-slate-300 text-xs leading-relaxed">{t.description}</p>
                  </div>
                ))}
              </div>

              {/* Direct Tool Sandbox */}
              <div className="glass-panel p-4 rounded-2xl border border-cyan-500/30 space-y-3 mt-4">
                <div className="flex items-center space-x-2 text-cyan-300 font-orbitron font-bold text-xs">
                  <Terminal className="w-4 h-4" />
                  <span>DIRECT MCP TOOL TESTER</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedTool}
                    onChange={(e) => setSelectedTool(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-cyan-200 text-xs font-mono focus:outline-none"
                  >
                    {status?.tools?.map((t) => (
                      <option key={t.name} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleTestCall}
                    disabled={isTesting}
                    className="cyber-button px-4 py-2 rounded-xl font-orbitron font-bold text-white text-xs flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 text-cyan-300" />
                    <span>{isTesting ? 'EXECUTING...' : 'RUN TOOL'}</span>
                  </button>
                </div>

                <textarea
                  rows={3}
                  value={toolArgsText}
                  onChange={(e) => setToolArgsText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                  placeholder="JSON arguments object..."
                />

                {testOutput && (
                  <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-cyan-300 font-mono text-[11px] overflow-x-auto max-h-48">
                    {testOutput}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
