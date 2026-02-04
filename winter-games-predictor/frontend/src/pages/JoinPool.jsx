import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Users, Euro, Trophy, Check, Snowflake, AlertCircle } from 'lucide-react';

function JoinPool() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const [pool, setPool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPoolInfo();
  }, [inviteCode]);

  const loadPoolInfo = async () => {
    try {
      const response = await api.get(`/pools/invite/${inviteCode}`);
      setPool(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Ongeldige invite code');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setJoining(true);
    setError('');

    try {
      const response = await api.post(`/pools/join/${inviteCode}`);
      navigate(`/pools/${response.data.pool.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Kon niet joinen');
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Snowflake className="w-12 h-12 text-ice-400 animate-spin" />
      </div>
    );
  }

  if (error && !pool) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Oeps!</h2>
        <p className="text-ice-400 mb-6">{error}</p>
        <button onClick={() => navigate('/pools')} className="btn-primary">
          Terug naar poules
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto animate-slide-up">
      <div className="card p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-ice-600/30 flex items-center justify-center mx-auto mb-6">
          <Users className="w-10 h-10 text-ice-400" />
        </div>

        <h1 className="text-2xl font-bold mb-2">Je bent uitgenodigd!</h1>
        <p className="text-ice-400 mb-6">Word lid van deze poule en speel mee</p>

        <div className="bg-ice-700/30 rounded-xl p-6 mb-6 text-left">
          <h2 className="text-xl font-bold mb-1">{pool.name}</h2>
          <p className="text-ice-400 text-sm mb-4">{pool.tournament_name}</p>

          {pool.description && (
            <p className="text-ice-300 text-sm mb-4">{pool.description}</p>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {pool.sports?.map((sport, i) => (
              <span key={i} className="sport-badge">
                {sport.icon} {sport.name}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-6 pt-4 border-t border-ice-600/30">
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-ice-500" />
              <span>{pool.member_count} / {pool.max_members}</span>
            </div>
            {pool.entry_fee > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Euro className="w-4 h-4 text-aurora-green" />
                <span className="text-aurora-green">€{pool.entry_fee} inzet</span>
              </div>
            )}
          </div>

          <p className="text-sm text-ice-500 mt-4">
            Aangemaakt door {pool.creator_name}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {pool.is_member ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-aurora-green">
              <Check className="w-5 h-5" />
              <span>Je bent al lid van deze poule</span>
            </div>
            <button
              onClick={() => navigate(`/pools/${pool.id}`)}
              className="btn-primary w-full"
            >
              Ga naar poule
            </button>
          </div>
        ) : (
          <button
            onClick={handleJoin}
            disabled={joining}
            className="btn-aurora w-full py-3 disabled:opacity-50"
          >
            {joining ? (
              <span className="flex items-center justify-center gap-2">
                <Snowflake className="w-5 h-5 animate-spin" />
                Bezig met joinen...
              </span>
            ) : (
              'Word lid van deze poule'
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default JoinPool;
