import { useCallback, useRef, useState } from 'react';
import { useDemoStore } from '@/stores/demoStore';
import { getApiBaseUrl } from '@/lib/api';

export function useDemoGeneration(projectId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const store = useDemoStore();

  const startGeneration = useCallback(async () => {
    // Abort existing request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    store.setIsGenerating(true);
    store.setError(null);

    const token = localStorage.getItem('token');
    const apiUrl = getApiBaseUrl();
    const url = `${apiUrl}/api/v1/projects/${projectId}/demo/generate/stream`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
        },
        signal: abortControllerRef.current.signal,
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
            const eventType = eventMatch[1];
            try {
              const data = JSON.parse(dataMatch[1]);

              // Handle SSE events inline to avoid closure issues
              switch (eventType) {
                case 'init':
                  store.setGenerationProgress({
                    totalPages: data.total_pages,
                    completedPages: 0,
                    currentPageId: null,
                    currentPageName: null,
                  });
                  store.setPlatforms(data.platforms);
                  break;

                case 'page_start':
                  store.setPageStatus(data.page_id, 'generating');
                  store.setGenerationProgress({
                    currentPageId: data.page_id,
                    currentPageName: data.page_name,
                  });
                  break;

                case 'page_progress':
                  store.appendPageCode(data.page_id, data.chunk);
                  break;

                case 'page_complete':
                  store.completePageGeneration(data.page_id, data.code);
                  break;

                case 'page_error':
                  store.setPageError(data.page_id, data.error);
                  break;

                case 'complete':
                  store.setDemoProject(data.demo_project);
                  store.setIsGenerating(false);
                  break;

                case 'error':
                  store.setError(data.message);
                  store.setIsGenerating(false);
                  break;
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }

      setIsConnected(false);
      store.setIsGenerating(false);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Generation aborted');
        return;
      }
      console.error('SSE Error:', error);
      store.setError(error.message);
      setIsConnected(false);
      store.setIsGenerating(false);
    }
  }, [projectId, store]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsConnected(false);
    store.setIsGenerating(false);
  }, [store]);

  return {
    startGeneration,
    stopGeneration,
    isConnected,
  };
}

export function useDemoModify(projectId: string) {
  const [isModifying, setIsModifying] = useState(false);
  const [modifyingPageId, setModifyingPageId] = useState<string | null>(null);

  const store = useDemoStore();

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
            const eventType = eventMatch[1];
            try {
              const data = JSON.parse(dataMatch[1]);

              switch (eventType) {
                case 'modify_progress':
                  store.appendPageCode(pageId, data.chunk);
                  break;
                case 'modify_complete':
                  store.completePageGeneration(pageId, data.code);
                  break;
                case 'error':
                  store.setError(data.message);
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
      store.setError(error.message);
      setIsModifying(false);
      setModifyingPageId(null);
    }
  }, [projectId, store]);

  return {
    modifyPage,
    isModifying,
    modifyingPageId,
  };
}
