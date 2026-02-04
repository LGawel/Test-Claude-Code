import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import {
  Users,
  Trophy,
  Euro,
  Check,
  Snowflake,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';

function CreatePool() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sports, setSports] = useState([]);
  const [tournaments, setTournaments] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tournament_id: '',
    entry_fee: 0,
    sport_ids: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sportsRes, tournamentsRes] = await Promise.all([
        api.get('/pools/sports/all'),
        api.get('/pools/tournaments/all')
      ]);
      setSports(sportsRes.data);
      setTournaments(tournamentsRes.data);
      if (tournamentsRes.data.length > 0) {
        setFormData(prev => ({ ...prev, tournament_id: tournamentsRes.data[0].id }));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const toggleSport = (sportId) => {
    setFormData(prev => ({
      ...prev,
      sport_ids: prev.sport_ids.includes(sportId)
        ? prev.sport_ids.filter(id => id !== sportId)
        : [...prev.sport_ids, sportId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Voer een naam in voor de poule');
      return;
    }

    if (formData.sport_ids.length === 0) {
      setError('Selecteer minimaal één sport');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/pools', formData);
      navigate(`/pools/${response.data.pool.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Poule aanmaken mislukt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-ice-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Terug
        </button>
        <h1 className="text-3xl font-bold">Nieuwe Poule Aanmaken</h1>
        <p className="text-ice-300 mt-1">Maak een poule en nodig je vrienden uit!</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Pool name */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-ice-400" />
            Poule Details
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ice-300 mb-2">
                Poule Naam *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="input-field"
                placeholder="bijv. Winterspelen 2026 Vriendengroep"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ice-300 mb-2">
                Beschrijving (optioneel)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="input-field resize-none"
                rows={3}
                placeholder="Korte beschrijving van de poule..."
              />
            </div>
          </div>
        </div>

        {/* Tournament selection */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-ice-400" />
            Toernooi
          </h2>

          <div className="space-y-3">
            {tournaments.map((tournament) => (
              <label
                key={tournament.id}
                className={`flex items-center p-4 rounded-lg cursor-pointer transition-all ${
                  formData.tournament_id === tournament.id
                    ? 'bg-ice-600/30 border-2 border-ice-500'
                    : 'bg-ice-700/30 border-2 border-transparent hover:bg-ice-700/50'
                }`}
              >
                <input
                  type="radio"
                  name="tournament"
                  value={tournament.id}
                  checked={formData.tournament_id === tournament.id}
                  onChange={(e) => setFormData(prev => ({ ...prev, tournament_id: parseInt(e.target.value) }))}
                  className="sr-only"
                />
                <div className="flex-1">
                  <p className="font-semibold">{tournament.name}</p>
                  <p className="text-sm text-ice-400">{tournament.location}</p>
                </div>
                {formData.tournament_id === tournament.id && (
                  <Check className="w-5 h-5 text-ice-400" />
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Sports selection */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">
            Selecteer Sporten *
          </h2>
          <p className="text-ice-400 text-sm mb-4">
            Kies welke sporten je in deze poule wilt voorspellen
          </p>

          <div className="grid sm:grid-cols-3 gap-3">
            {sports.map((sport) => (
              <button
                key={sport.id}
                type="button"
                onClick={() => toggleSport(sport.id)}
                className={`p-4 rounded-lg text-center transition-all ${
                  formData.sport_ids.includes(sport.id)
                    ? 'bg-ice-600/30 border-2 border-ice-500 ring-2 ring-ice-500/30'
                    : 'bg-ice-700/30 border-2 border-transparent hover:bg-ice-700/50'
                }`}
              >
                <span className="text-3xl block mb-2">{sport.icon}</span>
                <span className="font-medium">{sport.name}</span>
                {formData.sport_ids.includes(sport.id) && (
                  <Check className="w-5 h-5 text-ice-400 mx-auto mt-2" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Entry fee */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Euro className="w-5 h-5 text-aurora-green" />
            Inzet (optioneel)
          </h2>
          <p className="text-ice-400 text-sm mb-4">
            Stel een inzet in voor extra spanning. De winnaar krijgt de hele pot!
          </p>

          <div className="flex items-center gap-3">
            <span className="text-2xl">€</span>
            <input
              type="number"
              value={formData.entry_fee}
              onChange={(e) => setFormData(prev => ({ ...prev, entry_fee: parseFloat(e.target.value) || 0 }))}
              className="input-field w-32"
              min="0"
              step="0.50"
            />
            <span className="text-ice-400">per persoon</span>
          </div>

          {formData.entry_fee > 0 && (
            <p className="text-aurora-green text-sm mt-3">
              Leden betalen €{formData.entry_fee.toFixed(2)} om mee te doen.
              Jij als maker beheert de betalingen.
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn-aurora w-full py-4 text-lg disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Snowflake className="w-5 h-5 animate-spin" />
              Poule aanmaken...
            </span>
          ) : (
            'Poule Aanmaken'
          )}
        </button>
      </form>
    </div>
  );
}

export default CreatePool;
