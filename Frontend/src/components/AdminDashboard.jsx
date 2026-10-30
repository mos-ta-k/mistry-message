import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Copy,
  ExternalLink,
  Search,
  AlertCircle,
  Inbox,
  Edit2,
  CheckCheck,
  LayoutGrid,
  List as ListIcon,
  Trash2,
  X
} from 'lucide-react';
import { api } from '../services/api';
import MessageCard from './Cards';
import Loader from './Loader';

export default function AdminDashboard({ adminUser, onUserUpdated, onSessionExpired }) {
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({ total: 0, unread: 0, today: 0 });
  const [isAccepting, setIsAccepting] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'unread', 'read'
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [error, setError] = useState('');
  const [deleteMessageId, setDeleteMessageId] = useState(null);
  const [deletingMessage, setDeletingMessage] = useState(false);

  // Custom Handle Editing
  const [editingHandle, setEditingHandle] = useState(false);
  const [newHandle, setNewHandle] = useState(adminUser?.username || '');
  const [handleUpdating, setHandleUpdating] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getAdminMessages({ status: filterStatus });
      setMessages(data.messages || []);
      setStats(data.stats || { total: 0, unread: 0, today: 0 });
      setIsAccepting(Boolean(data.isAcceptingMessages));
    } catch (err) {
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        if (onSessionExpired) onSessionExpired();
        return;
      }
      setError(err.message || 'Failed to load messages.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  useEffect(() => {
    if (deleteMessageId === null || deletingMessage) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setDeleteMessageId(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteMessageId, deletingMessage]);

  // Toggle Message Intake
  const handleToggleAccepting = async () => {
    if (toggling) return;
    const nextVal = !isAccepting;

    setIsAccepting(nextVal);
    setToggling(true);

    try {
      const res = await api.toggleAcceptingStatus(nextVal);
      setIsAccepting(Boolean(res.isAcceptingMessages));
      showToast(res.isAcceptingMessages ? 'Intake active: Accepting messages' : 'Intake paused: Submissions closed');
    } catch (err) {
      setIsAccepting(!nextVal);
      showToast(`Error: ${err.message}`);
    } finally {
      setToggling(false);
    }
  };

  // Toggle Read
  const handleToggleRead = async (id, currentRead) => {
    try {
      const updatedRead = !currentRead;
      await api.markMessageRead(id, updatedRead);
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, is_read: updatedRead } : m))
      );
      setStats((prev) => ({
        ...prev,
        unread: updatedRead ? Math.max(0, prev.unread - 1) : prev.unread + 1,
      }));
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  // Mark all read
  const handleMarkAllRead = async () => {
    try {
      await api.markAllRead();
      setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })));
      setStats((prev) => ({ ...prev, unread: 0 }));
      showToast('All marked as read');
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  // Delete message
  const handleDeleteMessage = (id) => {
    setDeleteMessageId(id);
  };

  const confirmDeleteMessage = async () => {
    if (deleteMessageId === null || deletingMessage) return;
    try {
      setDeletingMessage(true);
      await api.deleteMessage(deleteMessageId);
      setMessages((prev) => prev.filter((m) => m.id !== deleteMessageId));
      setStats((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
      }));
      setDeleteMessageId(null);
      showToast('Message deleted');
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setDeletingMessage(false);
    }
  };

  // Copy Custom URL
  const currentHandle = adminUser?.username || 'admin';
  const customUrl = `${window.location.origin}/?to=${encodeURIComponent(currentHandle)}`;

  const handleCopyCustomUrl = () => {
    navigator.clipboard.writeText(customUrl);
    showToast('Copied message link to clipboard!');
  };

  // Save New Custom Handle
  const handleSaveHandle = async (e) => {
    e.preventDefault();
    if (!newHandle.trim()) return;

    try {
      setHandleUpdating(true);
      const res = await api.updateAdminHandle(newHandle.trim());
      if (onUserUpdated) onUserUpdated(res.user);
      setEditingHandle(false);
      showToast(`Custom URL updated: /u/${res.user.username}`);
    } catch (err) {
      showToast(`Error: ${err.message}`);
    } finally {
      setHandleUpdating(false);
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (filterStatus === 'unread' && m.is_read) return false;
    if (filterStatus === 'read' && !m.is_read) return false;
    if (searchQuery.trim()) {
      return m.content.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="dashboard-page" style={{ maxWidth: '960px', margin: '32px auto 80px', padding: '0 20px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast">
          <span>{toastMessage}</span>
        </div>
      )}

      {deleteMessageId !== null && (
        <div
          className="confirm-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deletingMessage) {
              setDeleteMessageId(null);
            }
          }}
        >
          <section
            className="confirm-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-message-title"
            aria-describedby="delete-message-description"
          >
            <div className="confirm-dialog-icon">
              <Trash2 size={20} />
            </div>
            <button
              type="button"
              className="confirm-dialog-close"
              aria-label="Cancel delete"
              onClick={() => setDeleteMessageId(null)}
              disabled={deletingMessage}
            >
              <X size={18} />
            </button>
            <h2 id="delete-message-title">Delete this message?</h2>
            <p id="delete-message-description">
              This message will be permanently removed from your inbox. This action cannot be undone.
            </p>
            <div className="confirm-dialog-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeleteMessageId(null)}
                disabled={deletingMessage}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger confirm-delete-button"
                onClick={confirmDeleteMessage}
                disabled={deletingMessage}
              >
                <Trash2 size={15} />
                {deletingMessage ? 'Deleting...' : 'Delete message'}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Top Cards: Custom URL & Intake Toggle */}
      <div className="dashboard-top-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '16px',
        marginBottom: '20px'
      }}>
        {/* Custom Message Sending URL Card */}
        <div className="minimal-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              Your Custom Message URL
            </span>
            <button
              onClick={() => setEditingHandle(!editingHandle)}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Edit2 size={12} />
              {editingHandle ? 'Cancel' : 'Change handle'}
            </button>
          </div>

          {editingHandle ? (
            <form onSubmit={handleSaveHandle} style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <input
                type="text"
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value)}
                placeholder="new_handle"
                className="custom-input"
                style={{ padding: '6px 10px', fontSize: '13px' }}
                required
              />
              <button
                type="submit"
                disabled={handleUpdating}
                className="btn-primary"
                style={{ padding: '6px 12px', fontSize: '13px', flexShrink: 0 }}
              >
                {handleUpdating ? <Loader size={12} /> : 'Save'}
              </button>
            </form>
          ) : (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              fontSize: '13px',
              fontFamily: 'monospace',
              color: '#0f172a'
            }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {customUrl}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                <button
                  onClick={handleCopyCustomUrl}
                  className="btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                  title="Copy Link"
                >
                  <Copy size={13} />
                </button>
                <a
                  href={customUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '12px', textDecoration: 'none' }}
                  title="Open Link in New Tab"
                >
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          )}
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: '6px 0 0' }}>
            Share this link to let anyone send you anonymous messages.
          </p>
        </div>

        {/* Message Reception Toggle Card */}
        <div className="minimal-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                Message Intake Toggle
              </span>
              <span className={isAccepting ? 'badge badge-active' : 'badge badge-paused'} style={{ fontSize: '11px' }}>
                {isAccepting ? 'Open' : 'Paused'}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
              {isAccepting ? 'Visitors can send messages via your link.' : 'Submissions are currently paused.'}
            </p>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '14px',
            paddingTop: '10px',
            borderTop: '1px solid #f1f5f9'
          }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>
              {isAccepting ? 'Accepting Messages' : 'Paused (Disabled)'}
            </span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={isAccepting}
                disabled={toggling}
                onChange={handleToggleAccepting}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      {/* Messages Filter & View Switcher Bar */}
      <div className="dashboard-toolbar" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '16px'
      }}>
        {/* Left: Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            onClick={() => setFilterStatus('all')}
            className={filterStatus === 'all' ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '12px', padding: '5px 10px' }}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilterStatus('unread')}
            className={filterStatus === 'unread' ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '12px', padding: '5px 10px' }}
          >
            Unread ({stats.unread})
          </button>
          <button
            onClick={() => setFilterStatus('read')}
            className={filterStatus === 'read' ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '12px', padding: '5px 10px' }}
          >
            Read
          </button>
        </div>

        {/* Right: Search, View Mode Switcher (Cards vs List), Read All, Refresh */}
        <div className="dashboard-toolbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="dashboard-search" style={{ position: 'relative' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Filter messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="custom-input"
              style={{ paddingLeft: '30px', paddingRight: '10px', paddingTop: '6px', paddingBottom: '6px', fontSize: '12px', width: '160px' }}
            />
          </div>

          {/* View Mode Toggle: Cards vs List */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '2px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0'
          }}>
            <button
              onClick={() => setViewMode('card')}
              style={{
                border: 'none',
                background: viewMode === 'card' ? '#ffffff' : 'transparent',
                color: viewMode === 'card' ? '#0f172a' : '#64748b',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 500,
                boxShadow: viewMode === 'card' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
              }}
              title="Cards Grid View"
            >
              <LayoutGrid size={13} />
              Cards
            </button>

            <button
              onClick={() => setViewMode('list')}
              style={{
                border: 'none',
                background: viewMode === 'list' ? '#ffffff' : 'transparent',
                color: viewMode === 'list' ? '#0f172a' : '#64748b',
                padding: '4px 8px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '12px',
                fontWeight: 500,
                boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
              }}
              title="List View"
            >
              <ListIcon size={13} />
              List
            </button>
          </div>

          {stats.unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="btn-secondary"
              style={{ fontSize: '12px', padding: '5px 10px' }}
              title="Mark all as read"
            >
              <CheckCheck size={13} />
              Read all
            </button>
          )}

          <button
            onClick={loadData}
            className="btn-secondary"
            style={{ fontSize: '12px', padding: '5px 10px' }}
            title="Refresh"
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '12px 14px',
          marginBottom: '16px',
          color: '#b91c1c',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Messages Feed */}
      {loading ? (
        <Loader full message="Loading messages..." />
      ) : filteredMessages.length === 0 ? (
        <div className="minimal-card" style={{ textAlign: 'center', padding: '48px 20px', color: '#64748b' }}>
          <Inbox size={32} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
            {searchQuery ? 'No matching messages' : 'No messages yet'}
          </p>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px' }}>
            {searchQuery ? 'Try adjusting your search query.' : 'Share your custom message URL to start receiving anonymous messages.'}
          </p>
          {!searchQuery && (
            <button onClick={handleCopyCustomUrl} className="btn-secondary" style={{ fontSize: '12px' }}>
              <Copy size={13} /> Copy Your Link
            </button>
          )}
        </div>
      ) : (
        /* Render Messages using Cards.jsx with either 'card' or 'list' layout */
        <div className={viewMode === 'card' ? 'dashboard-message-grid' : 'dashboard-message-list'} style={
          viewMode === 'card'
            ? {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '14px'
              }
            : {
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }
        }>
          {filteredMessages.map((msg) => (
            <MessageCard
              key={msg.id}
              message={msg}
              username={adminUser?.username}
              viewMode={viewMode}
              onToggleRead={handleToggleRead}
              onDelete={handleDeleteMessage}
              onCopy={() => showToast('Message text copied to clipboard!')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
