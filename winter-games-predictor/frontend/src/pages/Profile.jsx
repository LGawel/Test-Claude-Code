import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import {
  User, Camera, Save, Trophy, Target, Zap, Calendar, Snowflake, Check, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

function Profile() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.get('/users/me');
      setProfile(response.data);
      setNickname(response.data.nickname);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNickname = async () => {
    if (nickname === profile.nickname) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await api.put('/users/me', { nickname });
      updateUser(response.data.user);
      setProfile(prev => ({ ...prev, nickname }));
      setSuccess('Nickname opgeslagen!');
    } catch (err) {
      setError(err.response?.data?.error || 'Kon nickname niet opslaan');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    setSaving(true);
    setError('');

    try {
      const response = await api.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      updateUser({ profile_image: response.data.imageUrl });
      setProfile(prev => ({ ...prev, profile_image: response.data.imageUrl }));
      setSuccess('Profielfoto geüpload!');
    } catch (err) {
      setError(err.response?.data?.error || 'Kon foto niet uploaden');
    } finally {
      setSaving(false);
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
    <div className="max-w-4xl mx-auto space-y-8 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Mijn Profiel</h1>
        <p className="text-ice-400 mt-1">Beheer je account en bekijk je statistieken</p>
      </div>

      {/* Profile card */}
      <div className="card p-8">
        <div className="flex flex-col md:flex-row items-start gap-8">
          {/* Avatar */}
          <div className="relative">
            {profile?.profile_image ? (
              <img
                src={profile.profile_image}
                alt={profile.nickname}
                className="w-32 h-32 rounded-full object-cover"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-ice-600 flex items-center justify-center text-4xl">
                {profile?.nickname?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-ice-500 hover:bg-ice-400 flex items-center justify-center transition-colors"
            >
              <Camera className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          {/* Info */}
          <div className="flex-1 w-full">
            {error && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-aurora-green/20 border border-aurora-green/30 text-aurora-green">
                <Check className="w-5 h-5" />
                <span>{success}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ice-400 mb-2">Nickname</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="input-field flex-1"
                  />
                  <button
                    onClick={handleSaveNickname}
                    disabled={saving || nickname === profile?.nickname}
                    className="btn-primary px-4 disabled:opacity-50"
                  >
                    {saving ? <Snowflake className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ice-400 mb-2">Email</label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="input-field bg-ice-700/30 cursor-not-allowed"
                />
              </div>

              <p className="text-sm text-ice-500">
                Lid sinds {format(new Date(profile?.created_at || Date.now()), 'd MMMM yyyy', { locale: nl })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-6 text-center">
          <Target className="w-8 h-8 text-ice-400 mx-auto mb-2" />
          <p className="text-3xl font-bold">{profile?.total_points || 0}</p>
          <p className="text-sm text-ice-400">Totaal Punten</p>
        </div>
        <div className="card p-6 text-center">
          <Calendar className="w-8 h-8 text-aurora-blue mx-auto mb-2" />
          <p className="text-3xl font-bold">{profile?.total_predictions || 0}</p>
          <p className="text-sm text-ice-400">Voorspellingen</p>
        </div>
        <div className="card p-6 text-center">
          <Zap className="w-8 h-8 text-aurora-pink mx-auto mb-2" />
          <p className="text-3xl font-bold">{profile?.longest_streak || 0}</p>
          <p className="text-sm text-ice-400">Langste Streak</p>
        </div>
        <div className="card p-6 text-center">
          <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <p className="text-3xl font-bold">{profile?.pools_won || 0}</p>
          <p className="text-sm text-ice-400">Poules Gewonnen</p>
        </div>
      </div>

      {/* Trophies preview */}
      {profile?.trophies?.length > 0 && (
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Trofeeën ({profile.trophies.length})
          </h2>
          <div className="flex flex-wrap gap-4">
            {profile.trophies.slice(0, 6).map((trophy, i) => (
              <div
                key={i}
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

      {/* Pools */}
      {profile?.pools?.length > 0 && (
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-ice-400" />
            Actieve Poules ({profile.pools.length})
          </h2>
          <div className="space-y-2">
            {profile.pools.map((pool) => (
              <a
                key={pool.id}
                href={`/pools/${pool.id}`}
                className="block p-4 rounded-lg bg-ice-700/30 hover:bg-ice-700/50 transition-colors"
              >
                <span className="font-medium">{pool.name}</span>
                <span className="text-ice-500 text-sm ml-2">
                  sinds {format(new Date(pool.joined_at), 'd MMM yyyy', { locale: nl })}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
