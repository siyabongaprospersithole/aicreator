import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Project } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface ChatInputProps {
  project: Project | null;
  disabled: boolean;
  onMessageSent: () => void;
}

export default function ChatInput({ project, disabled, onMessageSent }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createProjectMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      const response = await apiRequest('POST', '/api/projects', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; projectId: string }) => {
      const response = await apiRequest('POST', `/api/projects/${data.projectId}/messages`, {
        role: 'user',
        content: data.content
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/projects', project?.id, 'messages'] 
      });
    }
  });

  const scrapeMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest('POST', '/api/scrape', { url });
      return response.json();
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || disabled) return;

    setIsLoading(true);
    onMessageSent();

    try {
      let currentProject = project;

      // If no project exists, create one
      if (!currentProject) {
        const projectName = message.length > 50 
          ? message.substring(0, 47) + '...'
          : message;
        
        currentProject = await createProjectMutation.mutateAsync({
          name: projectName,
          description: message
        });
      }

      // Send message  
      if (currentProject) {
        await sendMessageMutation.mutateAsync({
          content: message,
          projectId: currentProject.id
        });
      }

      setMessage('');
      
      toast({
        title: "Message sent",
        description: "AI is generating your project...",
      });

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleScrapeReference = async () => {
    const url = prompt('Enter URL to scrape for reference:');
    if (!url) return;

    try {
      const result = await scrapeMutation.mutateAsync(url);
      const scrapedContent = result.content;
      
      setMessage(prev => 
        prev + (prev ? '\n\n' : '') + 
        `Reference from ${url}:\n${scrapedContent.substring(0, 500)}...`
      );

      toast({
        title: "Reference scraped",
        description: "Content added to your message",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Scraping failed",
        description: "Could not scrape the provided URL",
      });
    }
  };

  return (
    <div className="p-4 border-t border-slate-200 bg-white" data-testid="chat-input">
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your Next.js project..."
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none min-h-[48px] max-h-32"
            disabled={disabled || isLoading}
            data-testid="input-message"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="button"
            onClick={handleScrapeReference}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            disabled={disabled || scrapeMutation.isPending}
            data-testid="button-attach"
          >
            <i className="fas fa-paperclip"></i>
          </button>
        </div>
        <button
          type="submit"
          disabled={!message.trim() || disabled || isLoading}
          className="px-4 py-3 bg-primary text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="button-send"
        >
          {isLoading ? (
            <i className="fas fa-spinner fa-spin"></i>
          ) : (
            <i className="fas fa-paper-plane"></i>
          )}
        </button>
      </form>
      
      <div className="flex justify-between items-center mt-2">
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={handleScrapeReference}
            className="text-xs text-slate-500 hover:text-slate-700 flex items-center space-x-1"
            disabled={scrapeMutation.isPending}
            data-testid="button-scrape"
          >
            <i className="fas fa-globe"></i>
            <span>{scrapeMutation.isPending ? 'Scraping...' : 'Scrape reference'}</span>
          </button>
          <button
            type="button"
            className="text-xs text-slate-500 hover:text-slate-700 flex items-center space-x-1"
            data-testid="button-upload"
          >
            <i className="fas fa-upload"></i>
            <span>Upload files</span>
          </button>
        </div>
        <p className="text-xs text-slate-400">Press Enter to send</p>
      </div>
    </div>
  );
}
