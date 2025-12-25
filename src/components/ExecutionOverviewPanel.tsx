import type { WorkflowNodeData } from '../types/nodes';
import { getNodeTypeConfig } from '../types/nodes';
import './NodePropertiesPanel.css';

interface ExecutionOverviewPanelProps {
  node: WorkflowNodeData | null;
  onRerunNode?: (nodeId: string) => void;
  onContinueFromNode?: (nodeId: string) => void;
}

export default function ExecutionOverviewPanel({ 
  node, 
  onRerunNode, 
  onContinueFromNode 
}: ExecutionOverviewPanelProps) {
  if (!node) {
    return (
      <aside className="properties-panel empty">
        <div className="empty-state">
          <span className="empty-icon">📊</span>
          <p>Select a node to view execution details</p>
        </div>
      </aside>
    );
  }

  const nodeConfig = getNodeTypeConfig(node.type);

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  const getStatusBadge = () => {
    const statusClasses = {
      not_run: 'status-not-run',
      running: 'status-running',
      completed: 'status-completed',
      error: 'status-error',
      mocked: 'status-mocked'
    };

    const statusLabels = {
      not_run: 'Not Run',
      running: '⚡ Running',
      completed: '✓ Completed',
      error: '✗ Error',
      mocked: '🎭 Mocked'
    };

    return (
      <span className={`status-badge ${statusClasses[node.status]}`}>
        {statusLabels[node.status]}
      </span>
    );
  };

  const showRerunActions = node.status === 'completed' || node.status === 'error' || node.status === 'mocked';

  return (
    <aside className="properties-panel">
      <div className="panel-header">
        <div className="node-type-badge">
          <span className="type-icon">{nodeConfig.icon}</span>
          <span className="type-label">{nodeConfig.label}</span>
        </div>
        <h3>Execution Overview</h3>
      </div>

      <div className="panel-content">
        <div className="form-group">
          <label>Node</label>
          <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{node.title}</div>
        </div>

        <div className="form-group">
          <label>Status</label>
          <div>{getStatusBadge()}</div>
        </div>

        <div className="section-title">Timing</div>
        
        <div className="form-group">
          <label>Start Time</label>
          <div style={{ fontSize: '0.875rem' }}>{formatTimestamp(node.executionMeta?.startTime)}</div>
        </div>

        <div className="form-group">
          <label>End Time</label>
          <div style={{ fontSize: '0.875rem' }}>{formatTimestamp(node.executionMeta?.endTime)}</div>
        </div>

        <div className="form-group">
          <label>Duration</label>
          <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{formatDuration(node.executionMeta?.duration)}</div>
        </div>

        <div className="form-group">
          <label>Retry Count</label>
          <div style={{ fontSize: '0.875rem' }}>{node.executionMeta?.retryCount || 0}</div>
        </div>

        {node.executionMeta?.error && (
          <>
            <div className="section-title">Error Details</div>
            <div className="form-group">
              <div style={{
                padding: '0.75rem',
                background: '#FEE2E2',
                border: '1px solid #FCA5A5',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                color: '#DC2626'
              }}>
                {node.executionMeta.error}
              </div>
            </div>
          </>
        )}

        {node.executionMeta?.inputs && Object.keys(node.executionMeta.inputs).length > 0 && (
          <>
            <div className="section-title">Node Inputs (Resolved)</div>
            <div className="form-group">
              <div style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                <pre style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-primary)',
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                  fontFamily: 'Monaco, Consolas, monospace'
                }}>
                  {JSON.stringify(node.executionMeta.inputs, null, 2)}
                </pre>
              </div>
            </div>
          </>
        )}

        {node.executionMeta?.outputs && Object.keys(node.executionMeta.outputs).length > 0 && (
          <>
            <div className="section-title">Node Outputs</div>
            <div className="form-group">
              <div style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                <pre style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-primary)',
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                  fontFamily: 'Monaco, Consolas, monospace'
                }}>
                  {JSON.stringify(node.executionMeta.outputs, null, 2)}
                </pre>
              </div>
            </div>
          </>
        )}

        {node.mockOutput?.enabled && (
          <>
            <div className="section-title">Mock Output Data</div>
            <div className="form-group">
              <div style={{
                background: '#F3E8FF',
                border: '1px solid #C084FC',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                <pre style={{
                  fontSize: '0.75rem',
                  color: '#7C3AED',
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                  fontFamily: 'Monaco, Consolas, monospace'
                }}>
                  {JSON.stringify(node.mockOutput.data, null, 2)}
                </pre>
              </div>
            </div>
          </>
        )}

        {showRerunActions && (
          <>
            <div className="section-title">Actions</div>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                onClick={() => onRerunNode?.(node.id)}
                style={{
                  width: '100%',
                  padding: '0.625rem 1rem',
                  background: '#3B82F6',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#2563EB'}
                onMouseOut={(e) => e.currentTarget.style.background = '#3B82F6'}
              >
                Rerun This Node
              </button>
              <button
                onClick={() => onContinueFromNode?.(node.id)}
                style={{
                  width: '100%',
                  padding: '0.625rem 1rem',
                  background: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#059669'}
                onMouseOut={(e) => e.currentTarget.style.background = '#10B981'}
              >
                Continue From This Node
              </button>
            </div>
          </>
        )}
      </div>

      <div className="panel-footer">
        <div className="node-stats">
          <div className="stat">
            <span className="stat-label">Provider:</span>
            <span className="stat-value">{node.provider}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Estimated Time:</span>
            <span className="stat-value">{node.estimatedTime}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
