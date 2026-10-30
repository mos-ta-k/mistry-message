import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { api } from '../services/api';
import Loader from './Loader';

export default function UserMessageView({ targetHandle }) {
  const [content, setContent] = useState('');
  const [isAccepting, setIsAccepting] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    try {
      setLoadingStatus(true);
      setError('');
      const data = await api.getPublicStatus(targetHandle);
      setIsAccepting(Boolean(data.isAcceptingMessages));
    } catch (err) {
      console.error('Failed to fetch status:', err);
      setError(err.message || 'Could not verify recipient intake status');
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    setSubmitted(false);
    setContent('');
  }, [targetHandle]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || submitting || !isAccepting) return;

    try {
      setSubmitting(true);
      setError('');
      await api.sendAnonymousMessage(content.trim(), targetHandle);
      setSubmitted(true);
      setContent('');
    } catch (err) {
      setError(err.message || 'Failed to deliver message.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="message-page" style={{ maxWidth: '520px', margin: '48px auto', padding: '0 16px' }}>
      <div className="minimal-card" style={{ padding: '28px 24px' }}>
        {/* Recipient Title & Status Header */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
              {targetHandle ? `Send to @${targetHandle}` : 'Anonymous Message Portal'}
            </span>

            {loadingStatus ? (
              <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                Checking...
              </span>
            ) : isAccepting ? (
              <span className="badge badge-active" style={{ fontSize: '11px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                Accepting Messages
              </span>
            ) : (
              <span className="badge badge-paused" style={{ fontSize: '11px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
                Intake Paused
              </span>
            )}
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.3px', margin: 0 }}>
            {targetHandle ? `Leave a message for @${targetHandle}` : 'Send an anonymous message'}
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', margin: 0 }}>
            No account required. Your message will be sent anonymously.
          </p>
        </div>

        {/* Closed Intake Notice */}
        {!loadingStatus && !isAccepting && (
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '18px',
            fontSize: '13px',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>
              {targetHandle ? `@${targetHandle}` : 'The admin'} is currently not accepting new messages.
            </span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#b91c1c',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Screen */}
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              <CheckCircle2 size={24} color="#166534" />
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
              Message Sent
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>
              Your anonymous message has been delivered to the dashboard.
            </p>

            <button
              onClick={() => setSubmitted(false)}
              className="btn-secondary"
              style={{ width: '100%' }}
            >
              Send Another
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={!isAccepting || submitting}
                placeholder={
                  isAccepting
                    ? "Type your message here..."
                    : "Intake is paused right now."
                }
                className="custom-textarea"
                maxLength={1000}
                rows={5}
                required
              />

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#94a3b8',
                marginTop: '6px'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Lock size={12} /> Confidential & Anonymous
                </span>
                <span>{content.length}/1000</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!isAccepting || !content.trim() || submitting}
              className="btn-primary"
              style={{ width: '100%', padding: '10px' }}
            >
              {submitting ? (
                <>
                  <Loader size={14} />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={14} />
                  Send Anonymous Message
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
