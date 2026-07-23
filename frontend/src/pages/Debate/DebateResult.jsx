import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { debateService } from '../../services/debateService';
import { useTheme } from '../../hooks/useTheme';
import Card3D from '../../components/Card3D';
import { ArrowLeft, Swords, Trophy, TrendingUp, MessageSquare } from 'lucide-react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

const ScoreCircle = ({ score, label, color }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = ((score || 0) / 10) * circumference;

  return (
    <Card3D className="glass-card result-score-card" intensity={5}>
      <div className="score-circle" style={{ margin: '0 auto' }}>
        <svg viewBox="0 0 100 100">
          <circle className="bg-ring" cx="50" cy="50" r={radius} />
          <motion.circle
            className="progress-ring"
            cx="50"
            cy="50"
            r={radius}
            stroke={color}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.5, ease: [0.22, 1.36, 0.36, 1], delay: 0.3 }}
          />
        </svg>
        <div className="score-value" style={{ color }}>
          {(score || 0).toFixed(1)}
        </div>
      </div>
      <div className="score-label">{label}</div>
    </Card3D>
  );
};

const DebateResult = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    loadResult();
  }, [id]);

  const loadResult = async () => {
    try {
      const result = await debateService.getById(parseInt(id));
      setData(result);
    } catch (error) {
      console.error('Failed to load result:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen" style={{ minHeight: 'auto', paddingTop: 100 }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!data || !data.feedback) {
    return (
      <div className="empty-state">
        <h3>Results not available</h3>
        <p>This debate may not have been evaluated yet.</p>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const { debate, feedback, messages } = data;

  const radarData = [
    { subject: 'Logic', score: feedback.logicScore || 0 },
    { subject: 'Evidence', score: feedback.evidenceScore || 0 },
    { subject: 'Clarity', score: feedback.clarityScore || 0 },
    { subject: 'Confidence', score: feedback.confidenceScore || 0 },
    { subject: 'Persuasion', score: feedback.persuasionScore || 0 },
  ];

  const scores = [
    { label: 'Overall', score: feedback.overallScore, color: '#7C3AED' },
    { label: 'Logic', score: feedback.logicScore, color: '#A78BFA' },
    { label: 'Evidence', score: feedback.evidenceScore, color: '#3b82f6' },
    { label: 'Clarity', score: feedback.clarityScore, color: '#10b981' },
    { label: 'Confidence', score: feedback.confidenceScore, color: '#f59e0b' },
    { label: 'Persuasion', score: feedback.persuasionScore, color: '#ef4444' },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={item} style={{ marginBottom: 24 }}>
        <button
          className="btn btn-ghost"
          onClick={() => navigate('/dashboard')}
          style={{ marginBottom: 16 }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
          Debate Results
        </h1>
        <p style={{ color: 'var(--fg-secondary)', fontSize: 14 }}>
          {debate.topic}
        </p>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 13, color: 'var(--fg-tertiary)' }}>
          <span>Side: {debate.userSide === 'support' ? 'Supporting' : 'Opposing'}</span>
          <span>•</span>
          <span style={{ textTransform: 'capitalize' }}>Difficulty: {debate.difficulty}</span>
          <span>•</span>
          <span>{messages?.length || 0} messages</span>
        </div>
      </motion.div>

      {/* Score Circles with 3D effect */}
      <motion.div variants={item} className="result-scores">
        {scores.map((s) => (
          <ScoreCircle key={s.label} score={s.score} label={s.label} color={s.color} />
        ))}
      </motion.div>

      <div className="content-grid">
        {/* Radar Chart */}
        <motion.div variants={item} className="glass-card chart-card">
          <h3>Skill Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--chart-grid)" />
              <PolarAngleAxis dataKey="subject" stroke="var(--chart-text)" fontSize={12} />
              <PolarRadiusAxis
                domain={[0, 10]}
                stroke="var(--chart-grid)"
                fontSize={10}
              />
              <Radar
                dataKey="score"
                stroke="#7C3AED"
                fill="#7C3AED"
                fillOpacity={0.25}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Feedback */}
        <motion.div variants={item}>
          <motion.div
            className="feedback-section"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 style={{ color: 'var(--success)' }}>
              <TrendingUp size={18} /> Strengths
            </h3>
            <ul className="feedback-list">
              {(feedback.strengths || []).map((s, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                >
                  {s}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            className="feedback-section"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h3 style={{ color: 'var(--warning)' }}>
              <Trophy size={18} /> Areas to Improve
            </h3>
            <ul className="feedback-list">
              {(feedback.weaknesses || []).map((w, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                >
                  {w}
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            className="feedback-section"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
          >
            <h3 style={{ color: 'var(--primary-light)' }}>
              <MessageSquare size={18} /> Suggestions
            </h3>
            <ul className="feedback-list">
              {(feedback.suggestions || []).map((s, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + i * 0.1 }}
                >
                  {s}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      </div>

      {/* Action Buttons */}
      <motion.div
        variants={item}
        style={{ display: 'flex', gap: 12, marginTop: 32, justifyContent: 'center', flexWrap: 'wrap' }}
      >
        <motion.button
          className="btn btn-secondary btn-lg"
          onClick={() => navigate('/dashboard')}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </motion.button>
        <motion.button
          className="btn btn-secondary btn-lg"
          onClick={() => navigate(`/debate/${id}`)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <MessageSquare size={16} /> View Transcript
        </motion.button>
        <motion.button
          className="btn btn-primary btn-lg"
          onClick={() => navigate('/debate/new')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Swords size={16} /> New Debate
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default DebateResult;
