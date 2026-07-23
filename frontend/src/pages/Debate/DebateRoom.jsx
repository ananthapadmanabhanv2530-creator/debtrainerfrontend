import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebate } from '../../hooks/useDebate';
import { useDebateTimer } from '../../hooks/useDebateTimer';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import GradualBlur from '../../components/reactbits/GradualBlur';
import Dock from '../../components/reactbits/Dock';
import { debateService } from '../../services/debateService';
import {
  Send, Square, Clock, Shield, Swords, Trophy, ArrowLeft,
  Mic, MicOff, Lightbulb, Pause, Play, Zap, X, AlertTriangle, Sparkles,
} from 'lucide-react';

const HINT_TYPES = [
  { id: 'keyword', label: '🔑 Keyword' },
  { id: 'outline', label: '📋 Outline' },
  { id: 'counterArgument', label: '⚔️ Counter-Arg' },
  { id: 'evidence', label: '📊 Evidence' },
  { id: 'socratic', label: '❓ Socratic' },
];

const DebateRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Gemini speech auto-correct state
  const [isPolishingSpeech, setIsPolishingSpeech] = useState(false);

  // Hint UI state
  const [showHintMenu, setShowHintMenu] = useState(false);
  // ... (rest omitted until handleSpeechToggle)


  // Lightning round tracking
  const [lightningRound, setLightningRound] = useState(1);
  const [isUserTurn, setIsUserTurn] = useState(true);

  const {
    debate,
    messages,
    loading,
    sending,
    error,
    elapsedTime,
    hintsUsed,
    currentHint,
    hintLoading,
    sendMessage,
    endDebate,
    loadDebate,
    requestHint,
    dismissHint,
  } = useDebate();

  // Config from the debate
  const config = debate?.config || {};
  const timerEnabled = config.timer?.enabled || false;
  const lightningEnabled = config.lightning?.enabled || false;
  const speechEnabled = config.speech?.enabled || false;
  const hintsEnabled = config.hints?.enabled || false;
  const lockInEnabled = config.lockIn?.enabled || false;
  const suddenDeath = config.lightning?.suddenDeath || false;
  const maxHints = config.hints?.maxHints || 3;

  // Timer hook (works for both timer and lightning modes)
  const debateTimer = useDebateTimer(config);

  // Speech recognition hook
  const speech = useSpeechRecognition(config.speech?.language || 'en-US');

  useEffect(() => {
    if (id) {
      loadDebate(parseInt(id));
    }
  }, [id]);

  // Start timer when debate loads as active
  useEffect(() => {
    if (debate?.status === 'active' && (timerEnabled || lightningEnabled)) {
      debateTimer.start();
    }
  }, [debate?.status, timerEnabled, lightningEnabled]);

  // Lock-in mode: prevent navigation & handle fullscreen
  useEffect(() => {
    if (!lockInEnabled || debate?.status !== 'active') return;

    if (config.lockIn?.fullscreen && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }

    const handleBeforeUnload = (e) => {
      if (config.lockIn?.exitConfirmation) {
        e.preventDefault();
        e.returnValue = 'You have an active debate. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [lockInEnabled, debate?.status, config.lockIn?.exitConfirmation, config.lockIn?.fullscreen]);

  // Lightning: auto-end on time-up (sudden death — immediate)
  useEffect(() => {
    debateTimer.setOnTimeUp(() => {
      if (lightningEnabled && suddenDeath && isUserTurn) {
        // Sudden death: auto-submit whatever is typed, or end debate
        if (input.trim()) {
          handleSend();
        } else {
          handleEndDebate(true);
        }
      }
    });
  }, [lightningEnabled, suddenDeath, isUserTurn, input]);

  // Lightning: reset timer on each turn
  useEffect(() => {
    if (lightningEnabled && debate?.status === 'active' && !sending) {
      debateTimer.resetTurn();
      setIsUserTurn(true);
    }
  }, [messages.length]);

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
    const msg = (input || speech.transcript).trim();
    if (!msg || sending) return;

    setInput('');
    speech.resetTranscript();
    if (speech.isListening) speech.stopListening();
    if (textareaRef.current) textareaRef.current.style.height = '44px';

    if (lightningEnabled) {
      setIsUserTurn(false);
    }

    try {
      await sendMessage(msg);
      if (lightningEnabled) {
        setLightningRound((prev) => prev + 1);
      }
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

  const handleEndDebate = async (force = false) => {
    if (!force && config.lockIn?.exitConfirmation) {
      if (!window.confirm('Are you sure you want to end this debate? Your performance will be evaluated.')) {
        return;
      }
    } else if (!force) {
      if (!window.confirm('Are you sure you want to end this debate? Your performance will be evaluated.')) {
        return;
      }
    }

    debateTimer.stop();
    try {
      await endDebate();
      navigate(`/debate/${id}/result`);
    } catch (err) {
      console.error('End failed:', err);
    }
  };

  const handleTextareaInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = '44px';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const handleSpeechToggle = async () => {
    if (speech.isListening) {
      speech.stopListening();
      const rawText = speech.transcript.trim();
      if (!rawText) return;

      setIsPolishingSpeech(true);
      try {
        const res = await debateService.correctSpeech(rawText, debate?.topic);
        const polishedText = res.corrected || rawText;
        setInput((prev) => (prev ? prev + ' ' + polishedText : polishedText).trim());

        if (suddenDeath) {
          setTimeout(() => handleSend(), 100);
        }
      } catch (err) {
        console.warn('Speech polish fallback:', err);
        setInput((prev) => (prev ? prev + ' ' + rawText : rawText).trim());
      } finally {
        setIsPolishingSpeech(false);
      }
    } else {
      speech.startListening();
    }
  };

  const handleHintRequest = async (hintType) => {
    setShowHintMenu(false);
    await requestHint(hintType);
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
  const hintsRemaining = maxHints - hintsUsed;

  // Available hint types based on config
  const availableHintTypes = HINT_TYPES.filter(
    (t) => !config.hints?.types || config.hints.types[t.id]
  );

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
          <span>
            {timerEnabled || lightningEnabled
              ? formatTime(debateTimer.timeRemaining)
              : formatTime(elapsedTime)}
          </span>
        </div>
      ),
      label: timerEnabled
        ? debateTimer.currentRoundLabel
        : lightningEnabled
        ? `Round ${lightningRound}`
        : 'Time Elapsed',
      onClick: () => {},
    },
    {
      icon: <Square size={18} />,
      label: 'End Debate',
      onClick: () => handleEndDebate(),
      className: messages.length < 2 ? 'dock-item-disabled' : '',
    },
  ];

  // Timer warning class
  const timerWarningClass =
    (timerEnabled || lightningEnabled) && debateTimer.warningLevel !== 'normal'
      ? `timer-${debateTimer.warningLevel}`
      : '';

  return (
    <div className={`debate-room ${lockInEnabled ? 'lockin-mode' : ''}`}>
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
            {lightningEnabled && (
              <span className="lightning-badge">
                <Zap size={12} /> Lightning
              </span>
            )}
          </div>
        </div>

        {/* Header actions */}
        <div className="debate-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {!isCompleted && (
            <div className={`timer ${timerWarningClass}`}>
              <div className="timer-dot" />
              <Clock size={14} />
              {timerEnabled || lightningEnabled
                ? formatTime(debateTimer.timeRemaining)
                : formatTime(elapsedTime)}
            </div>
          )}

          {/* Pause/Resume for timer mode */}
          {!isCompleted && timerEnabled && config.timer?.pauseEnabled && (
            <motion.button
              className="btn btn-ghost btn-sm"
              onClick={() => (debateTimer.isPaused ? debateTimer.resume() : debateTimer.pause())}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {debateTimer.isPaused ? <Play size={14} /> : <Pause size={14} />}
            </motion.button>
          )}

          {!isCompleted && (
            <motion.button
              className="btn btn-danger btn-sm debate-header-btn-desktop"
              onClick={() => handleEndDebate()}
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

      {/* Lightning countdown bar */}
      {!isCompleted && lightningEnabled && (
        <motion.div
          className={`lightning-bar ${debateTimer.warningLevel}`}
          initial={{ scaleX: 1 }}
        >
          <motion.div
            className="lightning-bar-fill"
            animate={{ scaleX: debateTimer.progress }}
            transition={{ duration: 0.3 }}
          />
          <div className="lightning-bar-info">
            <span>{isUserTurn ? '🎤 Your Turn' : '🤖 AI Responding...'}</span>
            <span>Round {lightningRound}{config.lightning?.numberOfRounds ? ` / ${config.lightning.numberOfRounds}` : ''}</span>
          </div>
        </motion.div>
      )}

      {/* Timer warning alert */}
      <AnimatePresence>
        {debateTimer.activeWarning && (timerEnabled || lightningEnabled) && (
          <motion.div
            className="timer-warning-alert"
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
          >
            <AlertTriangle size={16} />
            {debateTimer.activeWarning}s remaining!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint panel */}
      <AnimatePresence>
        {currentHint && (
          <motion.div
            className="hint-panel"
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: 'spring', damping: 25 }}
          >
            <div className="hint-panel-header">
              <Lightbulb size={16} />
              <span>Hint ({currentHint.type})</span>
              <button className="hint-panel-close" onClick={dismissHint}>
                <X size={14} />
              </button>
            </div>
            <div className="hint-panel-body">{currentHint.text}</div>
          </motion.div>
        )}
      </AnimatePresence>

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
          {/* Speech indicator */}
          {speechEnabled && speech.isListening && (
            <motion.div
              className="speech-live-bar"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="speech-pulse" />
              <span className="speech-live-text">
                {speech.transcript || speech.interimTranscript || 'Listening...'}
              </span>
              <span className="speech-interim">{speech.interimTranscript}</span>
            </motion.div>
          )}

          {/* Gemini Auto-Correcting Speech Indicator */}
          {isPolishingSpeech && (
            <motion.div
              className="speech-live-bar"
              style={{ background: 'var(--primary-glow)', borderColor: 'var(--primary)' }}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Sparkles size={14} style={{ color: 'var(--primary-light)' }} />
              <span className="speech-live-text" style={{ color: 'var(--primary-light)' }}>
                Gemini AI auto-correcting speech transcript...
              </span>
            </motion.div>
          )}

          <div className="debate-input-row">
            {/* Hint button */}
            {hintsEnabled && !isCompleted && (
              <div className="hint-btn-wrap">
                <motion.button
                  className="btn btn-ghost btn-icon hint-trigger"
                  onClick={() => setShowHintMenu(!showHintMenu)}
                  disabled={hintLoading || hintsRemaining <= 0}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title={`${hintsRemaining} hints remaining`}
                >
                  <Lightbulb size={18} />
                  {hintsRemaining > 0 && (
                    <span className="hint-badge">{hintsRemaining}</span>
                  )}
                </motion.button>

                {/* Hint type menu */}
                <AnimatePresence>
                  {showHintMenu && (
                    <motion.div
                      className="hint-menu"
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    >
                      {availableHintTypes.map((type) => (
                        <button
                          key={type.id}
                          className="hint-menu-item"
                          onClick={() => handleHintRequest(type.id)}
                          disabled={hintLoading}
                        >
                          {type.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Mic button */}
            {speechEnabled && (
              speech.isSupported ? (
                <motion.button
                  className={`btn btn-ghost btn-icon mic-btn ${speech.isListening ? 'recording' : ''}`}
                  onClick={handleSpeechToggle}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title={speech.isListening ? 'Stop recording' : 'Start recording'}
                >
                  {speech.isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </motion.button>
              ) : (
                <button
                  className="btn btn-ghost btn-icon mic-btn"
                  disabled
                  style={{ opacity: 0.4, cursor: 'not-allowed' }}
                  title="Speech-to-text is not natively supported in Firefox. Please use Chrome, Edge, or Safari for voice input."
                >
                  <MicOff size={18} />
                </button>
              )
            )}

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
              disabled={!input.trim() && !speech.transcript.trim() || sending}
              style={{ height: 44, width: 44 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Send size={18} />
            </motion.button>
          </div>
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
