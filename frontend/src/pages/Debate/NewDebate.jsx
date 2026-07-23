import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebate } from '../../hooks/useDebate';
import { Swords, ArrowLeft, ArrowRight, Sparkles, Settings2 } from 'lucide-react';
import DebateConfig from './DebateConfig';

const CATEGORIES = [
  { name: 'Technology', emoji: '💻', topics: [
    'AI should replace teachers in classrooms',
    'Social media does more harm than good',
    'Cryptocurrency will replace traditional currency',
    'Remote work is better than office work',
  ]},
  { name: 'Politics', emoji: '🏛️', topics: [
    'Universal basic income should be implemented globally',
    'Democracy is the best form of government',
    'Voting should be mandatory for all citizens',
    'The death penalty should be abolished worldwide',
  ]},
  { name: 'Science', emoji: '🔬', topics: [
    'Space exploration is worth the investment',
    'Nuclear energy is the solution to climate change',
    'Genetic engineering of humans should be allowed',
    'Animal testing should be completely banned',
  ]},
  { name: 'Education', emoji: '📚', topics: [
    'College education should be free for everyone',
    'Standardized testing should be eliminated',
    'Homework should be abolished in schools',
    'Arts education is as important as STEM',
  ]},
  { name: 'Society', emoji: '🌍', topics: [
    'Privacy is more important than security',
    'Cancel culture has gone too far',
    'Globalization benefits developing countries',
    'Fast fashion should be banned',
  ]},
  { name: 'Health', emoji: '🏥', topics: [
    'Healthcare should be free for everyone',
    'Vaccines should be mandatory',
    'Mental health days should be standard at workplaces',
    'Junk food should be taxed like tobacco',
  ]},
];

const SIDES = [
  { value: 'support', label: 'Support', icon: '👍', desc: 'Argue FOR the topic' },
  { value: 'oppose', label: 'Oppose', icon: '👎', desc: 'Argue AGAINST the topic' },
  { value: 'random', label: 'Random', icon: '🎲', desc: 'Let fate decide' },
];

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', desc: 'Beginner friendly', color: '#10b981' },
  { value: 'medium', label: 'Medium', desc: 'Balanced challenge', color: '#f59e0b' },
  { value: 'hard', label: 'Hard', desc: 'Advanced arguments', color: '#ef4444' },
  { value: 'expert', label: 'Expert', desc: 'Championship level', color: '#A78BFA' },
];

const DEFAULT_CONFIG = {
  timer: {
    enabled: false,
    rounds: { opening: 180, rebuttal: 120, crossfire: 90, closing: 120 },
    warnings: [60, 30, 10],
    autoEnd: true,
    pauseEnabled: true,
    autoSave: true,
  },
  lockIn: {
    enabled: false,
    fullscreen: true,
    preventTopicChange: true,
    preventDifficultyChange: true,
    lockSettingsAfterStart: true,
    exitConfirmation: true,
    autoSaveResume: true,
  },
  lightning: {
    enabled: false,
    timePerTurn: 60,
    numberOfRounds: 5,
    aiResponseTime: 10,
    instantFollowUp: false,
    suddenDeath: false,
  },
  speech: {
    enabled: false,
    language: 'en-US',
    manualEditBeforeSubmit: true,
  },
  hints: {
    enabled: false,
    maxHints: 3,
    hintPenalty: false,
    types: {
      keyword: true,
      outline: true,
      counterArgument: true,
      evidence: true,
      socratic: true,
    },
  },
};

