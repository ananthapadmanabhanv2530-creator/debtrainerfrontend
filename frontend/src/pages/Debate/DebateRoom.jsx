import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDebate } from '../../hooks/useDebate';
import GradualBlur from '../../components/reactbits/GradualBlur';
import Dock from '../../components/reactbits/Dock';
import { Send, Square, Clock, Shield, Swords, Trophy, ArrowLeft } from 'lucide-react';

const DebateRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const {
    debate,
    messages,
    loading,
    sending,
    error,
    elapsedTime,
    sendMessage,
    endDebate,
    loadDebate,
  } = useDebate();

  useEffect(() => {
    if (id) {
      loadDebate(parseInt(id));
    }
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const msg = input.trim();
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = '44px';
    try {
      await sendMessage(msg);
    } catch (err) {
      console.error('Send failed:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEndDebate = async () => {
    if (window.confirm('Are you sure you want to end this debate? Your performance will be evaluated.')) {
      try {
        await endDebate();
        navigate(`/debate/${id}/result`);
      } catch (err) {
        console.error('End failed:', err);
      }
    }
  };

  const handleTextareaInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = '44px';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  if (loading && !debate) {
    return (
      <div className="loading-screen" style={{ minHeight: 'auto', paddingTop: 100 }}>
        <div className="loading-spinner" />
        <p style={{ color: 'var(--fg-secondary)' }}>Loading debate...</p>
      </div>
    );
  }

  if (!debate) {
    return (
      <div className="empty-state">
        <h3>Debate not found</h3>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const isCompleted = debate.status === 'completed';

  // Dock items for completed debate
  const completedDockItems = [
    { icon: <ArrowLeft size={18} />, label: 'Dashboard', onClick: () => navigate('/dashboard') },
    { icon: <Trophy size={18} />, label: 'View Results', onClick: () => navigate(`/debate/${id}/result`) },
    { icon: <Swords size={18} />, label: 'New Debate', onClick: () => navigate('/debate/new') },
  ];

  // Dock items for active debate
  const activeDockItems = [
    {
      icon: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}>
          <Clock size={14} />
          <span>{formatTime(elapsedTime)}</span>
        </div>
      ),
      label: 'Time Elapsed',
      onClick: () => {},
    },
    {
      icon: <Square size={18} />,
      label: 'End Debate',
      onClick: handleEndDebate,
      className: messages.length < 2 ? 'dock-item-disabled' : '',
    },
  ];

  return (
    <div className="debate-room">
      {/* Header */}
      <div className="debate-header">
        <div className="debate-header-info">
          <h2>{debate.topic}</h2>
          <div className="debate-header-meta">
            <span>
              <Shield size={12} style={{ marginRight: 4 }} />
              You: {debate.userSide === 'support' ? 'Supporting' : 'Opposing'}
            </span>
            <span>
              <Swords size={12} style={{ marginRight: 4 }} />
              AI: {debate.aiSide === 'support' ? 'Supporting' : 'Opposing'}
            </span>
            <span style={{ textTransform: 'capitalize' }}>{debate.difficulty}</span>
          </div>
        </div>

        {/* Mobile fallback: keep buttons in header for small screens */}
        <div className="debate-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!isCompleted && (
            <div className="timer">
              <div className="timer-dot" />
              <Clock size={14} />
              {formatTime(elapsedTime)}
            </div>
          )}
          {!isCompleted && (
            <motion.button
              className="btn btn-danger btn-sm debate-header-btn-desktop"
              onClick={handleEndDebate}
              disabled={loading || messages.length < 2}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ display: 'none' }}
            >
              <Square size={14} /> End Debate
            </motion.button>
          )}
          {isCompleted && (
            <button
              className="btn btn-primary btn-sm debate-header-btn-desktop"
              onClick={() => navigate(`/debate/${id}/result`)}
              style={{ display: 'none' }}
            >
              View Results
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="debate-messages" style={{ position: 'relative' }}>
        <GradualBlur
          position="top"
          height="3rem"
          strength={2}
          divCount={4}
          curve="bezier"
          zIndex={5}
        />

        {messages.map((msg, index) => (
          <motion.div
            key={index}
            className={`message-bubble ${msg.role}`}
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
              delay: index === messages.length - 1 ? 0.05 : 0,
            }}
          >
            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.message}</div>
            {msg.createdAt && (
              <div className="message-meta">
                {new Date(msg.createdAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            )}
          </motion.div>
        ))}

        {/* Typing indicator */}
        {sending && (
          <motion.div
            className="typing-indicator"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="typing-dot" />
            <div className="typing-dot" />
            <div className="typing-dot" />
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!isCompleted && (
        <div className="debate-input">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder="Present your argument..."
            rows={1}
            disabled={sending}
          />
          <motion.button
            className="btn btn-primary btn-icon"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            style={{ height: 44, width: 44 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Send size={18} />
          </motion.button>
        </div>
      )}

      {/* Dock — floating at bottom center */}
      {isCompleted && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, zIndex: 20 }}>
          <Dock
            items={completedDockItems}
            panelHeight={56}
            baseItemSize={44}
            magnification={64}
          />
        </div>
      )}

      {error && (
        <motion.div
          className="error-message"
          style={{ margin: '0 24px 16px' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {error}
        </motion.div>
      )}
    </div>
  );
};

export default DebateRoom;
