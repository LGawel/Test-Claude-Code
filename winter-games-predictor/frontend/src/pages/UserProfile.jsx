import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { Trophy, Target, Zap, Calendar, Snowflake, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

function UserProfile() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [id]);

  const loadProfile = async () => {
    try {
      const [profileRes, historyRes] = await Promise.all([
        api.get(`/users/${id}`),
        api.get(`/users/${id}/history`)
      ]);
      setProfile(profileRes.data);
      setHistory(historyRes.data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Snowflake className="w-12 h-12 text-ice-400 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Gebruiker niet gevonden</h2>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-slide-up">
      <Link
        to="/leaderboard"
        className="flex items-center gap-2 text-ice-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Terug naar ranglijst
      </Link>

      {/* Profile header */}
      <div className="card p-8 text-center">
        {profile.profile_image ? (
          <img
            src={profile.profile_image}
            alt={profile.nickname}
            className="w-32 h-32 rounded-full object-cover mx-auto"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-ice-600 flex items-center justify-center mx-auto text-4xl">
            {profile.nickname?.charAt(0)?.toUpperCase()}
          </div>
        )}
        <h1 className="text-3xl font-bold mt-4">{profile.nickname}</h1>
        <p className="text-ice-400 mt-1">
          Lid sinds {format(new Date(profile.created_at), 'd MMMM yyyy', { locale: nl })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-6 text-center">
          <Target className="w-8 h-8 text-ice-400 mx-auto mb-2" />
          <p className="text-3xl font-bold">{profile.total_points || 0}</p>
          <p className="text-sm text-ice-400">Punten</p>
        </div>
        <div className="card p-6 text-center">
          <Calendar className="w-8 h-8 text-aurora-blue mx-auto mb-2" />
          <p className="text-3xl font-bold">{profile.total_predictions || 0}</p>
          <p className="text-sm text-ice-400">Voorspellingen</p>
        </div>
        <div className="card p-6 text-center">
          <Zap className="w-8 h-8 text-aurora-pink mx-auto mb-2" />
          <p className="text-3xl font-bold">{profile.longest_streak || 0}</p>
          <p className="text-sm text-ice-400">Beste Streak</p>
        </div>
        <div className="card p-6 text-center">
          <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <p className="text-3xl font-bold">{profile.pools_won || 0}</p>
          <p className="text-sm text-ice-400">Poules Gewonnen</p>
        </div>
      </div>

      {/* Trophies */}
      {profile.trophies?.length > 0 && (
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Bekerkast ({profile.trophies.length})
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {profile.trophies.map((trophy, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-4 rounded-lg bg-ice-700/30 trophy-shine"
              >
                <span className="text-4xl">{trophy.icon}</span>
                <div>
                  <p className="font-semibold">{trophy.name}</p>
                  <p className="text-xs text-ice-400">{trophy.description}</p>
                  <p className="text-xs text-ice-500 mt-1">
                    {format(new Date(trophy.earned_at), 'd MMM yyyy', { locale: nl })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent predictions */}
      {history.length > 0 && (
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4">Recente Voorspellingen</h2>
          <div className="space-y-3">
            {history.slice(0, 10).map((pred) => (
              <div key={pred.id} className="p-4 rounded-lg bg-ice-700/30">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{pred.event_name}</p>
                    <p className="text-sm text-ice-400">{pred.sport_name} - {pred.pool_name}</p>
                  </div>
                  {pred.points_earned > 0 && (
                    <span className="text-aurora-green font-bold">+{pred.points_earned} pts</span>
                  )}
                </div>
                <div className="flex gap-4 mt-2 text-sm">
                  <span>
                    <span className="medal-gold px-1.5 py-0.5 rounded text-xs font-bold">1</span>
                    {' '}{pred.predicted_first || '-'}
                  </span>
                  <span>
                    <span className="medal-silver px-1.5 py-0.5 rounded text-xs font-bold">2</span>
                    {' '}{pred.predicted_second || '-'}
                  </span>
                  <span>
                    <span className="medal-bronze px-1.5 py-0.5 rounded text-xs font-bold">3</span>
                    {' '}{pred.predicted_third || '-'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserProfile;
