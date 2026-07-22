import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { statsService } from '../../services/statsService';
import { useTheme } from '../../hooks/useTheme';
import Card3D from '../../components/Card3D';
import AnimatedCounter from '../../components/AnimatedCounter';
import GradualBlur from '../../components/reactbits/GradualBlur';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  Cell,
} from 'recharts';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

const COLORS = ['#7C3AED', '#A78BFA', '#EC4899', '#10B981', '#F59E0B', '#3B82F6'];

const Analytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const result = await statsService.getAnalytics();
      setAnalytics(result.analytics);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const tooltipStyle = {
    background: 'var(--chart-tooltip-bg)',
    border: '1px solid var(--chart-tooltip-border)',
    borderRadius: 12,
    color: 'var(--chart-tooltip-color)',
    fontSize: 13,
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  };

  if (loading) {
    return (
      <div className="loading-screen" style={{ minHeight: 'auto', paddingTop: 100 }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!analytics || analytics.trends.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="page-header">
          <h1>Analytics</h1>
          <p>Monitor your progress</p>
        </div>
        <div className="glass-card empty-state">
          <div className="empty-icon">📊</div>
          <h3>No analytics yet</h3>
          <p>Complete some debates to see your performance analytics</p>
        </div>
      </motion.div>
    );
  }

  const trendData = analytics.trends.map((t) => ({
    name: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    overall: t.overallScore,
    logic: t.logicScore,
    evidence: t.evidenceScore,
    clarity: t.clarityScore,
    confidence: t.confidenceScore,
    persuasion: t.persuasionScore,
  }));

  // Average skill scores for radar chart
  const avgScores = analytics.trends.reduce(
    (acc, t) => ({
      logic: acc.logic + t.logicScore,
      evidence: acc.evidence + t.evidenceScore,
      clarity: acc.clarity + t.clarityScore,
      confidence: acc.confidence + t.confidenceScore,
      persuasion: acc.persuasion + t.persuasionScore,
    }),
    { logic: 0, evidence: 0, clarity: 0, confidence: 0, persuasion: 0 }
  );

  const count = analytics.trends.length;
  const radarData = [
    { subject: 'Logic', score: +(avgScores.logic / count).toFixed(1) },
    { subject: 'Evidence', score: +(avgScores.evidence / count).toFixed(1) },
    { subject: 'Clarity', score: +(avgScores.clarity / count).toFixed(1) },
    { subject: 'Confidence', score: +(avgScores.confidence / count).toFixed(1) },
    { subject: 'Persuasion', score: +(avgScores.persuasion / count).toFixed(1) },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={item} className="page-header">
        <h1>Analytics</h1>
        <p>Track your debate skills over time</p>
      </motion.div>

      <div className="content-grid">
        {/* Overall Score Trend */}
        <motion.div variants={item} className="glass-card chart-card" style={{ gridColumn: '1 / -1', position: 'relative' }}>
          <h3>Score Progression</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="overallGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="name" stroke="var(--chart-text)" fontSize={11} />
              <YAxis domain={[0, 10]} stroke="var(--chart-text)" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="overall" stroke="#7C3AED" strokeWidth={2} fill="url(#overallGrad)" name="Overall" />
              <Line type="monotone" dataKey="logic" stroke="#A78BFA" strokeWidth={1.5} dot={false} name="Logic" />
              <Line type="monotone" dataKey="evidence" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Evidence" />
            </AreaChart>
          </ResponsiveContainer>
          <GradualBlur position="bottom" height="2.5rem" strength={1.5} divCount={4} curve="bezier" />
        </motion.div>

        {/* Skill Radar */}
        <motion.div variants={item} className="glass-card chart-card">
          <h3>Average Skill Profile</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--chart-grid)" />
              <PolarAngleAxis dataKey="subject" stroke="var(--chart-text)" fontSize={12} />
              <PolarRadiusAxis domain={[0, 10]} stroke="var(--chart-grid)" fontSize={10} />
              <Radar dataKey="score" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Category Performance */}
        <motion.div variants={item} className="glass-card chart-card">
          <h3>Performance by Category</h3>
          {analytics.categoryBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analytics.categoryBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis type="number" domain={[0, 10]} stroke="var(--chart-text)" fontSize={11} />
                <YAxis type="category" dataKey="category" stroke="var(--chart-text)" fontSize={11} width={80} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="avgScore" name="Avg Score" radius={[0, 6, 6, 0]}>
                  {analytics.categoryBreakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}>
              <p>No category data available</p>
            </div>
          )}
        </motion.div>

        {/* Difficulty Breakdown */}
        <motion.div variants={item} className="glass-card" style={{ padding: 24, gridColumn: '1 / -1' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
            Performance by Difficulty
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
            {analytics.difficultyBreakdown.map((d) => (
              <Card3D key={d.difficulty} className="glass-card stat-card" intensity={5} style={{ flexDirection: 'column', textAlign: 'center', gap: 8 }}>
                <div style={{ textTransform: 'capitalize', fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>
                  {d.difficulty}
                </div>
                <div className="stat-value" style={{ fontSize: 24 }}>
                  <AnimatedCounter target={d.avgScore} decimals={1} />
                </div>
                <div className="stat-label">{d.count} debate{d.count !== 1 ? 's' : ''}</div>
              </Card3D>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Analytics;