const NewDebate = () => {
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [selectedSide, setSelectedSide] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');
  const [debateConfig, setDebateConfig] = useState(DEFAULT_CONFIG);
  const { startDebate, loading, error } = useDebate();
  const navigate = useNavigate();

  const currentTopic = customTopic || selectedTopic;

  const handleStart = async () => {
    try {
      const category = selectedCategory?.name || 'General';
      const result = await startDebate(
        currentTopic,
        category,
        selectedDifficulty,
        selectedSide,
        debateConfig
      );
      navigate(`/debate/${result.debate.id}`);
    } catch (err) {
      console.error('Failed to start debate:', err);
    }
  };

  const canProceed = () => {
    if (step === 1) return currentTopic.length >= 5;
    if (step === 2) return selectedSide !== '';
    if (step === 3) return selectedDifficulty !== '';
    if (step === 4) return true; // Config is always valid (all optional)
    return false;
  };

  const activeConfigCount = [
    debateConfig.timer.enabled,
    debateConfig.lockIn.enabled,
    debateConfig.lightning.enabled,
    debateConfig.speech.enabled,
    debateConfig.hints.enabled,
  ].filter(Boolean).length;

  return (
    <div className="debate-setup">
      {/* Step Indicator */}
      <div className="step-indicator">
        {[1, 2, 3, 4].map((s) => (
          <motion.div
            key={s}
            className={`step-dot ${s === step ? 'active' : ''} ${s < step ? 'completed' : ''}`}
            layout
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Topic */}
        {step === 1 && (
          <motion.div
            key="step1"
            className="step-content"
            initial={{ opacity: 0, x: 60, rotateY: -5 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            exit={{ opacity: 0, x: -60, rotateY: 5 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2>Choose a Topic</h2>
            <p>Select from popular topics or enter your own</p>

            {/* Custom topic input */}
            <div className="input-group" style={{ marginBottom: 32, textAlign: 'left' }}>
              <label>Custom Topic</label>
              <input
                type="text"
                className="input"
                placeholder="Enter any debate topic..."
                value={customTopic}
                onChange={(e) => {
                  setCustomTopic(e.target.value);
                  setSelectedTopic('');
                }}
              />
            </div>

            {!customTopic && (
              <>
                {/* Category tabs */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
                  {CATEGORIES.map((cat) => (
                    <motion.button
                      key={cat.name}
                      className={`btn btn-sm ${selectedCategory?.name === cat.name ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSelectedCategory(cat)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {cat.emoji} {cat.name}
                    </motion.button>
                  ))}
                </div>

                {/* Topic cards */}
                {selectedCategory && (
                  <div className="topic-grid">
                    {selectedCategory.topics.map((topic) => (
                      <motion.div
                        key={topic}
                        className={`topic-card ${selectedTopic === topic ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedTopic(topic);
                          setCustomTopic('');
                        }}
                        whileHover={{ y: -3, scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {topic}
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* Step 2: Side */}
        {step === 2 && (
          <motion.div
            key="step2"
            className="step-content"
            initial={{ opacity: 0, x: 60, rotateY: -5 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            exit={{ opacity: 0, x: -60, rotateY: 5 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2>Choose Your Side</h2>
            <p>Which position will you argue?</p>

            <div
              className="glass-card"
              style={{
                padding: '12px 16px',
                marginBottom: 32,
                fontSize: 14,
                color: 'var(--fg-secondary)',
                textAlign: 'center',
              }}
            >
              "{currentTopic}"
            </div>

            <div className="side-options">
              {SIDES.map((side) => (
                <motion.div
                  key={side.value}
                  className={`side-option ${selectedSide === side.value ? 'selected' : ''}`}
                  onClick={() => setSelectedSide(side.value)}
                  whileHover={{ scale: 1.03, rotateY: 3 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <div className="side-icon">{side.icon}</div>
                  <div className="side-label">{side.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--fg-tertiary)', marginTop: 4 }}>
                    {side.desc}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 3: Difficulty */}
        {step === 3 && (
          <motion.div
            key="step3"
            className="step-content"
            initial={{ opacity: 0, x: 60, rotateY: -5 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            exit={{ opacity: 0, x: -60, rotateY: 5 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2>Select Difficulty</h2>
            <p>How tough should your AI opponent be?</p>

            <div className="difficulty-options" style={{ marginBottom: 32 }}>
              {DIFFICULTIES.map((diff) => (
                <motion.div
                  key={diff.value}
                  className={`difficulty-option ${selectedDifficulty === diff.value ? 'selected' : ''}`}
                  onClick={() => setSelectedDifficulty(diff.value)}
                  whileHover={{ scale: 1.04, y: -4 }}
                  whileTap={{ scale: 0.96 }}
                  style={
                    selectedDifficulty === diff.value
                      ? { borderColor: diff.color }
                      : {}
                  }
                >
                  <div className="diff-label" style={selectedDifficulty === diff.value ? { color: diff.color } : {}}>
                    {diff.label}
                  </div>
                  <div className="diff-desc">{diff.desc}</div>
                </motion.div>
              ))}
            </div>

            {error && <div className="error-message" style={{ marginBottom: 16 }}>{error}</div>}
          </motion.div>
        )}

        {/* Step 4: Configuration */}
        {step === 4 && (
          <motion.div
            key="step4"
            className="step-content"
            initial={{ opacity: 0, x: 60, rotateY: -5 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            exit={{ opacity: 0, x: -60, rotateY: 5 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2>
              <Settings2 size={22} style={{ verticalAlign: 'text-bottom', marginRight: 8 }} />
              Configure Debate
            </h2>
            <p>
              Customize your debate experience
              {activeConfigCount > 0 && (
                <span style={{ color: 'var(--primary-light)', fontWeight: 500 }}>
                  {' '}— {activeConfigCount} feature{activeConfigCount !== 1 ? 's' : ''} active
                </span>
              )}
            </p>

            <DebateConfig config={debateConfig} onConfigChange={setDebateConfig} />

            {error && <div className="error-message" style={{ marginBottom: 16 }}>{error}</div>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
        <motion.button
          className="btn btn-secondary"
          onClick={() => (step === 1 ? navigate('/dashboard') : setStep(step - 1))}
          disabled={loading}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <ArrowLeft size={16} />
          {step === 1 ? 'Cancel' : 'Back'}
        </motion.button>

        {step < 4 ? (
          <motion.button
            className="btn btn-primary"
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Next <ArrowRight size={16} />
          </motion.button>
        ) : (
          <motion.button
            className="btn btn-primary btn-lg"
            onClick={handleStart}
            disabled={!canProceed() || loading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {loading ? (
              <>
                <div className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Initializing...
              </>
            ) : (
              <>
                <Sparkles size={18} /> Start Debate
              </>
            )}
          </motion.button>
        )}
      </div>
    </div>
  );
};

export default NewDebate;

