import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { debateService } from '../../services/debateService';
import AnimatedList from '../../components/reactbits/AnimatedList';
import { Search, Trash2 } from 'lucide-react';

const History = () => {
  const [debates, setDebates] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [page, setPage] = useState(0);
  const limit = 20;
  const navigate = useNavigate();

  useEffect(() => {
    loadHistory();
  }, [search, statusFilter, difficultyFilter, page]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const result = await debateService.getHistory({
        limit,
        offset: page * limit,
        search: search || undefined,
        status: statusFilter || undefined,
        difficulty: difficultyFilter || undefined,
      });
      setDebates(result.debates || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, debateId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this debate?')) {
      try {
        await debateService.delete(debateId);
        setDebates(debates.filter((d) => d.id !== debateId));
        setTotal((prev) => prev - 1);
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const formatDuration = (seconds) => {
    if (!seconds) return '—';
    return `${Math.floor(seconds / 60)}m`;
  };

  const getScoreClass = (score) => {
    if (!score) return '';
    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  };

  const totalPages = Math.ceil(total / limit);

  const renderDebateItem = (debate, index, isSelected) => (
    <div
      className={`glass-card debate-list-item ${isSelected ? 'selected' : ''}`}
      style={{ marginBottom: 0, cursor: 'pointer' }}
    >
      <div className="debate-list-info">
        <div className="debate-list-topic">{debate.topic}</div>
        <div className="debate-list-meta">
          <span>{formatDate(debate.started_at)}</span>
          <span style={{ textTransform: 'capitalize' }}>{debate.difficulty}</span>
          <span>{debate.user_side === 'support' ? 'Supporting' : 'Opposing'}</span>
          <span>{formatDuration(debate.duration)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className={`status-badge ${debate.status}`}>{debate.status}</span>

        {debate.overall_score && (
          <span className={`score-badge ${getScoreClass(parseFloat(debate.overall_score))}`}>
            {parseFloat(debate.overall_score).toFixed(1)}
          </span>
        )}

        <motion.button
          className="btn btn-ghost btn-icon btn-sm"
          onClick={(e) => handleDelete(e, debate.id)}
          title="Delete debate"
          whileHover={{ scale: 1.2, color: 'var(--danger)' }}
          whileTap={{ scale: 0.9 }}
        >
          <Trash2 size={14} />
        </motion.button>
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <h1>Debate History</h1>
        <p>{total} debate{total !== 1 ? 's' : ''} recorded</p>
      </div>

      {/* Filters */}
      <div className="history-filters">
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--fg-tertiary)',
              zIndex: 1,
            }}
          />
          <input
            type="text"
            className="input"
            placeholder="Search topics..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            style={{ paddingLeft: 36, width: '100%' }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
        >
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="active">Active</option>
        </select>

        <select
          value={difficultyFilter}
          onChange={(e) => { setDifficultyFilter(e.target.value); setPage(0); }}
        >
          <option value="">All Difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
          <option value="expert">Expert</option>
        </select>
      </div>

      {/* Debate List with AnimatedList */}
      {loading ? (
        <div className="loading-screen" style={{ minHeight: 200 }}>
          <div className="loading-spinner" />
        </div>
      ) : debates.length > 0 ? (
        <AnimatedList
          items={debates}
          onItemSelect={(debate) =>
            navigate(
              debate.status === 'completed'
                ? `/debate/${debate.id}/result`
                : `/debate/${debate.id}`
            )
          }
          renderItem={renderDebateItem}
          showGradients={true}
          enableArrowNavigation={true}
          displayScrollbar={true}
        />
      ) : (
        <div className="glass-card empty-state">
          <div className="empty-icon">📝</div>
          <h3>No debates found</h3>
          <p>
            {search || statusFilter || difficultyFilter
              ? 'Try adjusting your filters'
              : 'Start debating to build your history'}
          </p>
          {!search && !statusFilter && !difficultyFilter && (
            <button className="btn btn-primary" onClick={() => navigate('/debate/new')}>
              Start First Debate
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
          <motion.button
            className="btn btn-secondary btn-sm"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Previous
          </motion.button>
          <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--fg-secondary)' }}>
            Page {page + 1} of {totalPages}
          </span>
          <motion.button
            className="btn btn-secondary btn-sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Next
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};

export default History;
