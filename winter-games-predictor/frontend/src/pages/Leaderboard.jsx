import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { Trophy, Medal, TrendingUp, Snowflake, Target, Zap } from 'lucide-react';

function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [sports, setSports] = useState([]);
  const [selectedSport, setSelectedSport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedSport) {
      loadSportLeaderboard(selectedSport);
    } else {
      loadGlobalLeaderboard();
    }
  }, [selectedSport]);

  const loadData = async () => {
    try {
      const [leaderboardRes, sportsRes] = await Promise.all([
        api.get('/leaderboards/global'),
        api.get('/pools/sports/all')
      ]);
      setLeaderboard(leaderboardRes.data.leaderboard);
      setSports(sportsRes.data);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGlobalLeaderboard = async () => {
    try {
      const response = await api.get('/leaderboards/global');
      setLeaderboard(response.data.leaderboard);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    }
  };

  const loadSportLeaderboard = async (sportId) => {
    try {
      const response = await api.get(`/leaderboards/sport/${sportId}`);
      setLeaderboard(response.data.leaderboard);
    } catch (error) {
      console.error('Failed to load sport leaderboard:', error);
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
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-400" />
          Ranglijst
        </h1>
        <p className="text-ice-400 mt-1">De beste voorspellers van alle poules</p>
      </div>

      {/* Sport filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedSport(null)}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
            !selectedSport ? 'bg-ice-600 text-white' : 'bg-ice-800/50 text-ice-300 hover:bg-ice-700/50'
          }`}
        >
          <Trophy className="w-4 h-4" />
          Totaal
        </button>
        {sports.map((sport) => (
          <button
            key={sport.id}
            onClick={() => setSelectedSport(sport.id)}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              selectedSport === sport.id ? 'bg-ice-600 text-white' : 'bg-ice-800/50 text-ice-300 hover:bg-ice-700/50'
            }`}
          >
            <span>{sport.icon}</span>
            {sport.name}
          </button>
        ))}
      </div>

      {/* Top 3 podium */}
      {leaderboard.length >= 3 && (
        <div className="grid grid-cols-3 gap-4">
          {/* Second place */}
          <div className="card p-6 text-center order-1 md:mt-8">
            <div className="w-16 h-16 mx-auto rounded-full medal-silver flex items-center justify-center text-2xl font-bold mb-3">
              2
            </div>
            {leaderboard[1]?.profile_image ? (
              <img src={leaderboard[1].profile_image} alt="" className="w-16 h-16 rounded-full mx-auto object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-ice-600 flex items-center justify-center mx-auto text-2xl">
                {leaderboard[1]?.nickname?.charAt(0)}
              </div>
            )}
            <p className="font-bold mt-3">{leaderboard[1]?.nickname}</p>
            <p className="text-2xl font-bold text-ice-300 mt-1">{leaderboard[1]?.total_points || leaderboard[1]?.sport_points}</p>
            <p className="text-xs text-ice-500">punten</p>
          </div>

          {/* First place */}
          <div className="card p-6 text-center order-0 md:order-1 bg-gradient-to-b from-yellow-500/20 to-transparent border-yellow-500/30">
            <div className="w-20 h-20 mx-auto rounded-full medal-gold flex items-center justify-center text-3xl font-bold mb-3 ring-4 ring-yellow-400/30">
              1
            </div>
            {leaderboard[0]?.profile_image ? (
              <img src={leaderboard[0].profile_image} alt="" className="w-20 h-20 rounded-full mx-auto object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-ice-600 flex items-center justify-center mx-auto text-3xl">
                {leaderboard[0]?.nickname?.charAt(0)}
              </div>
            )}
            <p className="font-bold mt-3 text-lg">{leaderboard[0]?.nickname}</p>
            <p className="text-3xl font-bold text-yellow-400 mt-1">{leaderboard[0]?.total_points || leaderboard[0]?.sport_points}</p>
            <p className="text-xs text-ice-500">punten</p>
          </div>

          {/* Third place */}
          <div className="card p-6 text-center order-2 md:mt-12">
            <div className="w-14 h-14 mx-auto rounded-full medal-bronze flex items-center justify-center text-xl font-bold mb-3">
              3
            </div>
            {leaderboard[2]?.profile_image ? (
              <img src={leaderboard[2].profile_image} alt="" className="w-14 h-14 rounded-full mx-auto object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-ice-600 flex items-center justify-center mx-auto text-xl">
                {leaderboard[2]?.nickname?.charAt(0)}
              </div>
            )}
            <p className="font-bold mt-3">{leaderboard[2]?.nickname}</p>
            <p className="text-xl font-bold text-ice-300 mt-1">{leaderboard[2]?.total_points || leaderboard[2]?.sport_points}</p>
            <p className="text-xs text-ice-500">punten</p>
          </div>
        </div>
      )}

      {/* Full leaderboard */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-ice-700/30">
              <tr>
                <th className="text-left p-4 font-medium text-ice-400">#</th>
                <th className="text-left p-4 font-medium text-ice-400">Speler</th>
                <th className="text-center p-4 font-medium text-ice-400">
                  <Target className="w-4 h-4 inline" /> Voorspellingen
                </th>
                <th className="text-center p-4 font-medium text-ice-400">
                  <Zap className="w-4 h-4 inline" /> Streak
                </th>
                <th className="text-right p-4 font-medium text-ice-400">
                  <Trophy className="w-4 h-4 inline" /> Punten
                </th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => (
                <tr
                  key={entry.id}
                  className={`border-t border-ice-700/30 hover:bg-ice-700/20 transition-colors ${
                    entry.id === user?.id ? 'bg-ice-600/20' : ''
                  }`}
                >
                  <td className="p-4">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'medal-gold' :
                      index === 1 ? 'medal-silver' :
                      index === 2 ? 'medal-bronze' :
                      'bg-ice-700'
                    }`}>
                      {entry.rank || index + 1}
                    </span>
                  </td>
                  <td className="p-4">
                    <Link to={`/user/${entry.id}`} className="flex items-center gap-3 hover:text-ice-300">
                      {entry.profile_image ? (
                        <img src={entry.profile_image} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-ice-600 flex items-center justify-center">
                          {entry.nickname?.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{entry.nickname}</p>
                        {entry.pools_won > 0 && (
                          <p className="text-xs text-yellow-400">{entry.pools_won} poule(s) gewonnen</p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="p-4 text-center">
                    {entry.total_predictions || entry.predictions_made || 0}
                  </td>
                  <td className="p-4 text-center">
                    {entry.longest_streak > 0 && (
                      <span className="text-aurora-pink">{entry.longest_streak}</span>
                    )}
                  </td>
                  <td className="p-4 text-right font-bold text-lg">
                    {entry.total_points || entry.sport_points || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {leaderboard.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-ice-600 mx-auto mb-3" />
            <p className="text-ice-400">Nog geen voorspellingen gemaakt</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;
