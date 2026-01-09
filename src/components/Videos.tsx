import { useEffect, useState, useCallback, useRef } from 'react';
import { useVideos } from '../hooks/useVideos';
import type { UploadedVideo } from '../types/video';
import './Videos.css';

interface VideoPlayerModalProps {
  video: UploadedVideo;
  onClose: () => void;
}

function VideoPlayerModal({ video, onClose }: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    const downloadUrl = video.cloudinaryUrl.includes('cloudinary')
      ? `${video.cloudinaryUrl}?fl_attachment=true`
      : video.cloudinaryUrl;

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = video.originalFilename || `video-${video.id}.${video.format || 'mp4'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(video.cloudinaryUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="video-modal-overlay" onClick={onClose}>
      <div className="video-modal-wrapper" onClick={(e) => e.stopPropagation()}>
        {/* Top Bar */}
        <div className="video-modal-topbar">
          <div className="video-modal-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <span>{video.originalFilename || `Video ${video.id.slice(0, 8)}`}</span>
          </div>
          <div className="video-modal-actions">
            <button className="video-modal-btn" onClick={handleCopyUrl} title="Copy URL">
              {copied ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  <span>Copy Link</span>
                </>
              )}
            </button>
            <button className="video-modal-btn" onClick={handleDownload} title="Download">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Download</span>
            </button>
            <button className="video-modal-btn close" onClick={onClose} title="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* Video Player */}
        <div className="video-modal-player">
          <video
            ref={videoRef}
            className="video-modal-video"
            src={video.cloudinaryUrl}
            controls
            autoPlay
            preload="metadata"
          />
        </div>

        {/* Video Info Bar */}
        <div className="video-modal-infobar">
          <div className="video-modal-stats">
            <div className="video-modal-stat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>{formatDuration(video.duration || 0)}</span>
            </div>
            <div className="video-modal-stat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span>{formatFileSize(video.fileSize || 0)}</span>
            </div>
            {video.width && video.height && (
              <div className="video-modal-stat">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                <span>{video.width} × {video.height}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface DeleteConfirmModalProps {
  videoName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteConfirmModal({ videoName, onConfirm, onCancel, isDeleting }: DeleteConfirmModalProps) {
  return (
    <div className="video-modal-overlay" onClick={onCancel}>
      <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
            <line x1="18" y1="9" x2="12" y2="15"></line>
            <line x1="12" y1="9" x2="18" y2="15"></line>
          </svg>
        </div>
        <div className="delete-modal-content">
          <h3>Delete Video</h3>
          <p>Are you sure you want to delete this video?</p>
          <p className="delete-modal-filename">{videoName}</p>
          <p className="delete-modal-warning">This action cannot be undone.</p>
        </div>
        <div className="delete-modal-actions">
          <button className="btn-cancel" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </button>
          <button
            className="btn-delete"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface VideoCardProps {
  video: UploadedVideo;
  onPlay: (video: UploadedVideo) => void;
  onDelete: (video: UploadedVideo) => void;
  isDeleting: boolean;
}

function VideoCard({ video, onPlay, onDelete, isDeleting }: VideoCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    onDelete(video);
    setShowDeleteConfirm(false);
  };

  // Generate thumbnail URL from Cloudinary - use first frame of video
  const thumbnailUrl = !imageError && video.cloudinaryUrl.includes('cloudinary')
    ? `${video.cloudinaryUrl.replace(/\.(mp4|mov|avi|webm)$/i, '')}.jpg`
    : '';

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <div className="video-card">
        <div className="video-card-thumbnail" onClick={() => onPlay(video)}>
          {thumbnailUrl ? (
            <>
              <img
                src={thumbnailUrl}
                alt={video.originalFilename || 'Video thumbnail'}
                onError={() => setImageError(true)}
              />
              <div className="video-card-overlay">
                <div className="video-card-play-btn">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </div>
              </div>
            </>
          ) : (
            <div className="video-card-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </div>
          )}
          {video.duration && (
            <span className="video-card-duration-badge">
              {formatDuration(video.duration)}
            </span>
          )}
        </div>
        <div className="video-card-body">
          <div className="video-card-info">
            <h4 className="video-card-name" title={video.originalFilename || `Video ${video.id.slice(0, 8)}`}>
              {video.originalFilename || `Video ${video.id.slice(0, 8)}`}
            </h4>
            <div className="video-card-meta">
              <span className="video-card-time">{formatDate(video.createdAt)}</span>
              {video.fileSize && <span className="video-card-dot">·</span>}
              {video.fileSize && <span className="video-card-size">{formatFileSize(video.fileSize)}</span>}
            </div>
          </div>
          <div className="video-card-actions">
            <button
              className="video-card-action-btn primary"
              onClick={() => onPlay(video)}
              title="Play video"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              <span>Play</span>
            </button>
            <a
              className="video-card-action-btn"
              href={`${video.cloudinaryUrl}?fl_attachment=true`}
              download={video.originalFilename || `video-${video.id}.${video.format || 'mp4'}`}
              title="Download video"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Download</span>
            </a>
            <button
              className="video-card-action-btn danger"
              onClick={handleDeleteClick}
              title="Delete video"
              disabled={isDeleting}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <DeleteConfirmModal
          videoName={video.originalFilename || `Video ${video.id.slice(0, 8)}`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}

interface VideosGridProps {
  videos: UploadedVideo[];
  onPlay: (video: UploadedVideo) => void;
  onDelete: (video: UploadedVideo) => void;
  deletingId: string | null;
}

function VideosGrid({ videos, onPlay, onDelete, deletingId }: VideosGridProps) {
  if (videos.length === 0) {
    return (
      <div className="videos-empty">
        <div className="videos-empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </div>
        <h3>No videos yet</h3>
        <p>Videos generated from your workflows will appear here</p>
      </div>
    );
  }

  return (
    <div className="videos-grid">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          onPlay={onPlay}
          onDelete={onDelete}
          isDeleting={deletingId === video.id}
        />
      ))}
    </div>
  );
}

export function Videos() {
  const { videos, loading, error, fetchVideos, deleteVideo } = useVideos();
  const [selectedVideo, setSelectedVideo] = useState<UploadedVideo | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos({ status: 'active' });
  }, [fetchVideos]);

  const handlePlay = useCallback((video: UploadedVideo) => {
    setSelectedVideo(video);
  }, []);

  const handleDelete = useCallback(async (video: UploadedVideo) => {
    setDeletingId(video.id);
    try {
      await deleteVideo(video.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete video');
    } finally {
      setDeletingId(null);
    }
  }, [deleteVideo]);

  const handleCloseModal = useCallback(() => {
    setSelectedVideo(null);
  }, []);

  const isBackendUnavailable = error && error.includes('<!doctype');
  const displayError = isBackendUnavailable ? null : error;

  return (
    <div className="videos-page">
      <div className="videos-page-header">
        <div>
          <h1>Videos</h1>
          <p className="videos-page-subtitle">
            {loading
              ? 'Loading videos...'
              : isBackendUnavailable
                ? 'Video library coming soon'
                : displayError
                  ? displayError
                  : `${videos.length} video${videos.length !== 1 ? 's' : ''}`
          }
          </p>
        </div>
      </div>

      {loading && !videos.length ? (
        <div className="videos-loading">
          <div className="videos-spinner"></div>
          <p>Loading videos...</p>
        </div>
      ) : isBackendUnavailable ? (
        <div className="videos-empty">
          <div className="videos-empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </div>
          <h3>Video Library Coming Soon</h3>
          <p>This feature will be available once the backend is updated with Cloudinary integration</p>
        </div>
      ) : displayError ? (
        <div className="videos-error">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p>{displayError}</p>
        </div>
      ) : (
        <VideosGrid
          videos={videos}
          onPlay={handlePlay}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      )}

      {selectedVideo && (
        <VideoPlayerModal
          video={selectedVideo}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
