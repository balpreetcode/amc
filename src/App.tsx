import { WorkflowProvider, useWorkflowContext } from './context/WorkflowContext'
import { WorkflowCanvas } from './components/WorkflowCanvas'
import { NodePropertiesPanel } from './components/NodePropertiesPanel'
import { ExecutionHistory } from './components/ExecutionHistory'
import { Templates } from './components/Templates'
import { SaveTemplateModal } from './components/SaveTemplateModal'
import { ApiTokens } from './components/ApiTokens'
import { ApiDocs } from './components/ApiDocs'
import { Videos } from './components/Videos'
import { SessionGate } from './components/SessionGate'
import { useTemplates } from './hooks/useTemplates'
import { useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import './App.css'

function AppContent() {
  const { execution, runWorkflow, stopWorkflow, workflow } = useWorkflowContext();
  const { createTemplate } = useTemplates();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab from current route
  const getActiveTab = () => {
    if (location.pathname === '/history') return 'history';
    if (location.pathname === '/templates') return 'templates';
    if (location.pathname === '/api-tokens') return 'api-tokens';
    if (location.pathname === '/api-docs') return 'api-docs';
    if (location.pathname === '/videos') return 'videos';
    return 'builder';
  };

  const activeTab = getActiveTab();

  const handleSaveTemplate = async (name: string, description: string) => {
    try {
      let videoPreview = '';

      // First, try to get video from current execution results
      const editVideoNode = execution.results.find(
        r => r.nodeType === 'edit_video' && r.success && r.data
      );

      if (editVideoNode && typeof editVideoNode.data === 'object' && editVideoNode.data !== null) {
        const data = editVideoNode.data as { videoUrl?: string };
        videoPreview = data.videoUrl || '';
      }

      // If no video in current execution, get the last video from history
      if (!videoPreview) {
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
        console.log('🚀 Backend URL:', BACKEND_URL);
        const historyResponse = await fetch(`${BACKEND_URL}/workflow/history`);
        const history = await historyResponse.json();
        videoPreview = history.length > 0 && history[0].videoUrl ? history[0].videoUrl : '';
      }

      await createTemplate({
        name,
        description,
        nodes: workflow.nodes,
        videoPreview,
      });

      alert('Template saved successfully!');
      navigate('/templates');
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
            <button
              className="error-badge clickable"
              onClick={() => navigate('/history')}
              title="Click to view execution history"
            >
              {execution.error}
            </button>
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
          onClick={() => navigate('/')}
        >
          Flow Builder
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => navigate('/history')}
        >
          Execution History
        </button>
        <button
          className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => navigate('/templates')}
        >
          Templates
        </button>
        <button
          className={`tab-btn ${activeTab === 'api-tokens' ? 'active' : ''}`}
          onClick={() => navigate('/api-tokens')}
        >
          API & Embed
        </button>
        <button
          className={`tab-btn ${activeTab === 'api-docs' ? 'active' : ''}`}
          onClick={() => navigate('/api-docs')}
        >
          API Docs
        </button>
        <button
          className={`tab-btn ${activeTab === 'videos' ? 'active' : ''}`}
          onClick={() => navigate('/videos')}
        >
          Videos
        </button>
      </div>

      <main className="app-main">
        <Routes>
          <Route path="/" element={
            <>
              <div className="canvas-holder">
                <WorkflowCanvas />
              </div>
              <NodePropertiesPanel />
            </>
          } />
          <Route path="/history" element={<ExecutionHistory />} />
          <Route path="/templates" element={<Templates onNavigateToHistory={() => navigate('/history')} />} />
          <Route path="/api-tokens" element={<ApiTokens />} />
          <Route path="/api-docs" element={<ApiDocs />} />
          <Route path="/videos" element={<Videos />} />
        </Routes>
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
    <BrowserRouter>
      <SessionGate>
        <WorkflowProvider>
          <AppContent />
        </WorkflowProvider>
      </SessionGate>
    </BrowserRouter>
  )
}

export default App
