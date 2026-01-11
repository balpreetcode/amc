import { WorkflowProvider, useWorkflowContext } from './context/WorkflowContext'
import { WorkflowCanvas } from './components/WorkflowCanvas'
import { NodePropertiesPanel } from './components/NodePropertiesPanel'
import { ExecutionHistory } from './components/ExecutionHistory'
import { Templates } from './components/Templates'
import { SaveTemplateModal } from './components/SaveTemplateModal'
import { ApiTokens } from './components/ApiTokens'
import { ApiDocs } from './components/ApiDocs'
import { GlobalConfig } from './components/GlobalConfig'
import { useTemplates } from './hooks/useTemplates'
import { useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import './App.css'

function AppContent() {
  const { execution, runWorkflow, stopWorkflow, workflow, renameWorkflow } = useWorkflowContext();
  const { createTemplate } = useTemplates();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab from current route
  const getActiveTab = () => {
    if (location.pathname === '/history') return 'history';
    if (location.pathname === '/templates') return 'templates';
    if (location.pathname === '/node-config') return 'node-config';
    if (location.pathname === '/api-tokens') return 'api-tokens';
    if (location.pathname === '/api-docs') return 'api-docs';
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

  const [menuOpen, setMenuOpen] = useState(false);

  const handleNavigation = (path: string) => {
    navigate(path);
    setMenuOpen(false);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <div className="hamburger-menu-container">
            <button
              className="hamburger-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            {menuOpen && (
              <>
                <div className="menu-backdrop" onClick={() => setMenuOpen(false)}></div>
                <div className="dropdown-menu">
                  <button
                    className={`menu-item ${activeTab === 'builder' ? 'active' : ''}`}
                    onClick={() => handleNavigation('/')}
                  >
                    <span className="menu-icon">🔧</span>
                    Flow Builder
                  </button>
                  <button
                    className={`menu-item ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => handleNavigation('/history')}
                  >
                    <span className="menu-icon">📜</span>
                    Execution History
                  </button>
                  <button
                    className={`menu-item ${activeTab === 'templates' ? 'active' : ''}`}
                    onClick={() => handleNavigation('/templates')}
                  >
                    <span className="menu-icon">📋</span>
                    Templates
                  </button>
                  <button
                    className={`menu-item ${activeTab === 'node-config' ? 'active' : ''}`}
                    onClick={() => handleNavigation('/node-config')}
                  >
                    <span className="menu-icon">⚙️</span>
                    Node Config
                  </button>
                  <button
                    className={`menu-item ${activeTab === 'api-tokens' ? 'active' : ''}`}
                    onClick={() => handleNavigation('/api-tokens')}
                  >
                    <span className="menu-icon">🔑</span>
                    API & Embed
                  </button>
                  <button
                    className={`menu-item ${activeTab === 'api-docs' ? 'active' : ''}`}
                    onClick={() => handleNavigation('/api-docs')}
                  >
                    <span className="menu-icon">📚</span>
                    API Docs
                  </button>
                </div>
              </>
            )}
          </div>
          <span className="brand-icon">⚡</span>
          <h1>Flow Builder</h1>
        </div>
        <div className="workflow-name-display">
          {isEditingName ? (
            <input
              type="text"
              className="workflow-name-input"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onBlur={() => {
                renameWorkflow(editingName);
                setIsEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  renameWorkflow(editingName);
                  setIsEditingName(false);
                }
                if (e.key === 'Escape') {
                  setEditingName(workflow.name || 'Untitled Workflow');
                  setIsEditingName(false);
                }
              }}
              autoFocus
            />
          ) : (
            <>
              <span className="workflow-name-text">{workflow.name || 'Untitled Workflow'}</span>
              <button
                className="edit-name-btn"
                onClick={() => {
                  setEditingName(workflow.name || 'Untitled Workflow');
                  setIsEditingName(true);
                }}
                title="Edit workflow name"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
            </>
          )}
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
          <Route path="/node-config" element={<GlobalConfig />} />
          <Route path="/api-tokens" element={<ApiTokens />} />
          <Route path="/api-docs" element={<ApiDocs />} />
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
      <WorkflowProvider>
        <AppContent />
      </WorkflowProvider>
    </BrowserRouter>
  )
}

export default App
