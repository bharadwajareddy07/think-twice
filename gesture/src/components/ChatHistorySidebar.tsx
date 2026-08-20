import React from 'react';
import { ChatHistoryItem } from '../types/slack';
import { MessageSquare, Plus, Download, Trash2, FileText, Code } from 'lucide-react';

interface ChatHistorySidebarProps {
  history: ChatHistoryItem[];
  activeId: string | null;
  onSelectChat: (item: ChatHistoryItem) => void;
  onNewChat: () => void;
  onClearHistory: () => void;
  onExportMarkdown: () => void;
  onExportJson: () => void;
}

export const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  history,
  activeId,
  onSelectChat,
  onNewChat,
  onClearHistory,
  onExportMarkdown,
  onExportJson,
}) => {
  return (
    <aside className="w-64 md:w-72 h-full glass-panel border-r border-slate-800 flex flex-col justify-between p-4 select-none shrink-0">
      {/* Top Header & New Chat Button */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-cyan-400 font-orbitron font-bold text-sm">
          <MessageSquare className="w-5 h-5 text-cyan-400" />
          <span>SLACK RESEARCHER</span>
        </div>

        <button
          onClick={onNewChat}
          className="cyber-button w-full py-2.5 px-4 rounded-xl font-orbitron font-bold text-xs text-white flex items-center justify-center space-x-2 cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4 text-cyan-300" />
          <span>NEW QUERY CHAT</span>
        </button>

        {/* History List */}
        <div className="space-y-2 mt-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">
            CONVERSATION HISTORY
          </span>

          <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {history.length === 0 ? (
              <div className="p-3 text-xs text-slate-500 text-center italic">No previous queries saved.</div>
            ) : (
              history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectChat(item)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col space-y-1 ${
                    item.id === activeId
                      ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-200 shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                      : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <span className="font-semibold text-xs truncate w-full">{item.title}</span>
                  <span className="text-[10px] text-slate-500">{item.createdAt}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer Export & Clear Tools */}
      <div className="pt-3 border-t border-slate-800 space-y-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={onExportMarkdown}
            className="flex-1 p-2 rounded-xl glass-panel border border-slate-800 hover:border-cyan-400 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
            title="Export Answer as Markdown"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>MD EXPORT</span>
          </button>

          <button
            onClick={onExportJson}
            className="flex-1 p-2 rounded-xl glass-panel border border-slate-800 hover:border-amber-400 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
            title="Export Answer as JSON"
          >
            <Code className="w-3.5 h-3.5 text-amber-400" />
            <span>JSON</span>
          </button>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="w-full p-2 rounded-xl border border-rose-950 hover:border-rose-500/40 bg-rose-950/20 text-rose-400 hover:text-rose-300 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>CLEAR HISTORY</span>
          </button>
        )}
      </div>
    </aside>
  );
};
