import { useState, useCallback } from 'react';
import type { UploadedVideo, DeleteVideoResponse } from '../types/video';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

interface VideosListParams {
  page?: number;
  pageSize?: number;
  status?: 'active' | 'deleted' | 'all';
}

export const useVideos = () => {
  const [videos, setVideos] = useState<UploadedVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchVideos = useCallback(async (params: VideosListParams = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
      if (params.status && params.status !== 'all') queryParams.append('status', params.status);

      const url = `${BACKEND_URL}/api/videos${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await fetch(url);

      // Handle 404 - backend endpoint not yet implemented
      if (response.status === 404) {
        setVideos([]);
        setTotal(0);
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch videos');

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response from server');
      }

      const data = await response.json();
      setVideos(data.videos || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteVideo = useCallback(async (id: string): Promise<void> => {
    setError(null);
    const response = await fetch(`${BACKEND_URL}/api/videos/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || data.message || 'Failed to delete video');
    }

    const result: DeleteVideoResponse = await response.json();

    // Optimistically update the list
    setVideos(prev => prev.filter(v => v.id !== id));
    setTotal(prev => Math.max(0, prev - 1));

    return result;
  }, []);

  const refreshVideos = useCallback(async (params: VideosListParams = {}) => {
    await fetchVideos(params);
  }, [fetchVideos]);

  return {
    videos,
    loading,
    error,
    total,
    fetchVideos,
    deleteVideo,
    refreshVideos,
  };
};
