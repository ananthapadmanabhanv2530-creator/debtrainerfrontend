import { useState, useCallback, useRef } from 'react';
import { debateService } from '../services/debateService';

export const useDebate = () => {
  const [debate, setDebate] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Hint state
  const [hintsUsed, setHintsUsed] = useState(0);
  const [currentHint, setCurrentHint] = useState(null);
  const [hintLoading, setHintLoading] = useState(false);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startDebate = useCallback(async (topic, category, difficulty, userSide, config = {}) => {
    setLoading(true);
    setError(null);
    setHintsUsed(0);
    setCurrentHint(null);
    try {
      const result = await debateService.start(topic, category, difficulty, userSide, config);
      setDebate(result.debate);
      setMessages([result.message]);
      startTimer();
      return result;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start debate');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [startTimer]);

  const sendMessage = useCallback(async (message) => {
    if (!debate) return;
    setSending(true);
    setError(null);

    // Add user message immediately for responsiveness
    const userMsg = { role: 'user', message, createdAt: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const result = await debateService.sendMessage(debate.id, message);
      setMessages((prev) => [...prev, result.message]);
      return result;
    } catch (err) {
      // Remove optimistic user message on error
      setMessages((prev) => prev.slice(0, -1));
      setError(err.response?.data?.error || 'Failed to send message');
      throw err;
    } finally {
      setSending(false);
    }
  }, [debate]);

  const endDebate = useCallback(async () => {
    if (!debate) return;
    setLoading(true);
    setError(null);
    stopTimer();

    try {
      const result = await debateService.end(debate.id);
      setEvaluation(result.evaluation);
      setDebate((prev) => ({ ...prev, status: 'completed' }));
      return result;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to end debate');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [debate, stopTimer]);

  const loadDebate = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const result = await debateService.getById(id);
      setDebate(result.debate);
      setMessages(result.messages);
      if (result.feedback) {
        setEvaluation(result.feedback);
      }
      if (result.debate.status === 'active') {
        startTimer();
      }
      return result;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load debate');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [startTimer]);

  const requestHint = useCallback(async (hintType = 'keyword') => {
    if (!debate) return;
    const config = debate.config || {};
    const maxHints = config.hints?.maxHints || 3;

    if (hintsUsed >= maxHints) {
      setError('No hints remaining');
      return null;
    }

    setHintLoading(true);
    setError(null);
    try {
      const result = await debateService.requestHint(debate.id, hintType);
      setCurrentHint({ text: result.hint, type: result.hintType });
      setHintsUsed((prev) => prev + 1);
      return result;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get hint');
      return null;
    } finally {
      setHintLoading(false);
    }
  }, [debate, hintsUsed]);

  const dismissHint = useCallback(() => {
    setCurrentHint(null);
  }, []);

  const reset = useCallback(() => {
    setDebate(null);
    setMessages([]);
    setEvaluation(null);
    setError(null);
    setElapsedTime(0);
    setHintsUsed(0);
    setCurrentHint(null);
    stopTimer();
  }, [stopTimer]);

  return {
    debate,
    messages,
    loading,
    sending,
    evaluation,
    error,
    elapsedTime,
    // Hint state
    hintsUsed,
    currentHint,
    hintLoading,
    // Actions
    startDebate,
    sendMessage,
    endDebate,
    loadDebate,
    requestHint,
    dismissHint,
    reset,
  };
};

