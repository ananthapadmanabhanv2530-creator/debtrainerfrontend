import { useState, useCallback, useRef, useEffect } from 'react';

const ROUND_ORDER = ['opening', 'rebuttal', 'crossfire', 'closing'];

const ROUND_LABELS = {
  opening: 'Opening Statement',
  rebuttal: 'Rebuttal',
  crossfire: 'Crossfire',
  closing: 'Closing Statement',
};

export const useDebateTimer = (config) => {
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeWarning, setActiveWarning] = useState(null);
  const intervalRef = useRef(null);
  const onWarningRef = useRef(null);
  const onTimeUpRef = useRef(null);
  const onRoundEndRef = useRef(null);

  const timerConfig = config?.timer;
  const lightningConfig = config?.lightning;
  const isTimerEnabled = timerConfig?.enabled;
  const isLightningEnabled = lightningConfig?.enabled;

  const getCurrentRoundName = useCallback(
    () => ROUND_ORDER[currentRoundIndex] || 'opening',
    [currentRoundIndex]
  );

  const getCurrentRoundLabel = useCallback(
    () => ROUND_LABELS[getCurrentRoundName()] || 'Round',
    [getCurrentRoundName]
  );

  const getCurrentRoundDuration = useCallback(() => {
    if (isLightningEnabled) return lightningConfig?.timePerTurn || 60;
    if (!timerConfig?.rounds) return 180;
    return timerConfig.rounds[getCurrentRoundName()] || 180;
  }, [isLightningEnabled, lightningConfig, timerConfig, getCurrentRoundName]);

  const start = useCallback(() => {
    if (!isTimerEnabled && !isLightningEnabled) return;
    const duration = getCurrentRoundDuration();
    setTimeRemaining(duration);
    setIsRunning(true);
    setIsPaused(false);
    setActiveWarning(null);
  }, [isTimerEnabled, isLightningEnabled, getCurrentRoundDuration]);

  const pause = useCallback(() => {
    if (!timerConfig?.pauseEnabled) return;
    setIsPaused(true);
  }, [timerConfig]);

  const resume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const nextRound = useCallback(() => {
    if (currentRoundIndex < ROUND_ORDER.length - 1) {
      const nextIdx = currentRoundIndex + 1;
      setCurrentRoundIndex(nextIdx);
      const nextDuration = timerConfig?.rounds?.[ROUND_ORDER[nextIdx]] || 180;
      setTimeRemaining(nextDuration);
      setActiveWarning(null);
    }
  }, [currentRoundIndex, timerConfig]);

  const resetTurn = useCallback(() => {
    const duration = isLightningEnabled
      ? lightningConfig?.timePerTurn || 60
      : getCurrentRoundDuration();
    setTimeRemaining(duration);
    setActiveWarning(null);
  }, [isLightningEnabled, lightningConfig, getCurrentRoundDuration]);

  const stop = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stop();
    setCurrentRoundIndex(0);
    setTimeRemaining(0);
    setActiveWarning(null);
  }, [stop]);

  useEffect(() => {
    if (!isRunning || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 1;

        // Check warning thresholds
        const warningThresholds = timerConfig?.warnings || [60, 30, 10];
        if (warningThresholds.includes(next)) {
          setActiveWarning(next);
          onWarningRef.current?.(next);
          setTimeout(() => setActiveWarning(null), 2000);
        }

        // Time up
        if (next <= 0) {
          onTimeUpRef.current?.();
          if (!isLightningEnabled && timerConfig?.autoEnd) {
            onRoundEndRef.current?.(ROUND_ORDER[currentRoundIndex]);
          }
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, isPaused, timerConfig, isLightningEnabled, currentRoundIndex]);

  const getProgress = useCallback(() => {
    const total = getCurrentRoundDuration();
    if (total === 0) return 1;
    return timeRemaining / total;
  }, [timeRemaining, getCurrentRoundDuration]);

  const getWarningLevel = useCallback(() => {
    if (timeRemaining <= 10) return 'critical';
    if (timeRemaining <= 30) return 'danger';
    if (timeRemaining <= 60) return 'warning';
    return 'normal';
  }, [timeRemaining]);

  return {
    currentRound: getCurrentRoundName(),
    currentRoundLabel: getCurrentRoundLabel(),
    currentRoundIndex,
    timeRemaining,
    isRunning,
    isPaused,
    activeWarning,
    totalRounds: ROUND_ORDER.length,
    progress: getProgress(),
    warningLevel: getWarningLevel(),
    start,
    pause,
    resume,
    nextRound,
    resetTurn,
    stop,
    reset,
    setOnWarning: (fn) => { onWarningRef.current = fn; },
    setOnTimeUp: (fn) => { onTimeUpRef.current = fn; },
    setOnRoundEnd: (fn) => { onRoundEndRef.current = fn; },
  };
};

