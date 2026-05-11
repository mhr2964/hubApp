import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LoginForm from './LoginForm';
import LinkForm from './admin/LinkForm';
import LinkList from './admin/LinkList';
import ProjectForm from './admin/ProjectForm';
import ProjectList from './admin/ProjectList';
import './AdminPage.css';
import './admin/admin.css';

export default function AdminPage() {
  const [authed, setAuthed] = useState(null);

  const checkAuth = () => {
    const controller = new AbortController();

    fetch('/api/auth/me', { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('auth check failed');
        return res.json();
      })
      .then(data => setAuthed(data.authed))
      .catch(err => {
        if (err.name !== 'AbortError') setAuthed(false);
      });

    return controller;
  };

  useEffect(() => {
    const controller = checkAuth();
    return () => controller.abort();
  }, []);

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' })
      .then(res => {
        if (!res.ok) throw new Error('logout failed');
        return res.json();
      })
      .then(() => setAuthed(false))
      .catch(() => setAuthed(false));
  };

  if (authed === null) {
    return (
      <div className="admin-page">
        <p className="status">loading...</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="admin-page">
        <div className="admin-card">
          <LoginForm onAuthed={() => setAuthed(true)} />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-card admin-card--wide">
        <header className="admin-header">
          <h1 className="admin-title">hub admin</h1>
          <button type="button" className="admin-logout" onClick={handleLogout}>
            log out
          </button>
        </header>
        <AdminTabs />
        <Link to="/" className="admin-back">
          ← back to gallery
        </Link>
      </div>
    </div>
  );
}

function AdminTabs() {
  const [activeTab, setActiveTab] = useState('links');

  const handleTabChange = tab => {
    setActiveTab(tab);
  };

  return (
    <div className="admin-section">
      <div className="admin-tabs">
        <button
          type="button"
          className={`admin-tab${activeTab === 'links' ? ' active' : ''}`}
          onClick={() => handleTabChange('links')}
        >
          links
        </button>
        <button
          type="button"
          className={`admin-tab${activeTab === 'projects' ? ' active' : ''}`}
          onClick={() => handleTabChange('projects')}
        >
          projects
        </button>
      </div>

      {activeTab === 'links' && <LinkManager />}
      {activeTab === 'projects' && <ProjectManager />}
    </div>
  );
}

function LinkManager() {
  const [mode, setMode] = useState('list');
  const [editingLink, setEditingLink] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSave = () => {
    setRefreshKey(k => k + 1);
    setMode('list');
    setEditingLink(null);
  };

  const handleCancel = () => {
    setMode('list');
    setEditingLink(null);
  };

  const handleEdit = link => {
    setEditingLink(link);
    setMode('edit');
  };

  const handleNewLink = () => {
    setEditingLink(null);
    setMode('create');
  };

  return (
    <>
      <div className="admin-section-header">
        <span className="admin-section-title">
          {mode === 'create' ? 'new link' : mode === 'edit' ? 'edit link' : 'all links'}
        </span>
        {mode === 'list' && (
          <button
            type="button"
            className="admin-new-btn"
            onClick={handleNewLink}
          >
            + new link
          </button>
        )}
      </div>

      {mode === 'list' && (
        <LinkList onEdit={handleEdit} refreshKey={refreshKey} />
      )}

      {(mode === 'create' || mode === 'edit') && (
        <LinkForm
          link={editingLink}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}

function ProjectManager() {
  const [mode, setMode] = useState('list');
  const [editingProject, setEditingProject] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSave = () => {
    setRefreshKey(k => k + 1);
    setMode('list');
    setEditingProject(null);
  };

  const handleCancel = () => {
    setMode('list');
    setEditingProject(null);
  };

  const handleEdit = project => {
    setEditingProject(project);
    setMode('edit');
  };

  const handleNewProject = () => {
    setEditingProject(null);
    setMode('create');
  };

  return (
    <>
      <div className="admin-section-header">
        <span className="admin-section-title">
          {mode === 'create' ? 'new project' : mode === 'edit' ? 'edit project' : 'all projects'}
        </span>
        {mode === 'list' && (
          <button
            type="button"
            className="admin-new-btn"
            onClick={handleNewProject}
          >
            + new project
          </button>
        )}
      </div>

      {mode === 'list' && (
        <ProjectList onEdit={handleEdit} refreshKey={refreshKey} />
      )}

      {(mode === 'create' || mode === 'edit') && (
        <ProjectForm
          project={editingProject}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}
