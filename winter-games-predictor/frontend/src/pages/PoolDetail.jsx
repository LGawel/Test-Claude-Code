import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import {
  Users,
  Trophy,
  Euro,
  Calendar,
  MessageSquare,
  Copy,
  Check,
  Snowflake,
  Crown,
  Clock,
  Target
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

function PoolDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [pool, setPool] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadPoolData();
  }, [id]);

  const loadPoolData = async () => {
    try {
      const [poolRes, leaderboardRes] = await Promise.all([
        api.get(`/pools/${id}`),
        api.get(`/leaderboards/pool/${id}`)
      ]);
      setPool(poolRes.data);
      setLeaderboard(leaderboardRes.data.leaderboard);
    } catch (error) {
      console.error('Failed to load pool:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/pools/join/${pool.invite_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Snowflake className="w-12 h-12 text-ice-400 animate-spin" />
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Poule niet gevonden</h2>
      </div>
    );
  }

  const isCreator = pool.created_by === user?.id;

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold">{pool.name}</h1>
            <p className="text-ice-400 mt-1">{pool.tournament_name}</p>
            {pool.description && (
              <p className="text-ice-300 mt-3">{pool.description}</p>
            )}

            <div className="flex flex-wrap gap-2 mt-4">
              {pool.sports?.map((sport) => (
                <span key={sport.id} className="sport-badge">
                  {sport.icon} {sport.name}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {pool.entry_fee > 0 && (
              <div className="bg-aurora-green/20 rounded-lg p-4 text-center">
                <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-sm text-ice-400">Prijzenpot</p>
                <p className="text-2xl font-bold text-aurora-green">€{pool.prize_pool}</p>
              </div>
            )}

            <button
              onClick={copyInviteLink}
              className="btn-secondary flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Gekopieerd!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Kopieer invite link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-ice-700/30">
          <div className="text-center">
            <Users className="w-6 h-6 text-ice-400 mx-auto mb-1" />
            <p className="text-2xl font-bold">{pool.members?.length}</p>
            <p className="text-sm text-ice-400">Leden</p>
          </div>
          <div className="text-center">
            <Euro className="w-6 h-6 text-aurora-green mx-auto mb-1" />
            <p className="text-2xl font-bold">€{pool.entry_fee}</p>
            <p className="text-sm text-ice-400">Inzet</p>
          </div>
          <div className="text-center">
            <Calendar className="w-6 h-6 text-ice-400 mx-auto mb-1" />
            <p className="text-2xl font-bold">{pool.upcoming_events?.length || 0}</p>
            <p className="text-sm text-ice-400">Events</p>
          </div>
          <div className="text-center">
            <code className="text-lg font-mono text-ice-300">{pool.invite_code}</code>
            <p className="text-sm text-ice-400 mt-1">Invite Code</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 flex-wrap">
        <Link
          to={`/pools/${id}/events`}
          className="btn-primary flex items-center gap-2"
        >
          <Target className="w-5 h-5" />
          Voorspellingen maken
        </Link>
        <Link
          to={`/pools/${id}/board`}
          className="btn-secondary flex items-center gap-2"
        >
          <MessageSquare className="w-5 h-5" />
          Prikbord
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Leaderboard */}
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Ranglijst
          </h2>

          <div className="space-y-2">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex items-center gap-4 p-3 rounded-lg ${
                  entry.id === user?.id ? 'bg-ice-600/30 ring-1 ring-ice-500' : 'bg-ice-700/20'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  index === 0 ? 'medal-gold' :
                  index === 1 ? 'medal-silver' :
                  index === 2 ? 'medal-bronze' :
                  'bg-ice-700'
                }`}>
                  {index + 1}
                </div>

                {entry.profile_image ? (
                  <img
                    src={entry.profile_image}
                    alt={entry.nickname}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-ice-600 flex items-center justify-center">
                    {entry.nickname.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{entry.nickname}</span>
                    {entry.id === pool.created_by && (
                      <Crown className="w-4 h-4 text-yellow-400" />
                    )}
                  </div>
                  <p className="text-sm text-ice-400">{entry.predictions_made} voorspellingen</p>
                </div>

                <div className="text-right">
                  <p className="text-xl font-bold text-ice-300">{entry.total_points}</p>
                  <p className="text-xs text-ice-500">punten</p>
                </div>

                {pool.entry_fee > 0 && (
                  <div className={`w-3 h-3 rounded-full ${entry.has_paid ? 'bg-aurora-green' : 'bg-red-400'}`}
                    title={entry.has_paid ? 'Betaald' : 'Niet betaald'}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming events */}
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-ice-400" />
            Aankomende Wedstrijden
          </h2>

          {pool.upcoming_events?.length === 0 ? (
            <p className="text-ice-400 text-center py-8">Geen aankomende wedstrijden</p>
          ) : (
            <div className="space-y-3">
              {pool.upcoming_events?.map((event) => (
                <Link
                  key={event.id}
                  to={`/pools/${id}/events/${event.id}`}
                  className="block p-4 rounded-lg bg-ice-700/30 hover:bg-ice-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{event.sport_icon}</span>
                        <span className="font-medium">{event.name}</span>
                      </div>
                      <p className="text-sm text-ice-400 mt-1">
                        {format(new Date(event.event_date), 'EEE d MMM, HH:mm', { locale: nl })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-aurora-pink">
                      <Clock className="w-4 h-4" />
                      {formatDistanceToNow(new Date(event.deadline), { locale: nl, addSuffix: true })}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <Link
            to={`/pools/${id}/events`}
            className="block text-center text-ice-400 hover:text-white mt-4 pt-4 border-t border-ice-700/30"
          >
            Bekijk alle wedstrijden →
          </Link>
        </div>
      </div>

      {/* Members */}
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Users className="w-5 h-5 text-ice-400" />
          Leden ({pool.members?.length}/{pool.max_members})
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {pool.members?.map((member) => (
            <Link
              key={member.id}
              to={`/user/${member.id}`}
              className="text-center p-4 rounded-lg bg-ice-700/30 hover:bg-ice-700/50 transition-colors"
            >
              {member.profile_image ? (
                <img
                  src={member.profile_image}
                  alt={member.nickname}
                  className="w-12 h-12 rounded-full object-cover mx-auto"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-ice-600 flex items-center justify-center mx-auto">
                  {member.nickname.charAt(0).toUpperCase()}
                </div>
              )}
              <p className="font-medium mt-2 truncate">{member.nickname}</p>
              {member.id === pool.created_by && (
                <span className="text-xs text-yellow-400 flex items-center justify-center gap-1 mt-1">
                  <Crown className="w-3 h-3" /> Admin
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PoolDetail;
