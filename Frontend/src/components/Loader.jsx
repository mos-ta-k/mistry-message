import React from 'react';

export default function Loader({ size = 20, message = '', full = false, color = '#0f172a' }) {
  const content = (
    <div style={{
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    }}>
      <svg
        className="spin"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ color }}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="31.415, 31.415"
          style={{ opacity: 0.2 }}
        />
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="15.7, 47.1"
          style={{ opacity: 0.9 }}
        />
      </svg>
      {message && (
        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
          {message}
        </span>
      )}
    </div>
  );

  if (full) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        width: '100%'
      }}>
        {content}
      </div>
    );
  }

  return content;
}
