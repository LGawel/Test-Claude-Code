import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import {
  Users,
  Plus,
  Link as LinkIcon,
  Trophy,
  Euro,
  Snowflake,
  ChevronRight
} from 'lucide-react';

function Pools() {
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    loadPools();
  }, []);

  const loadPools = async () => {
    try {
      const response = await api.get('/pools/my-pools');
      setPools(response.data);
    } catch (error) {
      console.error('Failed to load pools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = (e) => {
    e.preventDefault();
    if (joinCode.trim()) {
      window.location.href = `/pools/join/${joinCode.trim().toUpperCase()}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Snowflake className="w-12 h-12 text-ice-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Mijn Poules</h1>
          <p className="text-ice-300 mt-1">Beheer je poules en bekijk de stand</p>
        </div>
        <Link to="/pools/create" className="btn-aurora flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nieuwe Poule
        </Link>
      </div>

      {/* Join by code */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-ice-400" />
          Poule joinen met code
        </h2>
        <form onSubmit={handleJoinByCode} className="flex gap-3">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            className="input-field flex-1 uppercase"
            placeholder="Voer invite code in (bijv. ABC123XY)"
            maxLength={8}
          />
          <button type="submit" className="btn-primary px-6">
            Join
          </button>
        </form>
        {joinError && (
          <p className="text-red-400 text-sm mt-2">{joinError}</p>
        )}
      </div>

      {/* Pools list */}
      {pools.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-16 h-16 text-ice-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Geen poules gevonden</h2>
          <p className="text-ice-400 mb-6">
            Maak een nieuwe poule aan of join een bestaande met een invite code
          </p>
          <Link to="/pools/create" className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Maak je eerste poule
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {pools.map((pool) => (
            <Link
              key={pool.id}
              to={`/pools/${pool.id}`}
              className="card-hover p-6 group"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold group-hover:text-ice-300 transition-colors">
                    {pool.name}
                  </h3>
                  <p className="text-ice-400 text-sm">{pool.tournament_name}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-ice-500 group-hover:text-ice-300 group-hover:translate-x-1 transition-all" />
              </div>

              {pool.description && (
                <p className="text-ice-300 text-sm mb-4 line-clamp-2">
                  {pool.description}
                </p>
              )}

              {/* Sports badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {pool.sports?.map((sport) => (
                  <span key={sport.id} className="sport-badge">
                    {sport.icon} {sport.name}
                  </span>
                ))}
              </div>

              {/* Pool stats */}
              <div className="flex items-center gap-6 pt-4 border-t border-ice-700/30">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-ice-500" />
                  <span>{pool.member_count} / {pool.max_members || 20}</span>
                </div>
                {pool.entry_fee > 0 && (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <Euro className="w-4 h-4 text-aurora-green" />
                      <span className="text-aurora-green">€{pool.entry_fee} inzet</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                      <span className="text-yellow-400">€{pool.prize_pool} pot</span>
                    </div>
                  </>
                )}
              </div>

              {/* Invite code */}
              <div className="mt-4 p-3 rounded-lg bg-ice-700/30 flex items-center justify-between">
                <span className="text-sm text-ice-400">Invite code:</span>
                <code className="font-mono text-ice-200 bg-ice-800/50 px-2 py-1 rounded">
                  {pool.invite_code}
                </code>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Pools;
