import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Lock, Zap, Mic, Lightbulb, Info } from 'lucide-react';

const CONFIG_TABS = [
  { id: 'timer', label: 'Timer', emoji: '⏱️' },
  { id: 'lockin', label: 'Lock-in', emoji: '🔒' },
  { id: 'lightning', label: 'Lightning', emoji: '⚡' },
  { id: 'speech', label: 'Speech', emoji: '🎙️' },
  { id: 'hints', label: 'Hints', emoji: '💡' },
];

const LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'es-ES', label: 'Spanish' },
  { code: 'fr-FR', label: 'French' },
  { code: 'de-DE', label: 'German' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'zh-CN', label: 'Chinese' },
  { code: 'ja-JP', label: 'Japanese' },
  { code: 'ko-KR', label: 'Korean' },
  { code: 'ar-SA', label: 'Arabic' },
  { code: 'pt-BR', label: 'Portuguese' },
  { code: 'ru-RU', label: 'Russian' },
];

const HINT_TYPES = [
  { id: 'keyword', label: 'Keyword', emoji: '🔑', desc: 'Key terms to use' },
  { id: 'outline', label: 'Outline', emoji: '📋', desc: 'Argument structure' },
  { id: 'counterArgument', label: 'Counter-Arg', emoji: '⚔️', desc: 'Counter to opponent' },
  { id: 'evidence', label: 'Evidence', emoji: '📊', desc: 'Facts & examples' },
  { id: 'socratic', label: 'Socratic', emoji: '❓', desc: 'Guiding questions' },
];

/* ─── Reusable sub-components ─── */

const ToggleSwitch = ({ checked, onChange }) => (
  <label className="toggle-switch">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span className="toggle-slider" />
  </label>
);

const ConfigRow = ({ label, description, children }) => (
  <div className="config-row">
    <div className="config-row-info">
      <div className="config-row-label">{label}</div>
      {description && <div className="config-row-desc">{description}</div>}
    </div>
    <div className="config-row-control">{children}</div>
  </div>
);

const NumberStepper = ({ value, onChange, min, max, step = 1, unit = 's' }) => (
  <div className="number-stepper">
    <motion.button
      className="stepper-btn"
      onClick={() => onChange(Math.max(min, value - step))}
      disabled={value <= min}
      whileTap={{ scale: 0.85 }}
    >
      −
    </motion.button>
    <span className="stepper-value">
      {value}
      {unit}
    </span>
    <motion.button
      className="stepper-btn"
      onClick={() => onChange(Math.min(max, value + step))}
      disabled={value >= max}
      whileTap={{ scale: 0.85 }}
    >
      +
    </motion.button>
  </div>
);

/* ─── Main component ─── */

