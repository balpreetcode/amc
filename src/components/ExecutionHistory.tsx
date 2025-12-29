import { useEffect, useState } from 'react';

interface ExecutionResult {
    workflowId: string;
    workflowName: string;
    status: 'completed' | 'failed';
    startTime: string;
    endTime: string;
    durationMs: number;
    nodeCount: number;
    videoUrl?: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export function ExecutionHistory() {
    const [history, setHistory] = useState<ExecutionResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [playingVideo, setPlayingVideo] = useState<string | null>(null);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/workflow/history`);
            if (!response.ok) {
                throw new Error('Failed to fetch history');
            }
            const data = await response.json();
            setHistory(data);
            setError(null);
        } catch (err) {
            setError('Could not load history');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const formatDuration = (ms: number) => {
        if (ms < 1000) return `${ms}ms`;
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleString();
    };

    const handleDownloadVideo = async (videoUrl: string) => {
        try {
            // Extract filename from URL
            const filename = videoUrl.split('/').pop() || 'video.mp4';

            // Use the download endpoint that forces download with correct headers
            const downloadUrl = `${BACKEND_URL}/download/${filename}`;

            // Fetch the file as a blob
            const response = await fetch(downloadUrl);
            if (!response.ok) {
                throw new Error('Download failed');
            }

            const blob = await response.blob();

            // Create blob URL and download
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up blob URL
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download error:', error);
            alert('Failed to download video. Please try again.');
        }
    };

    return (
        <div className="execution-history">
            <div className="history-header">
                <h2>Execution History</h2>
                <button className="btn-secondary" onClick={fetchHistory}>
                    ↻ Refresh
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div className="loading-state">Loading history...</div>
            ) : history.length === 0 ? (
                <div className="empty-state">No execution history found. Run a workflow to see it here!</div>
            ) : (
                <div className="history-table-container">
                    <table className="history-table">
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Workflow Name</th>
                                <th>Date</th>
                                <th>Duration</th>
                                <th>Nodes</th>
                                <th>Video</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((run) => (
                                <tr key={run.workflowId}>
                                    <td>
                                        <span className={`status-badge ${run.status}`}>
                                            {run.status === 'completed' ? '✓ Success' : '✕ Failed'}
                                        </span>
                                    </td>
                                    <td>{run.workflowName}</td>
                                    <td>{formatDate(run.startTime)}</td>
                                    <td>{formatDuration(run.durationMs)}</td>
                                    <td>{run.nodeCount}</td>
                                    <td>
                                        {run.status === 'completed' && run.videoUrl ? (
                                            <button
                                                className="video-play-button"
                                                onClick={() => setPlayingVideo(run.videoUrl!)}
                                                title="Play video"
                                            >
                                                ▶ Play
                                            </button>
                                        ) : (
                                            <span className="no-video">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Video Player Modal */}
            {playingVideo && (
                <div className="video-modal-overlay" onClick={() => setPlayingVideo(null)}>
                    <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="video-modal-header">
                            <h3>Generated Video</h3>
                            <div className="video-modal-actions">
                                <button
                                    className="download-button"
                                    onClick={() => handleDownloadVideo(playingVideo)}
                                    title="Download video"
                                >
                                    ⬇ Download
                                </button>
                                <button className="close-button" onClick={() => setPlayingVideo(null)}>
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div className="video-player-container">
                            <video
                                src={playingVideo}
                                controls
                                autoPlay
                                className="video-player"
                            >
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
