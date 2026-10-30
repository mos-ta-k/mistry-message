import React from 'react';
import { Send, Shield, LogOut, Lock } from 'lucide-react';

export default function Navbar({ currentView, setView, adminUser, onLogout }) {
  return (
    <header className="site-header" style={{
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      <div className="site-header-inner" style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Brand */}
        <div 
          onClick={() => {
            // clear custom handle from URL if any
            if (window.location.pathname.startsWith('/u/')) {
              window.history.pushState({}, '', '/');
            }
            setView('user');
          }}
          className="site-brand"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
        >
          <img src="/mistry-logo.svg" alt="" width="34" height="34" />
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', letterSpacing: '-0.3px' }}>
            Mistry
          </span>
        </div>

        {/* Navigation Actions */}
        <div className="site-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setView('user')}
            className={currentView === 'user' ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '13px', padding: '6px 12px' }}
          >
            <Send size={14} />
            Send
          </button>

          <button
            onClick={() => setView('admin')}
            className={currentView === 'admin' ? 'btn-primary' : 'btn-secondary'}
            style={{ fontSize: '13px', padding: '6px 12px' }}
          >
            {adminUser ? <Shield size={14} /> : <Lock size={14} />}
            Admin
          </button>

          {adminUser && (
            <div className="site-user-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px' }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#475569',
                background: '#f1f5f9',
                padding: '4px 8px',
                borderRadius: '6px'
              }}>
                @{adminUser.username || 'admin'}
              </span>

              <button
                onClick={onLogout}
                className="btn-danger"
                style={{ padding: '5px 10px', fontSize: '12px' }}
                title="Log out"
              >
                <LogOut size={13} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
