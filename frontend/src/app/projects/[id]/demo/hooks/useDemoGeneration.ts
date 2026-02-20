import { useCallback, useRef, useState } from 'react';
import { useDemoStore } from '@/stores/demoStore';
import { getApiBaseUrl } from '@/lib/api';

interface SSEEvent {
  event: string;
  data: any;
}

export function useDemoGeneration(projectId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const {
    setDemoProject,
    setPlatforms,
    setIsGenerating,
    setGenerationProgress,
    appendPageCode,
    completePageGeneration,
    setPageStatus,
    setPageError,
    setError,
  } = useDemoStore();

  const startGeneration = useCallback(async () => {
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsGenerating(true);
    setError(null);

    const token = localStorage.getItem('token');
    const apiUrl = getApiBaseUrl();
    const url = `${apiUrl}/api/v1/projects/${projectId}/demo/generate/stream`;

    try {
      // Use fetch with ReadableStream for better SSE handling with auth
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      setIsConnected(true);
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const chunk of lines) {
          if (!chunk.trim()) continue;

          const eventMatch = chunk.match(/^event:\s*(.+)$/m);
          const dataMatch = chunk.match(/^data:\s*(.+)$/m);

          if (eventMatch && dataMatch) {
            const event = eventMatch[1];
            try {
              const data = JSON.parse(dataMatch[1]);
              handleSSEEvent({ event, data });
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }

      setIsConnected(false);
      setIsGenerating(false);
    } catch (error: any) {
      console.error('SSE Error:', error);
      setError(error.message);
      setIsConnected(false);
      setIsGenerating(false);
    }
  }, [projectId, setIsGenerating, setError]);

  const handleSSEEvent = useCallback((event: SSEEvent) => {
    console.log('[SSE Event]', event.event, event.data);

    switch (event.event) {
      case 'init':
        // Structure generation complete
        setGenerationProgress({
          totalPages: event.data.total_pages,
          completedPages: 0,
          currentPageId: null,
          currentPageName: null,
        });
        setPlatforms(event.data.platforms);
        break;

      case 'page_start':
        // Starting to generate a page
        setPageStatus(event.data.page_id, 'generating');
        setGenerationProgress({
          currentPageId: event.data.page_id,
          currentPageName: event.data.page_name,
        });
        break;

      case 'page_progress':
        // Receiving code chunks
        appendPageCode(event.data.page_id, event.data.chunk);
        break;

      case 'page_complete':
        // Page generation complete
        completePageGeneration(event.data.page_id, event.data.code);
        break;

      case 'page_error':
        // Page generation error
        setPageError(event.data.page_id, event.data.error);
        break;

      case 'complete':
        // All generation complete
        setDemoProject(event.data.demo_project);
        setIsGenerating(false);
        break;

      case 'error':
        // General error
        setError(event.data.message);
        setIsGenerating(false);
        break;
    }
  }, [
    setGenerationProgress,
    setPlatforms,
    setPageStatus,
    appendPageCode,
    completePageGeneration,
    setPageError,
    setDemoProject,
    setIsGenerating,
    setError,
  ]);

  const stopGeneration = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    setIsGenerating(false);
  }, [setIsGenerating]);

  return {
    startGeneration,
    stopGeneration,
    isConnected,
  };
}

export function useDemoModify(projectId: string) {
  const [isModifying, setIsModifying] = useState(false);
  const [modifyingPageId, setModifyingPageId] = useState<string | null>(null);

  const {
    appendPageCode,
    completePageGeneration,
    setError,
  } = useDemoStore();

  const modifyPage = useCallback(async (pageId: string, instruction: string) => {
    setIsModifying(true);
    setModifyingPageId(pageId);

    const token = localStorage.getItem('token');
    const apiUrl = getApiBaseUrl();
    const url = `${apiUrl}/api/v1/projects/${projectId}/demo/modify`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          page_id: pageId,
          instruction,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let newCode = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const chunk of lines) {
          if (!chunk.trim()) continue;

          const eventMatch = chunk.match(/^event:\s*(.+)$/m);
          const dataMatch = chunk.match(/^data:\s*(.+)$/m);

          if (eventMatch && dataMatch) {
            const event = eventMatch[1];
            try {
              const data = JSON.parse(dataMatch[1]);

              switch (event) {
                case 'modify_progress':
                  newCode += data.chunk;
                  appendPageCode(pageId, data.chunk);
                  break;
                case 'modify_complete':
                  completePageGeneration(pageId, data.code);
                  break;
                case 'error':
                  setError(data.message);
                  break;
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }

      setIsModifying(false);
      setModifyingPageId(null);
    } catch (error: any) {
      console.error('Modify Error:', error);
      setError(error.message);
      setIsModifying(false);
      setModifyingPageId(null);
    }
  }, [projectId, appendPageCode, completePageGeneration, setError]);

  return {
    modifyPage,
    isModifying,
    modifyingPageId,
  };
}
