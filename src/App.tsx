import { WorkflowProvider, useWorkflowContext } from './context/WorkflowContext'
import { WorkflowCanvas } from './components/WorkflowCanvas'
import { NodePropertiesPanel } from './components/NodePropertiesPanel'
import { ExecutionHistory } from './components/ExecutionHistory'
import { Templates } from './components/Templates'
import { SaveTemplateModal } from './components/SaveTemplateModal'
import { useTemplates } from './hooks/useTemplates'
import  { useState } from 'react'
import './App.css'

function AppContent() {
  const { execution, runWorkflow, stopWorkflow, workflow } = useWorkflowContext();
  const { createTemplate } = useTemplates();
  const [activeTab, setActiveTab] = useState<'builder' | 'history' | 'templates'>('builder');
  const [showSaveModal, setShowSaveModal] = useState(false);

  const handleSaveTemplate = async (name: string, description: string) => {
    try {
      // Get the last execution video URL from history if available
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
      const historyResponse = await fetch(`${BACKEND_URL}/workflow/history`);
      const history = await historyResponse.json();
      const lastVideoUrl = history.length > 0 ? history[0].videoUrl : '';

      await createTemplate({
        name,
        description,
        nodes: workflow.nodes,
        videoPreview: lastVideoUrl,
      });

      alert('Template saved successfully!');
      setActiveTab('templates');
    } catch (err) {
      throw err;
    }
  };

  const saveAsTemplate = () => {
    setShowSaveModal(true);
  };

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
          <button
            className="btn-template"
            onClick={saveAsTemplate}
            disabled={workflow.nodes.length === 0}
          >
            Save As Template
          </button>
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
        <button
          className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          Templates
        </button>
      </div>

      <main className="app-main">
        {activeTab === 'builder' ? (
          <>
            <div className="canvas-holder">
              <WorkflowCanvas />
            </div>
            <NodePropertiesPanel />
          </>
        ) : activeTab === 'history' ? (
          <ExecutionHistory />
        ) : (
          <Templates onNavigateToHistory={() => setActiveTab('history')} />
        )}
      </main>

      {showSaveModal && (
        <SaveTemplateModal
          defaultName={workflow.name}
          onSave={handleSaveTemplate}
          onClose={() => setShowSaveModal(false)}
        />
      )}
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
