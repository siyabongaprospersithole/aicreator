import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChatMessage, Project } from '@/lib/types';
import { useWebSocket } from '@/hooks/use-websocket';

interface ChatMessagesProps {
  project: Project | null;
  isGenerating: boolean;
  onGenerationStart: () => void;
  onGenerationEnd: () => void;
}

export default function ChatMessages({ project, isGenerating, onGenerationStart, onGenerationEnd }: ChatMessagesProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [generationProgress, setGenerationProgress] = useState<{ progress: number; step: string; message: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { lastMessage } = useWebSocket(project?.id);

  const { data: fetchedMessages } = useQuery({
    queryKey: ['/api/projects', project?.id, 'messages'],
    enabled: !!project?.id,
  });

  useEffect(() => {
    if (fetchedMessages && Array.isArray(fetchedMessages)) {
      setMessages(fetchedMessages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.createdAt)
      })));
    }
  }, [fetchedMessages]);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'message':
          setMessages(prev => [...prev, {
            id: `ws-${Date.now()}`,
            role: lastMessage.role,
            content: lastMessage.content,
            timestamp: new Date(),
            metadata: lastMessage.metadata
          }]);
          break;
        case 'generation_progress':
          setGenerationProgress({
            progress: lastMessage.progress,
            step: lastMessage.step,
            message: lastMessage.message
          });
          onGenerationStart();
          break;
        case 'generation_complete':
          setGenerationProgress(null);
          onGenerationEnd();
          break;
        case 'generation_error':
          setGenerationProgress(null);
          onGenerationEnd();
          setMessages(prev => [...prev, {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: `Sorry, there was an error: ${lastMessage.error}`,
            timestamp: new Date(),
            metadata: { error: lastMessage.error }
          }]);
          break;
      }
    }
  }, [lastMessage, onGenerationStart, onGenerationEnd]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, generationProgress]);

  const quickStartOptions = [
    "E-commerce site with product catalog",
    "Dashboard app with analytics",
    "Blog platform with CMS",
    "Task management app like Notion",
    "Social media feed interface"
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="chat-messages">
      {messages.length === 0 && (
        <div className="chat-message">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center">
              <i className="fas fa-robot text-white text-sm"></i>
            </div>
            <div className="flex-1">
              <div className="bg-slate-100 rounded-lg px-4 py-3">
                <p className="text-sm text-slate-700">
                  Welcome! I'm your AI development assistant. Describe the Next.js project you'd like to create, and I'll generate the complete codebase for you.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {quickStartOptions.map((option, index) => (
                    <button 
                      key={index}
                      className="text-xs bg-white border border-slate-200 px-2 py-1 rounded hover:bg-slate-50 transition-colors"
                      data-testid={`button-quickstart-${index}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1">Ready to help</p>
            </div>
          </div>
        </div>
      )}

      {messages.map((message) => (
        <div key={message.id} className="chat-message">
          {message.role === 'user' ? (
            <div className="flex items-start space-x-3 justify-end">
              <div className="flex-1 max-w-xs">
                <div className="bg-primary rounded-lg px-4 py-3">
                  <p className="text-sm text-white">{message.content}</p>
                </div>
                <p className="text-xs text-slate-400 mt-1 text-right">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
              <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center">
                <i className="fas fa-user text-slate-600 text-sm"></i>
              </div>
            </div>
          ) : (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center">
                <i className="fas fa-robot text-white text-sm"></i>
              </div>
              <div className="flex-1">
                <div className="bg-slate-100 rounded-lg px-4 py-3">
                  {message.metadata?.generationStep && (
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                      <p className="text-xs text-slate-600 font-medium">
                        {message.metadata.generationStep}...
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-slate-700">{message.content}</p>
                  {message.metadata?.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      Error: {message.metadata.error}
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          )}
        </div>
      ))}

      {generationProgress && (
        <div className="chat-message">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center">
              <i className="fas fa-robot text-white text-sm"></i>
            </div>
            <div className="flex-1">
              <div className="bg-slate-100 rounded-lg px-4 py-3">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                  <p className="text-xs text-slate-600 font-medium">{generationProgress.step}</p>
                </div>
                <p className="text-sm text-slate-700 mb-3">{generationProgress.message}</p>
                <div className="bg-white border border-slate-200 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-600">Progress</span>
                    <span className="text-xs text-slate-600">{generationProgress.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div 
                      className="bg-primary h-1.5 rounded-full transition-all duration-300" 
                      style={{ width: `${generationProgress.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1">Generating...</p>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
