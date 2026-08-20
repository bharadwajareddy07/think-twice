import React, { useState } from 'react';
import { SlackChannel, AssistantQueryResult, QueryProgressStep } from '../types/slack';
import { Search, Sparkles, Filter, CheckCircle2, Clock, AlertCircle, ArrowUpRight, MessageSquare, ListChecks, Users, ShieldAlert, Bug } from 'lucide-react';

interface SlackAssistantProps {
  channels: SlackChannel[];
  selectedChannelId: string;
  onSelectChannel: (id: string) => void;
  onSubmitQuery: (prompt: string) => void;
  isLoading: boolean;
  queryResult: AssistantQueryResult | null;
  onToggleDevMode: () => void;
  isDevModeOpen: boolean;
}

export const SlackAssistant: React.FC<SlackAssistantProps> = ({
  channels,
  selectedChannelId,
  onSelectChannel,
  onSubmitQuery,
  isLoading,
  queryResult,
  onToggleDevMode,
  isDevModeOpen,
}) => {
  const [promptText, setPromptText] = useState('');

  const samplePrompts = [
    'What were the important discussions about the Think Twice project this week?',
    'Summarize the recent messages in channel C0BRC2NRJ5T.',
    'What are the unresolved issues or bugs in development discussions?',
    'What tasks or next steps were assigned to the team?',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim() || isLoading) return;
    onSubmitQuery(promptText);
  };

  const handleChipClick = (p: string) => {
    setPromptText(p);
    onSubmitQuery(p);
  };

  return (
    <div className="flex-1 h-full flex flex-col justify-between p-4 md:p-8 select-none overflow-y-auto bg-[#0a0d14]">
      {/* Top Bar with Channel Selector & Dev Mode Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">CHANNEL SCOPE:</span>
          </div>

          <select
            value={selectedChannelId}
            onChange={(e) => onSelectChannel(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="">ALL CONFIGURED CHANNELS</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name && c.name !== c.id ? `#${c.name} (${c.id})` : `Channel ${c.id}`}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Paste Channel link or ID (C0...)"
            value={selectedChannelId}
            onChange={(e) => {
              const val = e.target.value.trim();
              const match = val.match(/(C[A-Z0-9]{8,11})/i);
              onSelectChannel(match ? match[1].toUpperCase() : val);
            }}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-cyan-200 font-mono text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-64"
          />
        </div>

        <button
          onClick={onToggleDevMode}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
            isDevModeOpen
              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bug className="w-3.5 h-3.5" />
          <span>DEV MODE {isDevModeOpen ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full my-6 space-y-6">
        {!queryResult && !isLoading && (
          <div className="text-center space-y-4 my-auto">
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(0,240,255,0.2)]">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>Slack Intelligence Assistant</span>
            </div>

            <h1 className="font-orbitron font-black text-4xl md:text-6xl text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-pink-500 drop-shadow-[0_0_25px_rgba(0,240,255,0.3)]">
              ASK ANYTHING ABOUT SLACK
            </h1>

            <p className="text-slate-300 text-base max-w-xl mx-auto font-medium">
              Enter natural language prompts to search, retrieve, expand threads, and summarize live discussions directly from your local Slack MCP server.
            </p>
          </div>
        )}

        {/* Loading Step-by-Step Progress Tracker */}
        {isLoading && (
          <div className="glass-panel-glow p-6 rounded-3xl border border-cyan-500/40 space-y-4 shadow-xl">
            <div className="flex items-center space-x-3 text-cyan-300 font-orbitron font-bold text-sm">
              <Clock className="w-5 h-5 animate-spin text-cyan-400" />
              <span>PROCESSING SLACK REQUEST...</span>
            </div>

            <div className="space-y-2">
              {queryResult?.steps?.map((step) => (
                <div key={step.id} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center space-x-2">
                    {step.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {step.status === 'active' && <Clock className="w-4 h-4 text-cyan-400 animate-spin" />}
                    {step.status === 'pending' && <span className="w-4 h-4 rounded-full border border-slate-700 block" />}
                    {step.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-500" />}
                    <span className={step.status === 'completed' ? 'text-slate-200' : 'text-slate-400'}>{step.label}</span>
                  </div>
                  {step.detail && <span className="text-[10px] text-cyan-400 font-mono">{step.detail}</span>}
                </div>
              )) || (
                <div className="text-cyan-400 text-xs animate-pulse">Connecting to Slack MCP server and parsing prompt...</div>
              )}
            </div>
          </div>
        )}

        {/* Grounded Answer View */}
        {queryResult && !isLoading && (
          <div className="space-y-6">
            {/* Prompt Card */}
            <div className="glass-panel p-4 rounded-2xl border border-cyan-500/30 flex items-start space-x-3">
              <MessageSquare className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">QUERY PROMPT</span>
                <p className="text-white font-orbitron font-bold text-lg mt-0.5">{queryResult.prompt}</p>
              </div>
            </div>

            {/* Answer Structure Card */}
            <div className="glass-panel-glow p-6 md:p-8 rounded-3xl border border-cyan-500/40 space-y-6 shadow-2xl">
              {/* Summary Header */}
              <div>
                <h3 className="font-orbitron font-black text-xl text-cyan-300 tracking-wide uppercase">SUMMARY</h3>
                <p className="mt-2 text-slate-200 text-sm md:text-base leading-relaxed">{queryResult.answer.summary}</p>

                {queryResult.answer.summary.includes('/invite') && (
                  <div className="mt-4 p-4 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-200 text-xs space-y-2 shadow-lg">
                    <div className="font-orbitron font-bold text-sm text-cyan-300 flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span>HOW TO INVITE THE SLACK BOT TO YOUR CHANNELS</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 text-slate-300">
                      <li>Open Slack in your browser or desktop app.</li>
                      <li>Navigate to channel <code className="bg-slate-900 px-1.5 py-0.5 rounded text-cyan-300 font-mono">C0BRC2NRJ5T</code> or <code className="bg-slate-900 px-1.5 py-0.5 rounded text-cyan-300 font-mono">C0BRKGA8HK6</code>.</li>
                      <li>Type <code className="bg-slate-900 px-2 py-0.5 rounded text-emerald-400 font-bold font-mono">/invite @geatures app</code> and press Enter.</li>
                      <li>Re-run your query here to immediately retrieve live Slack messages!</li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Key Points */}
              {queryResult.answer.keyPoints.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-amber-400 font-orbitron font-bold text-sm uppercase">
                    <ListChecks className="w-4 h-4" />
                    <span>KEY POINTS & HIGHLIGHTS</span>
                  </div>
                  <ul className="space-y-2 pl-2">
                    {queryResult.answer.keyPoints.map((pt, i) => (
                      <li key={i} className="text-slate-300 text-sm flex items-start space-x-2">
                        <span className="text-amber-400">•</span>
                        <span dangerouslySetInnerHTML={{ __html: pt.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>') }} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* People Involved */}
              {queryResult.answer.peopleInvolved.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-purple-400 font-orbitron font-bold text-sm uppercase">
                    <Users className="w-4 h-4" />
                    <span>PARTICIPANTS</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {queryResult.answer.peopleInvolved.map((p, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-purple-950/60 border border-purple-500/40 text-purple-300 text-xs font-semibold">
                        @{p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Unresolved Issues */}
              {queryResult.answer.unresolvedIssues.length > 0 && (
                <div className="space-y-2 p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40">
                  <div className="flex items-center space-x-2 text-rose-400 font-orbitron font-bold text-sm uppercase">
                    <ShieldAlert className="w-4 h-4" />
                    <span>UNRESOLVED ISSUES & BUGS</span>
                  </div>
                  <ul className="space-y-1.5 pl-2">
                    {queryResult.answer.unresolvedIssues.map((iss, i) => (
                      <li key={i} className="text-rose-200 text-xs leading-relaxed">
                        • {iss}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Grounded Source References */}
              {queryResult.answer.sources.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <span className="text-xs font-orbitron font-bold text-slate-400 uppercase tracking-widest">
                    CITED SLACK SOURCES ({queryResult.answer.sources.length})
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {queryResult.answer.sources.map((src, i) => (
                      <div key={i} className="p-3 rounded-xl glass-panel border border-slate-800 flex flex-col justify-between space-y-2">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-bold text-cyan-400">{src.channelName}</span>
                          <span className="text-slate-400">{src.formattedDate}</span>
                        </div>
                        <p className="text-slate-300 text-xs italic">"{src.snippet}"</p>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-800 pt-1.5">
                          <span>Sender: {src.userName}</span>
                          {src.permalink && (
                            <a
                              href={src.permalink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:underline flex items-center space-x-1"
                            >
                              <span>View in Slack</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Suggestion Prompt Chips */}
        {!isLoading && (
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PROMPT SUGGESTIONS</span>
            <div className="flex flex-wrap gap-2">
              {samplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChipClick(p)}
                  className="px-3.5 py-2 rounded-xl glass-panel border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 text-xs font-medium transition-all text-left cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Natural Language Input Form */}
      <div className="max-w-4xl mx-auto w-full pt-4">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            disabled={isLoading}
            placeholder="Ask anything about Slack discussions, projects, or issues..."
            className="w-full bg-slate-900/90 border border-cyan-500/40 rounded-2xl px-5 py-4 text-cyan-100 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 pr-14 font-medium shadow-2xl"
          />
          <button
            type="submit"
            disabled={isLoading || !promptText.trim()}
            className={`absolute right-3 p-3 rounded-xl cyber-button text-white transition-all ${
              isLoading || !promptText.trim() ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <Search className="w-5 h-5 text-cyan-300" />
          </button>
        </form>
      </div>
    </div>
  );
};
