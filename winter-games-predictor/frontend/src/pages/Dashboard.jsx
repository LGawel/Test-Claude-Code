import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import {
  Trophy,
  Users,
  Calendar,
  TrendingUp,
  Plus,
  ChevronRight,
  Clock,
  Target,
  Award,
  Snowflake
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

function Dashboard() {
  const { user } = useAuth();
  const [pools, setPools] = useState([]);
  const [stats, setStats] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [poolsRes, profileRes] = await Promise.all([
        api.get('/pools/my-pools'),
        api.get('/users/me')
      ]);
      setPools(poolsRes.data);
      setStats(profileRes.data);

      // Get upcoming events from first pool
      if (poolsRes.data.length > 0) {
        const eventsRes = await api.get(`/events/pool/${poolsRes.data[0].id}`);
        const upcoming = eventsRes.data
          .filter(e => new Date(e.deadline) > new Date())
          .slice(0, 5);
        setUpcomingEvents(upcoming);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
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

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Welkom terug, <span className="text-gradient">{user?.nickname}</span>!
          </h1>
          <p className="text-ice-300 mt-1">
            Bekijk je voorspellingen en ranglijsten
          </p>
        </div>
        <Link to="/pools/create" className="btn-aurora flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nieuwe Poule
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-ice-600/30 flex items-center justify-center">
              <Target className="w-6 h-6 text-ice-400" />
            </div>
            <div>
              <p className="text-sm text-ice-400">Totaal Punten</p>
              <p className="text-2xl font-bold">{stats?.total_points || 0}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-aurora-green/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-aurora-green" />
            </div>
            <div>
              <p className="text-sm text-ice-400">Voorspellingen</p>
              <p className="text-2xl font-bold">{stats?.total_predictions || 0}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-aurora-purple/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-aurora-purple" />
            </div>
            <div>
              <p className="text-sm text-ice-400">Poules</p>
              <p className="text-2xl font-bold">{pools.length}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <Award className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-ice-400">Trofeeën</p>
              <p className="text-2xl font-bold">{stats?.trophies?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* My Pools */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-ice-400" />
              Mijn Poules
            </h2>
            <Link to="/pools" className="text-ice-400 hover:text-white text-sm flex items-center gap-1">
              Bekijk alle <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {pools.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-ice-600 mx-auto mb-3" />
              <p className="text-ice-400 mb-4">Je zit nog niet in een poule</p>
              <Link to="/pools/create" className="btn-primary inline-flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Maak een poule aan
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {pools.slice(0, 4).map((pool) => (
                <Link
                  key={pool.id}
                  to={`/pools/${pool.id}`}
                  className="block p-4 rounded-lg bg-ice-700/30 hover:bg-ice-700/50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{pool.name}</h3>
                      <p className="text-sm text-ice-400">{pool.tournament_name}</p>
                      <div className="flex gap-2 mt-2">
                        {pool.sports?.map((sport) => (
                          <span key={sport.id} className="sport-badge text-xs">
                            {sport.icon} {sport.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-ice-400">{pool.member_count} leden</span>
                      {pool.entry_fee > 0 && (
                        <p className="text-sm text-aurora-green font-medium">
                          €{pool.entry_fee} inzet
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-ice-400" />
              Aankomende Wedstrijden
            </h2>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-ice-600 mx-auto mb-3" />
              <p className="text-ice-400">Geen aankomende wedstrijden</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  to={`/pools/${pools[0]?.id}/events/${event.id}`}
                  className="block p-4 rounded-lg bg-ice-700/30 hover:bg-ice-700/50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{event.sport_icon}</span>
                        <h3 className="font-semibold">{event.name}</h3>
                      </div>
                      <p className="text-sm text-ice-400 mt-1">
                        {format(new Date(event.event_date), 'EEEE d MMMM, HH:mm', { locale: nl })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-aurora-pink" />
                      <span className="text-aurora-pink">
                        {formatDistanceToNow(new Date(event.deadline), { locale: nl, addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  {event.user_prediction ? (
                    <div className="mt-2 text-sm text-aurora-green flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      Voorspelling gedaan
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-aurora-pink flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      Nog niet voorspeld
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Trophies */}
      {stats?.trophies?.length > 0 && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Recente Trofeeën
            </h2>
            <Link to="/trophies" className="text-ice-400 hover:text-white text-sm flex items-center gap-1">
              Bekijk bekerkast <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex flex-wrap gap-4">
            {stats.trophies.slice(0, 5).map((trophy) => (
              <div
                key={trophy.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-ice-700/30 trophy-shine"
              >
                <span className="text-3xl">{trophy.icon}</span>
                <div>
                  <p className="font-medium">{trophy.name}</p>
                  <p className="text-xs text-ice-400">{trophy.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
