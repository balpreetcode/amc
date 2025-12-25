import { WorkflowProvider, useWorkflowContext } from './context/WorkflowContext'
import { WorkflowCanvas } from './components/WorkflowCanvas'
import { NodePropertiesPanel } from './components/NodePropertiesPanel'
import ExecutionOverviewPanel from './components/ExecutionOverviewPanel'
import { ExecutionHistory } from './components/ExecutionHistory'
import { useState } from 'react'
import './App.css'

function AppContent() {
  const { execution, runWorkflow, stopWorkflow, workflow, selectedNodeId, rerunNode, continueFromNode, loadWorkflowFromHistory, clearExecutionState } = useWorkflowContext();
  const [activeTab, setActiveTab] = useState<'builder' | 'history'>('builder');

  const selectedNode = workflow.nodes.find(n => n.id === selectedNodeId) || null;
  const showExecutionPanel = execution.isRunning && selectedNode && selectedNode.status !== 'not_run';

  const handleLoadExecution = async (workflowId: string) => {
    await loadWorkflowFromHistory(workflowId);
    setActiveTab('builder');
  };

  const hasExecutionState = workflow.nodes.some(n => n.status !== 'not_run');

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-icon">⚡</span>
          <h1>Flow Builder</h1>
        </div>
        <div className="header-actions">
          {execution.error && (
            <span className="error-badge">{execution.error}</span>
          )}
          {hasExecutionState && !execution.isRunning && (
            <button className="btn-secondary" onClick={clearExecutionState}>
              Clear Execution State
            </button>
          )}
          {execution.isRunning ? (
            <button className="btn-danger" onClick={stopWorkflow}>
              ⏹ Stop
            </button>
          ) : (
            <button
              className="btn-primary"
              onClick={runWorkflow}
              disabled={workflow.nodes.length === 0}
            >
              ▶ Run Workflow
            </button>
          )}
        </div>
      </header>

      <div className="sub-header">
        <button
          className={`tab-btn ${activeTab === 'builder' ? 'active' : ''}`}
          onClick={() => setActiveTab('builder')}
        >
          Flow Builder
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Execution History
        </button>
      </div>

      <main className="app-main">
        {activeTab === 'builder' ? (
          <>
            <div className="canvas-holder">
              <WorkflowCanvas />
            </div>
            {showExecutionPanel ? (
              <ExecutionOverviewPanel
                node={selectedNode}
                onRerunNode={rerunNode}
                onContinueFromNode={continueFromNode}
              />
            ) : (
              <NodePropertiesPanel />
            )}
          </>
        ) : (
          <ExecutionHistory onLoadExecution={handleLoadExecution} />
        )}
      </main>
    </div>
  )
}

function App() {
  return (
    <WorkflowProvider>
      <AppContent />
    </WorkflowProvider>
  )
}

export default App
