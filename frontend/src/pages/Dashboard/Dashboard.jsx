import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { statsService } from '../../services/statsService';
import { debateService } from '../../services/debateService';
import Card3D from '../../components/Card3D';
import AnimatedCounter from '../../components/AnimatedCounter';
import BentoGrid from '../../components/reactbits/BentoGrid';
import GradualBlur from '../../components/reactbits/GradualBlur';
import { Swords, Trophy, TrendingUp, Flame, ArrowRight, Sparkles } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentDebates, setRecentDebates] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, historyRes, analyticsRes] = await Promise.all([
        statsService.getStatistics(),
        debateService.getHistory({ limit: 5 }),
        statsService.getAnalytics(),
      ]);
      setStats(statsRes.statistics);
      setRecentDebates(historyRes.debates || []);
      setTrends(analyticsRes.analytics?.trends || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const getScoreClass = (score) => {
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  };

  if (loading) {
    return (
      <div className="loading-screen" style={{ minHeight: 'auto', paddingTop: 100 }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  const chartData = trends.map((t) => ({
    name: formatDate(t.date),
    score: t.overallScore,
  }));

  const tooltipStyle = {
    background: 'var(--chart-tooltip-bg)',
    border: '1px solid var(--chart-tooltip-border)',
    borderRadius: 12,
    color: 'var(--chart-tooltip-color)',
    fontSize: 13,
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  };

  const statCards = [
    { icon: Swords, label: 'Total Debates', value: stats?.totalDebates || 0, color: 'var(--primary)' },
    { icon: TrendingUp, label: 'Average Score', value: stats?.averageScore?.toFixed(1) || '0.0', color: 'var(--success)' },
    { icon: Trophy, label: 'Best Score', value: stats?.bestScore?.toFixed(1) || '0.0', color: 'var(--warning)' },
    { icon: Flame, label: 'Day Streak', value: stats?.currentStreak || 0, color: 'var(--accent)' },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={item} className="page-header">
        <h1>Dashboard</h1>
        <p>Track your debate performance and progress</p>
      </motion.div>

      {/* Bento Grid Layout */}
      <motion.div variants={item}>
        <BentoGrid>
          {/* Stat Cards — each 1 col */}
          {statCards.map((s, i) => (
            <BentoGrid.Cell key={i} colSpan={1} className="stat-card">
              <Card3D intensity={8}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 4 }}>
                  <div
                    className="stat-icon"
                    style={{ background: `${s.color}15`, color: s.color }}
                  >
                    <s.icon size={22} />
                  </div>
                  <div>
                    <div className="stat-value">
                      {typeof s.value === 'number' ? (
                        <AnimatedCounter target={s.value} decimals={s.label.includes('Score') ? 1 : 0} />
                      ) : (
                        s.value
                      )}
                    </div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                </div>
              </Card3D>
            </BentoGrid.Cell>
          ))}

          {/* Performance Chart — spans 3 cols */}
          <BentoGrid.Cell colSpan={3} className="chart-card" hoverScale={1.005}>
            <h3>Performance Trend</h3>
            <div style={{ position: 'relative' }}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="bentoScoreGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="name" stroke="var(--chart-text)" fontSize={11} />
                    <YAxis domain={[0, 10]} stroke="var(--chart-text)" fontSize={11} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      fill="url(#bentoScoreGrad)"
                      name="Score"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: '40px 0' }}>
                  <p>Complete debates to see your performance trend</p>
                </div>
              )}
              <GradualBlur
                position="bottom"
                height="3rem"
                strength={1.5}
                divCount={4}
                curve="bezier"
              />
            </div>
          </BentoGrid.Cell>

          {/* Recent Debates — spans 1 col, 2 rows */}
          <BentoGrid.Cell colSpan={1} rowSpan={1} hoverScale={1.005} style={{ padding: 24, minHeight: 300 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>Recent Debates</h3>
              {recentDebates.length > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/history')}>
                  View All <ArrowRight size={14} />
                </button>
              )}
            </div>

            {recentDebates.length > 0 ? (
              <div className="debate-list" style={{ position: 'relative', maxHeight: 220, overflow: 'auto' }}>
                {recentDebates.map((debate) => (
                  <motion.div
                    key={debate.id}
                    className="debate-list-item"
                    onClick={() =>
                      navigate(debate.status === 'completed' ? `/debate/${debate.id}/result` : `/debate/${debate.id}`)
                    }
                    style={{ padding: '10px 0' }}
                    whileHover={{ x: 4 }}
                  >
                    <div className="debate-list-info">
                      <div className="debate-list-topic" style={{ fontSize: 13 }}>{debate.topic}</div>
                      <div className="debate-list-meta">
                        <span>{formatDate(debate.started_at)}</span>
                        <span className={`status-badge ${debate.status}`}>{debate.status}</span>
                      </div>
                    </div>
                    {debate.overall_score && (
                      <span className={`score-badge ${getScoreClass(parseFloat(debate.overall_score))}`}>
                        {parseFloat(debate.overall_score).toFixed(1)}
                      </span>
                    )}
                  </motion.div>
                ))}
                <GradualBlur position="bottom" height="2rem" strength={1} divCount={3} />
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <div className="empty-icon">🎯</div>
                <h3 style={{ fontSize: 14 }}>No debates yet</h3>
                <p style={{ fontSize: 12 }}>Start debating to see history</p>
              </div>
            )}
          </BentoGrid.Cell>

          {/* CTA — Full Width */}
          <BentoGrid.Cell
            colSpan={4}
            className="bento-accent"
            hoverScale={1.008}
            style={{
              padding: '28px 32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={20} /> Ready for a challenge?
              </h3>
              <p style={{ color: 'var(--fg-secondary)', fontSize: 14, margin: 0 }}>
                Practice your argumentation skills with AI-powered debates
              </p>
            </div>
            <motion.button
              className="btn btn-primary btn-lg"
              onClick={() => navigate('/debate/new')}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
            >
              <Swords size={18} /> New Debate
            </motion.button>
          </BentoGrid.Cell>
        </BentoGrid>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
