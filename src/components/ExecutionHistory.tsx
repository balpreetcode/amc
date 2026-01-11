import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkflowContext } from '../context/WorkflowContext';

interface ApiCall {
    callIndex?: number;
    request: any;
    response: any;
    timestamp: string;
    duration: number;
}

interface NodeResult {
    nodeId: string;
    nodeType: string;
    success: boolean;
    data?: {
        type: string;
        output: any;
        apiCalls?: ApiCall[];
    };
    error?: string;
}

interface ExecutionResult {
    workflowId: string;
    workflowName: string;
    status: 'completed' | 'failed';
    startTime: string;
    endTime: string;
    durationMs: number | null;
    nodeCount: number;
    videoUrl?: string;
    results?: NodeResult[];
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

const CopyButton = ({ text, title = "Copy" }: { text: string; title?: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            title={title}
            style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                marginLeft: '8px',
                padding: '2px',
                fontSize: '14px',
                verticalAlign: 'middle',
                opacity: 0.7,
                transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
        >
            {copied ? '✅' : '📋'}
        </button>
    );
};

export function ExecutionHistory() {
    const [history, setHistory] = useState<ExecutionResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [playingVideo, setPlayingVideo] = useState<string | null>(null);
    const [viewingDetails, setViewingDetails] = useState<ExecutionResult | null>(null);
    const [loadingWorkflow, setLoadingWorkflow] = useState<string | null>(null);

    const navigate = useNavigate();
    const { loadFromExecution } = useWorkflowContext();

    const handleLoadWorkflow = async (workflowId: string) => {
        setLoadingWorkflow(workflowId);
        try {
            const success = await loadFromExecution(workflowId);
            if (success) {
                navigate('/');
            } else {
                alert('Failed to load workflow');
            }
        } catch (err) {
            console.error('Error loading workflow:', err);
            alert('Failed to load workflow');
        } finally {
            setLoadingWorkflow(null);
        }
    };

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

    const formatDuration = (ms: number | null | undefined) => {
        if (ms == null || isNaN(ms)) return 'NA';
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
                                <th>ID</th>
                                <th>Workflow Name</th>
                                <th>Date</th>
                                <th>Duration</th>
                                <th>Nodes</th>
                                <th>Video</th>
                                <th className="execution-details-header">Details</th>
                                <th>Load</th>
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
                                    <td>
                                        <span title={run.workflowId} style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                                            {run.workflowId.substring(0, 8)}...
                                        </span>
                                        <CopyButton text={run.workflowId} title="Copy Full ID" />
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
                                    <td className="execution-details-cell">
                                        <button
                                            className="details-view-button"
                                            onClick={() => setViewingDetails(run)}
                                            title="View execution details"
                                        >
                                            View
                                        </button>
                                    </td>
                                    <td>
                                        <button
                                            className="load-workflow-button"
                                            onClick={() => handleLoadWorkflow(run.workflowId)}
                                            disabled={loadingWorkflow === run.workflowId}
                                            title="Load this workflow into Flow Builder"
                                        >
                                            {loadingWorkflow === run.workflowId ? '⏳' : '📂 Load'}
                                        </button>
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

            {/* Execution Details Modal */}
            {viewingDetails && (
                <div className="details-modal-overlay" onClick={() => setViewingDetails(null)}>
                    <div className="details-modal-content" onClick={(e) => e.stopPropagation()}>
                        {/* Fixed Header */}
                        <div className="details-modal-header">
                            <div className="details-header-left">
                                <h3>Workflow Execution Details</h3>
                            </div>
                            <button className="details-close-button" onClick={() => setViewingDetails(null)}>
                                ✕
                            </button>
                        </div>

                        {/* Metadata Bar */}
                        <div className="details-meta-bar">
                            <span className="details-meta-item">
                                <strong>ID:</strong> {viewingDetails.workflowId}
                                <CopyButton text={viewingDetails.workflowId} />
                            </span>
                            <span className="details-meta-item">
                                <strong>Workflow:</strong> {viewingDetails.workflowName}
                            </span>
                            <span className="details-meta-item">
                                <strong>Status:</strong>{' '}
                                <span className={`details-status-badge ${viewingDetails.status}`}>
                                    {viewingDetails.status === 'completed' ? '✓' : '✗'} {viewingDetails.status}
                                </span>
                            </span>
                            <span className="details-meta-item">
                                <strong>Duration:</strong> {formatDuration(viewingDetails.durationMs)}
                            </span>
                            <span className="details-meta-item">
                                <strong>Nodes:</strong> {viewingDetails.nodeCount}
                            </span>
                        </div>

                        {/* Scrollable Nodes Container */}
                        <div className="details-nodes-container">
                            {viewingDetails.results && viewingDetails.results.length > 0 ? (
                                viewingDetails.results.map((node, nodeIndex) => (
                                    <div className="details-node-card" key={node.nodeId}>
                                        {/* Node Header */}
                                        <div className="details-node-header">
                                            <span className="details-node-title">
                                                Node {nodeIndex + 1} of {viewingDetails.results!.length}: {node.nodeId}
                                            </span>
                                            <span className="details-node-type">{node.nodeType}</span>
                                            <span className={`details-node-badge ${node.success ? 'success' : 'failed'}`}>
                                                {node.success ? '✓' : '✗'}
                                            </span>
                                        </div>

                                        {/* API Calls Section */}
                                        {node.data?.output?.apiCalls && node.data.output.apiCalls.length > 0 ? (
                                            <div className="details-api-calls-container">
                                                {node.data.output.apiCalls.map((apiCall: ApiCall, callIndex: number) => (
                                                    <div className="details-api-call-pair" key={callIndex}>
                                                        {/* Call Header */}
                                                        <div className="details-call-header">
                                                            <span>
                                                                API Call {callIndex + 1} of {node.data!.output.apiCalls.length}
                                                            </span>
                                                            <span className="details-call-duration">
                                                                {apiCall.duration < 1000
                                                                    ? `${apiCall.duration}ms`
                                                                    : `${(apiCall.duration / 1000).toFixed(1)}s`}
                                                            </span>
                                                        </div>

                                                        {/* REQUEST BOX */}
                                                        <div className="details-request-box">
                                                            <div className="details-section-label">📤 REQUEST</div>
                                                            <pre className="details-json-viewer">
                                                                {JSON.stringify(apiCall.request, null, 2)}
                                                            </pre>
                                                        </div>

                                                        {/* RESPONSE BOX */}
                                                        <div className="details-response-box success">
                                                            <div className="details-section-label">📥 RESPONSE</div>
                                                            <pre className="details-json-viewer">
                                                                {JSON.stringify(apiCall.response, null, 2)}
                                                            </pre>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="details-no-api-calls">
                                                No API call details recorded for this node
                                            </div>
                                        )}

                                        {/* Error Section */}
                                        {!node.success && node.error && (
                                            <div className="details-response-box error">
                                                <div className="details-section-label">❌ ERROR</div>
                                                <pre className="details-json-viewer">{node.error}</pre>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="details-no-data">
                                    No execution details available for this workflow
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
}
