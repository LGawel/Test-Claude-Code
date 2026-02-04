import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { Trophy, Lock, Snowflake, Award } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

function Trophies() {
  const { user } = useAuth();
  const [allTrophies, setAllTrophies] = useState([]);
  const [userTrophies, setUserTrophies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrophies();
  }, []);

  const loadTrophies = async () => {
    try {
      const [allRes, userRes] = await Promise.all([
        api.get('/trophies'),
        api.get(`/trophies/user/${user.id}`)
      ]);
      setAllTrophies(allRes.data);
      setUserTrophies(userRes.data.trophies || []);
    } catch (error) {
      console.error('Failed to load trophies:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasEarned = (trophyId) => {
    return userTrophies.some(t => t.id === trophyId);
  };

  const getEarnedDate = (trophyId) => {
    const trophy = userTrophies.find(t => t.id === trophyId);
    return trophy?.earned_at;
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
          <Award className="w-8 h-8 text-yellow-400" />
          Bekerkast
        </h1>
        <p className="text-ice-400 mt-1">
          {userTrophies.length} van {allTrophies.length} trofeeën behaald
        </p>
      </div>

      {/* Progress */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-ice-400">Voortgang</span>
          <span className="font-bold">{Math.round((userTrophies.length / allTrophies.length) * 100)}%</span>
        </div>
        <div className="w-full bg-ice-700 rounded-full h-3">
          <div
            className="bg-aurora-gradient h-3 rounded-full transition-all duration-500"
            style={{ width: `${(userTrophies.length / allTrophies.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Earned trophies */}
      {userTrophies.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Behaalde Trofeeën
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {userTrophies.map((trophy) => (
              <div
                key={`earned-${trophy.id}-${trophy.earned_at}`}
                className="card p-6 trophy-shine bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/20"
              >
                <div className="flex items-start gap-4">
                  <span className="text-5xl">{trophy.icon}</span>
                  <div>
                    <h3 className="font-bold text-lg">{trophy.name}</h3>
                    <p className="text-sm text-ice-400 mt-1">{trophy.description}</p>
                    <p className="text-xs text-ice-500 mt-2">
                      Behaald op {format(new Date(trophy.earned_at), 'd MMMM yyyy', { locale: nl })}
                    </p>
                    {trophy.pool_name && (
                      <p className="text-xs text-aurora-blue mt-1">
                        Poule: {trophy.pool_name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All trophies */}
      <div>
        <h2 className="text-xl font-bold mb-4">Alle Trofeeën</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allTrophies.map((trophy) => {
            const earned = hasEarned(trophy.id);
            return (
              <div
                key={trophy.id}
                className={`card p-6 transition-all ${
                  earned
                    ? 'bg-gradient-to-br from-yellow-500/10 to-transparent border-yellow-500/20'
                    : 'opacity-60 grayscale'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <span className="text-5xl">{trophy.icon}</span>
                    {!earned && (
                      <Lock className="absolute -bottom-1 -right-1 w-5 h-5 text-ice-500 bg-ice-800 rounded-full p-0.5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{trophy.name}</h3>
                    <p className="text-sm text-ice-400 mt-1">{trophy.description}</p>
                    {earned && (
                      <span className="inline-flex items-center gap-1 text-xs text-aurora-green mt-2">
                        <Trophy className="w-3 h-3" /> Behaald
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trophy legend */}
      <div className="card p-6">
        <h2 className="text-lg font-bold mb-4">Hoe verdien je trofeeën?</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-xl">🏆</span>
            <div>
              <p className="font-medium">Poule Kampioen</p>
              <p className="text-ice-400">Win een poule door de meeste punten te halen</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xl">🎯</span>
            <div>
              <p className="font-medium">Perfecte Voorspelling</p>
              <p className="text-ice-400">Voorspel de complete top 3 correct</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xl">🌍</span>
            <div>
              <p className="font-medium">Wereldrecord Voorspeller</p>
              <p className="text-ice-400">Voorspel correct dat er een WR wordt gebroken</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xl">🔥</span>
            <div>
              <p className="font-medium">Op Dreef</p>
              <p className="text-ice-400">5 correcte voorspellingen op rij</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xl">⚡</span>
            <div>
              <p className="font-medium">Onstopbaar</p>
              <p className="text-ice-400">10 correcte voorspellingen op rij</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xl">🎖️</span>
            <div>
              <p className="font-medium">Veteraan</p>
              <p className="text-ice-400">Neem deel aan 10 verschillende poules</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Trophies;