const DebateConfig = ({ config, onConfigChange }) => {
  const [activeTab, setActiveTab] = useState('timer');

  const update = (section, key, value) => {
    onConfigChange({
      ...config,
      [section]: { ...config[section], [key]: value },
    });
  };

  const updateNested = (section, parent, key, value) => {
    onConfigChange({
      ...config,
      [section]: {
        ...config[section],
        [parent]: { ...config[section][parent], [key]: value },
      },
    });
  };

  /* ─── Tab Renderers ─── */

  const renderTimer = () => (
    <div className="config-section-content">
      <ConfigRow label="Enable Timer" description="Countdown timer for each debate round">
        <ToggleSwitch
          checked={config.timer.enabled}
          onChange={(v) => update('timer', 'enabled', v)}
        />
      </ConfigRow>

      <AnimatePresence>
        {config.timer.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="config-subsection">
              <h4 className="config-subsection-title">Round Durations</h4>
              <ConfigRow label="Opening Statement">
                <NumberStepper
                  value={config.timer.rounds.opening}
                  onChange={(v) => updateNested('timer', 'rounds', 'opening', v)}
                  min={30} max={600} step={30}
                />
              </ConfigRow>
              <ConfigRow label="Rebuttal">
                <NumberStepper
                  value={config.timer.rounds.rebuttal}
                  onChange={(v) => updateNested('timer', 'rounds', 'rebuttal', v)}
                  min={30} max={600} step={30}
                />
              </ConfigRow>
              <ConfigRow label="Crossfire">
                <NumberStepper
                  value={config.timer.rounds.crossfire}
                  onChange={(v) => updateNested('timer', 'rounds', 'crossfire', v)}
                  min={30} max={600} step={30}
                />
              </ConfigRow>
              <ConfigRow label="Closing Statement">
                <NumberStepper
                  value={config.timer.rounds.closing}
                  onChange={(v) => updateNested('timer', 'rounds', 'closing', v)}
                  min={30} max={600} step={30}
                />
              </ConfigRow>
            </div>

            <div className="config-subsection">
              <h4 className="config-subsection-title">Warning Alerts</h4>
              <div className="config-chips">
                {[60, 30, 10, 5].map((sec) => (
                  <button
                    key={sec}
                    className={`config-chip ${config.timer.warnings.includes(sec) ? 'active' : ''}`}
                    onClick={() => {
                      const w = config.timer.warnings.includes(sec)
                        ? config.timer.warnings.filter((s) => s !== sec)
                        : [...config.timer.warnings, sec].sort((a, b) => b - a);
                      update('timer', 'warnings', w);
                    }}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>

            <ConfigRow label="Auto-end Round" description="End round automatically when timer expires">
              <ToggleSwitch checked={config.timer.autoEnd} onChange={(v) => update('timer', 'autoEnd', v)} />
            </ConfigRow>
            <ConfigRow label="Pause / Resume" description="Allow pausing the timer during debate">
              <ToggleSwitch checked={config.timer.pauseEnabled} onChange={(v) => update('timer', 'pauseEnabled', v)} />
            </ConfigRow>
            <ConfigRow label="Auto-save Progress" description="Save progress automatically">
              <ToggleSwitch checked={config.timer.autoSave} onChange={(v) => update('timer', 'autoSave', v)} />
            </ConfigRow>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderLockIn = () => (
    <div className="config-section-content">
      <ConfigRow label="Enable Lock-in Mode" description="Full-screen focused debate experience">
        <ToggleSwitch checked={config.lockIn.enabled} onChange={(v) => update('lockIn', 'enabled', v)} />
      </ConfigRow>

      <AnimatePresence>
        {config.lockIn.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ConfigRow label="Fullscreen Interface" description="Expand to fullscreen during debate">
              <ToggleSwitch checked={config.lockIn.fullscreen} onChange={(v) => update('lockIn', 'fullscreen', v)} />
            </ConfigRow>
            <ConfigRow label="Lock Topic" description="Prevent changing the debate topic after start">
              <ToggleSwitch checked={config.lockIn.preventTopicChange} onChange={(v) => update('lockIn', 'preventTopicChange', v)} />
            </ConfigRow>
            <ConfigRow label="Lock Difficulty" description="Prevent changing AI difficulty after start">
              <ToggleSwitch checked={config.lockIn.preventDifficultyChange} onChange={(v) => update('lockIn', 'preventDifficultyChange', v)} />
            </ConfigRow>
            <ConfigRow label="Lock Settings" description="Lock all settings once debate starts">
              <ToggleSwitch checked={config.lockIn.lockSettingsAfterStart} onChange={(v) => update('lockIn', 'lockSettingsAfterStart', v)} />
            </ConfigRow>
            <ConfigRow label="Exit Confirmation" description="Confirm before leaving the debate">
              <ToggleSwitch checked={config.lockIn.exitConfirmation} onChange={(v) => update('lockIn', 'exitConfirmation', v)} />
            </ConfigRow>
            <ConfigRow label="Auto-save & Resume" description="Save progress and allow resuming later">
              <ToggleSwitch checked={config.lockIn.autoSaveResume} onChange={(v) => update('lockIn', 'autoSaveResume', v)} />
            </ConfigRow>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderLightning = () => (
    <div className="config-section-content">
      <ConfigRow label="Enable Lightning Debate" description="Fast-paced rapid fire debate mode">
        <ToggleSwitch checked={config.lightning.enabled} onChange={(v) => update('lightning', 'enabled', v)} />
      </ConfigRow>

      <AnimatePresence>
        {config.lightning.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ConfigRow
              label="Time Per Turn"
              description={`${config.lightning.timePerTurn} seconds per response`}
            >
              <div className="config-slider-wrap">
                <input
                  type="range"
                  className="config-slider"
                  min={10}
                  max={120}
                  step={5}
                  value={config.lightning.timePerTurn}
                  onChange={(e) => update('lightning', 'timePerTurn', parseInt(e.target.value))}
                />
                <span className="config-slider-value">{config.lightning.timePerTurn}s</span>
              </div>
            </ConfigRow>
            <ConfigRow label="Number of Rounds">
              <NumberStepper
                value={config.lightning.numberOfRounds}
                onChange={(v) => update('lightning', 'numberOfRounds', v)}
                min={1} max={20} step={1} unit=""
              />
            </ConfigRow>
            <ConfigRow label="AI Response Time" description="Max seconds AI takes to respond">
              <NumberStepper
                value={config.lightning.aiResponseTime}
                onChange={(v) => update('lightning', 'aiResponseTime', v)}
                min={5} max={30} step={5}
              />
            </ConfigRow>
            <ConfigRow label="Instant Follow-up" description="AI asks follow-up questions immediately">
              <ToggleSwitch checked={config.lightning.instantFollowUp} onChange={(v) => update('lightning', 'instantFollowUp', v)} />
            </ConfigRow>
            <ConfigRow label="Sudden Death" description="Debate ends immediately when timer expires — no grace period">
              <ToggleSwitch checked={config.lightning.suddenDeath} onChange={(v) => update('lightning', 'suddenDeath', v)} />
            </ConfigRow>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderSpeech = () => (
    <div className="config-section-content">
      <ConfigRow label="Enable Speech-to-Text" description="Use your voice to present arguments">
        <ToggleSwitch checked={config.speech.enabled} onChange={(v) => update('speech', 'enabled', v)} />
      </ConfigRow>

      <AnimatePresence>
        {config.speech.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ConfigRow label="Language">
              <select
                className="config-select"
                value={config.speech.language}
                onChange={(e) => update('speech', 'language', e.target.value)}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </ConfigRow>
            <ConfigRow label="Edit Before Submit" description="Review transcript before sending (auto in Sudden Death)">
              <ToggleSwitch
                checked={config.speech.manualEditBeforeSubmit}
                onChange={(v) => update('speech', 'manualEditBeforeSubmit', v)}
              />
            </ConfigRow>
            <div className="config-info-box">
              <Info size={14} />
              <span>Uses your browser's built-in speech recognition. Works best in Chrome & Edge.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderHints = () => (
    <div className="config-section-content">
      <ConfigRow label="Enable Hints" description="Get AI guidance during the debate">
        <ToggleSwitch checked={config.hints.enabled} onChange={(v) => update('hints', 'enabled', v)} />
      </ConfigRow>

      <AnimatePresence>
        {config.hints.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ConfigRow label="Maximum Hints" description={`Up to ${config.hints.maxHints} hints per debate`}>
              <NumberStepper
                value={config.hints.maxHints}
                onChange={(v) => update('hints', 'maxHints', v)}
                min={1} max={10} step={1} unit=""
              />
            </ConfigRow>
            <ConfigRow label="Hint Penalty" description="Reduce score when using hints">
              <ToggleSwitch checked={config.hints.hintPenalty} onChange={(v) => update('hints', 'hintPenalty', v)} />
            </ConfigRow>

            <div className="config-subsection">
              <h4 className="config-subsection-title">Hint Types</h4>
              <div className="hint-type-grid">
                {HINT_TYPES.map((type) => (
                  <motion.button
                    key={type.id}
                    className={`hint-type-chip ${config.hints.types[type.id] ? 'active' : ''}`}
                    onClick={() => updateNested('hints', 'types', type.id, !config.hints.types[type.id])}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="hint-type-emoji">{type.emoji}</span>
                    <span className="hint-type-label">{type.label}</span>
                    <span className="hint-type-desc">{type.desc}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="config-info-box">
              <Info size={14} />
              <span>Disabled hints make the debate suitable for exams and competitive practice.</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const TAB_RENDERERS = {
    timer: renderTimer,
    lockin: renderLockIn,
    lightning: renderLightning,
    speech: renderSpeech,
    hints: renderHints,
  };

  return (
    <div className="debate-config">
      {/* Tab bar */}
      <div className="config-tabs">
        {CONFIG_TABS.map((tab) => (
          <motion.button
            key={tab.id}
            className={`config-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="config-tab-emoji">{tab.emoji}</span>
            <span className="config-tab-label">{tab.label}</span>
            {/* Indicator dot when section is enabled */}
            {config[tab.id === 'lockin' ? 'lockIn' : tab.id]?.enabled && (
              <span className="config-tab-dot" />
            )}
          </motion.button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="config-tab-content"
        >
          {TAB_RENDERERS[activeTab]?.()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default DebateConfig;

