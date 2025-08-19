import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ChatMessages from './chat-messages';
import ChatInput from './chat-input';
import { Project } from '@/lib/types';

interface ChatSidebarProps {
  project: Project | null;
}

export default function ChatSidebar({ project }: ChatSidebarProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: status } = useQuery({
    queryKey: ['/api/status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getProviderIcon = (provider: string, isActive: boolean) => {
    const baseClasses = "w-2 h-2 rounded-full";
    const statusClasses = isActive ? "bg-emerald-500" : "bg-slate-300";
    return `${baseClasses} ${statusClasses}`;
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'azure': return 'Azure GPT-5';
      case 'google': return 'Google AI';
      default: return 'Unknown';
    }
  };

  return (
    <div className="w-2/5 bg-white border-r border-slate-200 flex flex-col" data-testid="chat-sidebar">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-white" data-testid="chat-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-code text-white text-sm"></i>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Project Generator</h1>
              <p className="text-xs text-slate-500">AI-Powered Next.js Development</p>
            </div>
          </div>
          <button 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            data-testid="button-settings"
          >
            <i className="fas fa-cog"></i>
          </button>
        </div>
        
        {/* AI Services Status */}
        <div className="mt-3 flex flex-wrap gap-2">
          {/* Active AI Provider */}
          {status?.aiProviders?.active && status.aiProviders.active !== 'none' && (
            <div className="flex items-center space-x-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-200">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>{getProviderName(status.aiProviders.active)}</span>
              <span className="text-blue-500">●</span>
            </div>
          )}
          
          {/* Other Services */}
          <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${
            status?.services?.firecrawl 
              ? 'bg-emerald-50 text-emerald-700' 
              : 'bg-slate-50 text-slate-500'
          }`}>
            <div className={getProviderIcon('firecrawl', status?.services?.firecrawl)}></div>
            <span>Firecrawl</span>
          </div>
          
          <div className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${
            status?.services?.e2b 
              ? 'bg-emerald-50 text-emerald-700' 
              : 'bg-slate-50 text-slate-500'
          }`}>
            <div className={getProviderIcon('e2b', status?.services?.e2b)}></div>
            <span>E2B</span>
          </div>

          {/* Additional AI Providers (if not active) */}
          {status?.aiProviders?.azure && status.aiProviders.active !== 'azure' && (
            <div className="flex items-center space-x-1 text-xs bg-slate-50 text-slate-500 px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
              <span>Azure GPT-5</span>
            </div>
          )}
          
          {status?.aiProviders?.google && status.aiProviders.active !== 'google' && (
            <div className="flex items-center space-x-1 text-xs bg-slate-50 text-slate-500 px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
              <span>Google AI</span>
            </div>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <ChatMessages 
        project={project} 
        isGenerating={isGenerating}
        onGenerationStart={() => setIsGenerating(true)}
        onGenerationEnd={() => setIsGenerating(false)}
      />

      {/* Chat Input */}
      <ChatInput 
        project={project} 
        disabled={isGenerating}
        onMessageSent={() => setIsGenerating(true)}
      />
    </div>
  );
}
