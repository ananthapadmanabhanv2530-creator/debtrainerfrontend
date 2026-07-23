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
  Mic, MicOff, Lightbulb, Pause, Play, Zap, X, AlertTriangle, Sparkles, Flag,
} from 'lucide-react';import { useState, useEffect, useRef, useCallback } from 'react';
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
  Mic, MicOff, Lightbulb, Pause, Play, Zap, X, AlertTriangle, Sparkles, Flag,
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


  const [lightningRound, setLightningRound] = useState(1);
  const [isUserTurn, setIsUserTurn] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);

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

  const [showQuitModal, setShowQuitModal] = useState(false);
  const [quitCountdown, setQuitCountdown] = useState(15);
  const quitIntervalRef = useRef(null);

  const executeEndDebate = useCallback(async () => {
    if (quitIntervalRef.current) {
      clearInterval(quitIntervalRef.current);
      quitIntervalRef.current = null;
    }
    setShowQuitModal(false);
    debateTimer.stop();
    setIsEvaluating(true);
    try {
      await endDebate();
      navigate(`/debate/${id}/result`);
    } catch (err) {
      console.error('End failed:', err);
    } finally {
      setIsEvaluating(false);
    }
  }, [debateTimer, endDebate, id, navigate]);

  const handleEndDebate = (force = false) => {
    if (force) {
      executeEndDebate();
      return;
    }

    if (debateTimer.isRunning) {
      debateTimer.pause();
    }

    setQuitCountdown(15);
    setShowQuitModal(true);

    if (quitIntervalRef.current) {
      clearInterval(quitIntervalRef.current);
    }

    quitIntervalRef.current = setInterval(() => {
      setQuitCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(quitIntervalRef.current);
          quitIntervalRef.current = null;
          executeEndDebate();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCancelQuit = () => {
    if (quitIntervalRef.current) {
      clearInterval(quitIntervalRef.current);
      quitIntervalRef.current = null;
    }
    setShowQuitModal(false);
    setQuitCountdown(15);
    if (!debateTimer.isRunning && timerEnabled) {
      debateTimer.resume();
    }
  };

  useEffect(() => {
    return () => {
      if (quitIntervalRef.current) {
        clearInterval(quitIntervalRef.current);
      }
    };
  }, []);

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

  if (isEvaluating) {
    return (
      <div className="loading-screen" style={{ minHeight: 'auto', paddingTop: 120, flexDirection: 'column', gap: 16 }}>
        <div className="loading-spinner" />
        <div style={{ color: 'var(--primary-light)', fontSize: 18, fontWeight: 600 }}>
          ✨ AI Judge evaluating your debate performance...
        </div>
        <p style={{ color: 'var(--fg-secondary)', fontSize: 14 }}>
          Analyzing argument logic, evidence, clarity, confidence, and persuasion...
        </p>
      </div>
    );
  }

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
      icon: <Flag size={18} />,
      label: 'Quit Debate',
      onClick: () => handleEndDebate(),
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
              className="btn btn-danger btn-sm"
              onClick={() => handleEndDebate()}
              disabled={loading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Quit debate and evaluate current arguments"
            >
              <Flag size={14} /> Quit Debate
            </motion.button>
          )}
          {isCompleted && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate(`/debate/${id}/result`)}
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

      {/* Quit Confirmation & 15s Cooldown Modal */}
      <AnimatePresence>
        {showQuitModal && (
          <motion.div
            className="modal-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="glass-card"
              style={{
                width: '100%',
                maxWidth: 440,
                padding: 32,
                borderRadius: 24,
                textAlign: 'center',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 20,
              }}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
              {/* Circular Countdown Ring */}
              <div style={{ position: 'relative', width: 96, height: 96 }}>
                <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                  <circle
                    cx="50" cy="50" r="42"
                    stroke="rgba(255, 255, 255, 0.1)"
                    strokeWidth="8"
                    fill="none"
                  />
                  <motion.circle
                    cx="50" cy="50" r="42"
                    stroke="var(--primary-light)"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={264}
                    animate={{ strokeDashoffset: 264 - (quitCountdown / 15) * 264 }}
                    transition={{ duration: 1, ease: 'linear' }}
                    strokeLinecap="round"
                  />
                </svg>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 30,
                    fontWeight: 800,
                    color: 'var(--primary-light)',
                  }}
                >
                  {quitCountdown}s
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'var(--fg-primary)' }}>
                  Quit Debate & Evaluate?
                </h3>
                <p style={{ fontSize: 14, color: 'var(--fg-secondary)', lineHeight: 1.5 }}>
                  The AI is preparing your evaluation. The 15s window gives you time to review or cancel to continue debating.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 8 }}>
                <motion.button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '12px 16px', borderRadius: 12 }}
                  onClick={handleCancelQuit}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  ↩️ Cancel & Resume
                </motion.button>
                <motion.button
                  type="button"
                  className="btn btn-danger"
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: 12,
                    opacity: quitCountdown > 0 ? 0.55 : 1,
                    cursor: quitCountdown > 0 ? 'not-allowed' : 'pointer',
                  }}
                  disabled={quitCountdown > 0}
                  onClick={() => handleEndDebate(true)}
                  whileHover={quitCountdown === 0 ? { scale: 1.03 } : {}}
                  whileTap={quitCountdown === 0 ? { scale: 0.97 } : {}}
                >
                  {quitCountdown > 0 ? `⏳ Preparing (${quitCountdown}s)` : '🏁 Confirm & View Results'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DebateRoom;


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


  const [lightningRound, setLightningRound] = useState(1);
  const [isUserTurn, setIsUserTurn] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);

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
    if (!force) {
      const confirmMsg = lockInEnabled
        ? 'Lock-in Mode Active: Are you sure you want to quit this debate and admit defeat?'
        : 'Are you sure you want to quit this debate and admit defeat? Your current performance will be evaluated.';
      if (!window.confirm(confirmMsg)) {
        return;
      }
    }

    debateTimer.stop();
    setIsEvaluating(true);
    try {
      await endDebate();
      navigate(`/debate/${id}/result`);
    } catch (err) {
      console.error('End failed:', err);
    } finally {
      setIsEvaluating(false);
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

  if (isEvaluating) {
    return (
      <div className="loading-screen" style={{ minHeight: 'auto', paddingTop: 120, flexDirection: 'column', gap: 16 }}>
        <div className="loading-spinner" />
        <div style={{ color: 'var(--primary-light)', fontSize: 18, fontWeight: 600 }}>
          ✨ AI Judge evaluating your debate performance...
        </div>
        <p style={{ color: 'var(--fg-secondary)', fontSize: 14 }}>
          Analyzing argument logic, evidence, clarity, confidence, and persuasion...
        </p>
      </div>
    );
  }

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
      icon: <Flag size={18} />,
      label: 'Quit Debate',
      onClick: () => handleEndDebate(),
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
              className="btn btn-danger btn-sm"
              onClick={() => handleEndDebate()}
              disabled={loading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Quit debate and evaluate current arguments"
            >
              <Flag size={14} /> Quit Debate
            </motion.button>
          )}
          {isCompleted && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate(`/debate/${id}/result`)}
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
