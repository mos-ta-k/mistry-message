import React, { useEffect, useState } from 'react';
import { Clock, Copy, Check, Eye, EyeOff, Trash2, Share2, X, Download } from 'lucide-react';

const roundedRect = (context, x, y, width, height, radius) => {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
};

const wrapText = (context, text, maxWidth) => {
  const lines = [];
  text.split('\n').forEach((paragraph) => {
    if (!paragraph) {
      lines.push('');
      return;
    }

    let line = '';
    paragraph.split(/\s+/).forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }

      while (context.measureText(line).width > maxWidth) {
        let splitAt = line.length - 1;
        while (splitAt > 1 && context.measureText(line.slice(0, splitAt)).width > maxWidth) {
          splitAt -= 1;
        }
        lines.push(line.slice(0, splitAt));
        line = line.slice(splitAt);
      }
    });
    if (line) lines.push(line);
  });
  return lines;
};

const createShareImage = async (content, username) => {
  const width = 1080;
  const contextCanvas = document.createElement('canvas');
  const measureContext = contextCanvas.getContext('2d');
  if (!measureContext) throw new Error('Image sharing is not available in this browser.');

  const textWidth = 780;
  let fontSize = 48;
  let lines;
  let lineHeight;
  let textHeight;
  let height;

  do {
    measureContext.font = `500 ${fontSize}px "Plus Jakarta Sans", Arial, sans-serif`;
    lines = wrapText(measureContext, content, textWidth);
    lineHeight = fontSize * 1.4;
    textHeight = lines.length * lineHeight;
    height = Math.max(1350, Math.min(1920, textHeight + 660));
    if (textHeight > height - 650 && fontSize > 32) fontSize -= 2;
    else break;
  } while (fontSize >= 32);

  contextCanvas.width = width;
  contextCanvas.height = height;
  const context = contextCanvas.getContext('2d');
  if (!context) throw new Error('Image sharing is not available in this browser.');

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#287A74');
  background.addColorStop(1, '#086288');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.fillStyle = 'rgba(255,255,255,0.08)';
  context.beginPath();
  context.arc(970, 130, 220, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(80, height - 90, 280, 0, Math.PI * 2);
  context.fill();

  const cardX = 84;
  const cardY = 160;
  const cardWidth = width - cardX * 2;
  const cardHeight = height - 320;
  roundedRect(context, cardX, cardY, cardWidth, cardHeight, 34);
  context.fillStyle = '#FBFAF6';
  context.fill();

  try {
    const logo = new Image();
    logo.src = '/mistry-logo.svg';
    await logo.decode();
    context.drawImage(logo, cardX + 58, cardY + 54, 64, 64);
  } catch {
    roundedRect(context, cardX + 58, cardY + 54, 64, 64, 20);
    context.fillStyle = '#EBE2CC';
    context.fill();
    context.fillStyle = '#287A74';
    context.font = '700 32px Arial, sans-serif';
    context.fillText('M', cardX + 78, cardY + 98);
  }

  context.fillStyle = '#287A74';
  context.font = '700 25px "Plus Jakarta Sans", Arial, sans-serif';
  context.fillText('MISTRY MESSAGE', cardX + 144, cardY + 93);

  context.fillStyle = '#086288';
  context.font = '700 22px "Plus Jakarta Sans", Arial, sans-serif';
  context.fillText('A LITTLE MYSTERY NOTE', cardX + 62, cardY + 205);

  const textTop = cardY + 270;
  const textBottom = cardY + cardHeight - 230;
  const availableTextHeight = textBottom - textTop;
  const actualLineHeight = Math.min(lineHeight, availableTextHeight / lines.length);
  context.font = `500 ${fontSize}px "Plus Jakarta Sans", Arial, sans-serif`;
  context.fillStyle = '#193735';
  context.textBaseline = 'top';
  let y = textTop + Math.max(0, (availableTextHeight - actualLineHeight * lines.length) / 2);
  lines.forEach((line) => {
    if (line) context.fillText(line, cardX + 62, y, textWidth);
    y += actualLineHeight;
  });

  context.fillStyle = '#D5C7A7';
  context.fillRect(cardX + 62, cardY + cardHeight - 164, cardWidth - 124, 2);
  context.fillStyle = '#287A74';
  context.font = '700 25px "Plus Jakarta Sans", Arial, sans-serif';
  context.fillText(`SEND ${username ? `@${username}` : 'ME'} A MESSAGE`, cardX + 62, cardY + cardHeight - 116);
  context.fillStyle = '#71817C';
  context.font = '400 20px "Plus Jakarta Sans", Arial, sans-serif';
  context.fillText(`${window.location.host}/?to=${encodeURIComponent(username)}`, cardX + 62, cardY + cardHeight - 73);

  return contextCanvas.toDataURL('image/png');
};

const downloadShareImage = (image, messageId) => {
  const link = document.createElement('a');
  link.href = image;
  link.download = `mistry-message-${messageId}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

function formatTime(isoString) {
  if (!isoString) return { relative: '', formatted: '' };

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  let relative = '';
  if (diffSec < 60) {
    relative = 'Just now';
  } else if (diffMin < 60) {
    relative = `${diffMin}m ago`;
  } else if (diffHrs < 24) {
    relative = `${diffHrs}h ago`;
  } else if (diffDays === 1) {
    relative = 'Yesterday';
  } else {
    relative = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  const formatted = date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return { relative, formatted };
}

export default function MessageCard({
  message,
  username = '',
  viewMode = 'card', // 'card' | 'list'
  onToggleRead,
  onDelete,
  onCopy,
}) {
  const [copied, setCopied] = useState(false);
  const [shareImage, setShareImage] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState('');
  const [shareFeedback, setShareFeedback] = useState('');
  const time = formatTime(message.created_at);
  const shareText = `Someone sent me an anonymous message:\n\n"${message.content}"\n\nSend me one: ${window.location.origin}/?to=${encodeURIComponent(username)}`;

  useEffect(() => {
    if (!shareOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setShareOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shareOpen]);

  const handleOpenShare = async () => {
    setShareOpen(true);
    setShareImage('');
    setSharing(true);
    setShareError('');
    setShareFeedback('');
    try {
      setShareImage(await createShareImage(message.content, username));
    } catch (error) {
      setShareError(error.message || 'Could not create the share image.');
    } finally {
      setSharing(false);
    }
  };

  const handleShare = async () => {
    if (!shareImage) return;
    setShareError('');
    setShareFeedback('');

    try {
      if (typeof navigator.share === 'function') {
        const base64 = shareImage.split(',')[1];
        const imageBytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
        const imageBlob = new Blob([imageBytes], { type: 'image/png' });
        const imageFile = new File([imageBlob], `mistry-message-${message.id}.png`, { type: 'image/png' });
        const shareData = {
          title: 'An anonymous message for me',
          text: shareText,
          files: [imageFile],
        };
        if (typeof navigator.canShare !== 'function' || navigator.canShare({ files: [imageFile] })) {
          await navigator.share(shareData);
          setShareFeedback('Shared successfully.');
          return;
        }

        await navigator.share({ title: shareData.title, text: shareText });
        setShareFeedback('Shared successfully.');
        return;
      }

      downloadShareImage(shareImage, message.id);
      await navigator.clipboard.writeText(shareText);
      setShareFeedback('Image downloaded and share text copied.');
    } catch (error) {
      if (error.name !== 'AbortError') {
        setShareError(error.message || 'Could not share this message.');
      }
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (onCopy) onCopy(message.content);
  };

  const shareDialog = (
    <div
      className="share-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setShareOpen(false);
      }}
    >
      <section
        className="share-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`share-title-${message.id}`}
      >
        <div className="share-dialog-heading">
          <div>
            <span className="eyebrow">Take the mystery public</span>
            <h2 id={`share-title-${message.id}`}>Share this message</h2>
          </div>
          <button
            type="button"
            className="share-close"
            aria-label="Close share dialog"
            onClick={() => setShareOpen(false)}
          >
            <X size={19} />
          </button>
        </div>
        {shareImage ? (
          <img className="share-preview" src={shareImage} alt="Preview of the message share card" />
        ) : (
          <div className="share-preview-loading">
            {sharing ? <span className="spin" /> : <Share2 size={20} />}
            {shareError ? 'Preview unavailable' : 'Preparing your message card...'}
          </div>
        )}
        {shareError && <p className="share-error" role="alert">{shareError}</p>}
        {shareFeedback && <p className="share-feedback" role="status">{shareFeedback}</p>}
        <p className="share-hint">Share the image to your story or download it to post anywhere.</p>
        <div className="share-actions">
          <button
            type="button"
            className="btn-primary share-action-primary"
            onClick={handleShare}
            disabled={!shareImage || sharing}
          >
            <Share2 size={16} /> Share
          </button>
          <button
            type="button"
            className="btn-secondary share-action-secondary"
            onClick={() => downloadShareImage(shareImage, message.id)}
            disabled={!shareImage}
          >
            <Download size={16} /> Save image
          </button>
          <button
            type="button"
            className="btn-secondary share-action-secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareText);
                setShareFeedback('Message and your inbox link copied.');
                setShareError('');
              } catch (error) {
                setShareError(error.message || 'Could not copy the share text.');
              }
            }}
          >
            <Copy size={16} /> Copy text
          </button>
        </div>
      </section>
    </div>
  );

  // --- List View Mode ---
  if (viewMode === 'list') {
    return (
      <>
      <div
        className="minimal-card"
        style={{
          padding: '12px 16px',
          background: message.is_read ? '#ffffff' : '#fcfcfd',
          borderLeft: '1px solid #e6e8e2',
          boxShadow: '0 2px 8px rgba(25, 55, 53, 0.06)',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '14px',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', fontSize: '11px', color: '#64748b' }}>
            <span style={{ fontWeight: 600, color: message.is_read ? '#64748b' : '#0f172a' }}>
              {time.relative}
            </span>
            <span>•</span>
            <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Clock size={11} /> {time.formatted}
            </span>
            {!message.is_read && (
              <span className="badge badge-neutral" style={{ fontSize: '10px', padding: '1px 5px' }}>
                New
              </span>
            )}
          </div>

          <div style={{
            fontSize: '13px',
            color: '#0f172a',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {message.content}
          </div>
        </div>

        {/* Action icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginTop: '2px' }}>
          <button
            onClick={handleCopyText}
            style={{
              background: 'none',
              border: 'none',
              color: copied ? '#166534' : '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px'
            }}
            title={copied ? "Copied!" : "Copy text"}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>

          <button
            onClick={handleOpenShare}
            style={{
              background: 'none',
              border: 'none',
              color: '#287a74',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px'
            }}
            title="Share message"
            aria-label="Share message"
          >
            <Share2 size={14} />
          </button>

          <button
            onClick={() => onToggleRead(message.id, message.is_read)}
            style={{
              background: 'none',
              border: 'none',
              color: message.is_read ? '#94a3b8' : '#0f172a',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px'
            }}
            title={message.is_read ? "Mark unread" : "Mark read"}
          >
            {message.is_read ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>

          <button
            onClick={() => onDelete(message.id)}
            className="btn-danger"
            style={{ padding: '3px 6px' }}
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {shareOpen && shareDialog}
      </>
    );
  }

  // --- Cards (Grid) View Mode ---
  return (
    <>
    <div
      className="minimal-card"
      style={{
        padding: '18px 20px',
        background: message.is_read ? '#ffffff' : '#fcfcfd',
        borderLeft: '1px solid #e6e8e2',
        boxShadow: '0 2px 8px rgba(25, 55, 53, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '150px',
        position: 'relative'
      }}
    >
      <div>
        {/* Card Header: Relative Time, Formatted Time & Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          fontSize: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 600, color: message.is_read ? '#64748b' : '#0f172a' }}>
              {time.relative}
            </span>
            <span style={{ color: '#cbd5e1' }}>•</span>
            <span style={{ color: '#94a3b8', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Clock size={11} /> {time.formatted}
            </span>
          </div>

          {!message.is_read ? (
            <span className="badge badge-neutral" style={{ fontSize: '10px', padding: '1px 6px' }}>
              New
            </span>
          ) : (
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Read
            </span>
          )}
        </div>

        {/* Message Content */}
        <div style={{
          fontSize: '14px',
          color: '#0f172a',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          marginBottom: '16px'
        }}>
          {message.content}
        </div>
      </div>

      {/* Card Action Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '10px',
        borderTop: '1px solid #f1f5f9',
        fontSize: '12px',
        color: '#64748b'
      }}>
        <button
          onClick={handleCopyText}
          style={{
            background: 'none',
            border: 'none',
            color: copied ? '#166534' : '#64748b',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: 0
          }}
          title="Copy message content"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={handleOpenShare}
            className="message-share-button"
            title="Share message"
            aria-label="Share message"
          >
            <Share2 size={15} />
            <span>Share</span>
          </button>

          <button
            onClick={() => onToggleRead(message.id, message.is_read)}
            style={{
              background: 'none',
              border: 'none',
              color: message.is_read ? '#94a3b8' : '#0f172a',
              cursor: 'pointer',
              fontSize: '12px',
              padding: '2px 6px',
              borderRadius: '4px'
            }}
          >
            {message.is_read ? 'Mark unread' : 'Mark read'}
          </button>

          <button
            onClick={() => onDelete(message.id)}
            className="btn-danger"
            style={{ padding: '3px 6px' }}
            title="Delete message"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
    {shareOpen && shareDialog}
    </>
  );
}
