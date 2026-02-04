import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import {
  ArrowLeft, Clock, Trophy, Globe, Snowflake, Check, AlertCircle, Users
} from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { nl } from 'date-fns/locale';

function EventDetail() {
  const { poolId, eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [competitors, setCompetitors] = useState([]);
  const [allPredictions, setAllPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [prediction, setPrediction] = useState({
    first_place_id: '',
    second_place_id: '',
    third_place_id: '',
    predicted_time: '',
    world_record_prediction: false
  });

  useEffect(() => {
    loadEventData();
  }, [eventId, poolId]);

  const loadEventData = async () => {
    try {
      const [eventRes, predictionsRes] = await Promise.all([
        api.get(`/events/${eventId}`),
        api.get(`/predictions/event/${eventId}/pool/${poolId}`)
      ]);

      setEvent(eventRes.data);
      setCompetitors(eventRes.data.competitors || []);
      setAllPredictions(predictionsRes.data.predictions || []);

      // Load existing prediction
      const myPrediction = predictionsRes.data.predictions?.find(p => p.user_id === undefined);
      if (predictionsRes.data.predictions?.length === 1 && !predictionsRes.data.deadline_passed) {
        const p = predictionsRes.data.predictions[0];
        setPrediction({
          first_place_id: p.first_place_id || '',
          second_place_id: p.second_place_id || '',
          third_place_id: p.third_place_id || '',
          predicted_time: p.predicted_time || '',
          world_record_prediction: p.world_record_prediction || false
        });
      }
    } catch (error) {
      console.error('Failed to load event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!prediction.first_place_id) {
      setError('Selecteer minimaal een eerste plaats');
      return;
    }

    setSaving(true);

    try {
      await api.post('/predictions', {
        pool_id: parseInt(poolId),
        event_id: parseInt(eventId),
        ...prediction,
        first_place_id: prediction.first_place_id ? parseInt(prediction.first_place_id) : null,
        second_place_id: prediction.second_place_id ? parseInt(prediction.second_place_id) : null,
        third_place_id: prediction.third_place_id ? parseInt(prediction.third_place_id) : null
      });
      setSuccess('Voorspelling opgeslagen!');
      setTimeout(() => {
        navigate(`/pools/${poolId}/events`);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Kon voorspelling niet opslaan');
    } finally {
      setSaving(false);
    }
  };

  const getSelectedIds = () => {
    return [prediction.first_place_id, prediction.second_place_id, prediction.third_place_id]
      .filter(Boolean)
      .map(id => parseInt(id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Snowflake className="w-12 h-12 text-ice-400 animate-spin" />
      </div>
    );
  }

  if (!event) {
    return <div className="text-center py-12">Event niet gevonden</div>;
  }

  const deadlinePassed = isPast(new Date(event.deadline));

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <Link
          to={`/pools/${poolId}/events`}
          className="flex items-center gap-2 text-ice-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Terug naar wedstrijden
        </Link>

        <div className="card p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-ice-700/50 flex items-center justify-center text-3xl">
              {event.sport_icon}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{event.name}</h1>
              <p className="text-ice-400">{event.tournament_name}</p>

              <div className="flex flex-wrap gap-4 mt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-ice-400" />
                  {format(new Date(event.event_date), 'EEEE d MMMM, HH:mm', { locale: nl })}
                </div>

                {event.world_record_time && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4 text-aurora-blue" />
                    WR: {event.world_record_time} ({event.world_record_holder})
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Deadline status */}
          <div className={`mt-4 p-3 rounded-lg ${deadlinePassed ? 'bg-red-500/20' : 'bg-aurora-green/20'}`}>
            {deadlinePassed ? (
              <p className="text-red-300 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Deadline verstreken - je kunt niet meer voorspellen
              </p>
            ) : (
              <p className="text-aurora-green flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Deadline: {formatDistanceToNow(new Date(event.deadline), { locale: nl, addSuffix: true })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Prediction form */}
      {!deadlinePassed && (
        <form onSubmit={handleSubmit} className="card p-6">
          <h2 className="text-xl font-bold mb-6">Jouw Voorspelling</h2>

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

          <div className="space-y-6">
            {/* Podium predictions */}
            {[
              { position: 1, label: 'Goud', key: 'first_place_id', medalClass: 'medal-gold' },
              { position: 2, label: 'Zilver', key: 'second_place_id', medalClass: 'medal-silver' },
              { position: 3, label: 'Brons', key: 'third_place_id', medalClass: 'medal-bronze' }
            ].map(({ position, label, key, medalClass }) => (
              <div key={position}>
                <label className="flex items-center gap-2 text-sm font-medium text-ice-300 mb-2">
                  <span className={`w-6 h-6 rounded-full ${medalClass} flex items-center justify-center text-xs font-bold`}>
                    {position}
                  </span>
                  {label}
                </label>
                <select
                  value={prediction[key]}
                  onChange={(e) => setPrediction(prev => ({ ...prev, [key]: e.target.value }))}
                  className="input-field"
                >
                  <option value="">Selecteer atleet...</option>
                  {competitors.map((comp) => (
                    <option
                      key={comp.id}
                      value={comp.id}
                      disabled={getSelectedIds().includes(comp.id) && prediction[key] !== comp.id.toString()}
                    >
                      {comp.name} ({comp.country})
                    </option>
                  ))}
                </select>
              </div>
            ))}

            {/* Time prediction */}
            {event.world_record_time && (
              <div>
                <label className="block text-sm font-medium text-ice-300 mb-2">
                  Verwachte winnaarstijd (optioneel)
                </label>
                <input
                  type="text"
                  value={prediction.predicted_time}
                  onChange={(e) => setPrediction(prev => ({ ...prev, predicted_time: e.target.value }))}
                  className="input-field"
                  placeholder="bijv. 34.12"
                />
              </div>
            )}

            {/* World record prediction */}
            {event.world_record_time && (
              <label className="flex items-center gap-3 p-4 rounded-lg bg-ice-700/30 cursor-pointer hover:bg-ice-700/50 transition-colors">
                <input
                  type="checkbox"
                  checked={prediction.world_record_prediction}
                  onChange={(e) => setPrediction(prev => ({ ...prev, world_record_prediction: e.target.checked }))}
                  className="w-5 h-5 rounded border-ice-500 bg-ice-700 text-aurora-blue focus:ring-aurora-blue"
                />
                <div>
                  <span className="font-medium flex items-center gap-2">
                    <Globe className="w-4 h-4 text-aurora-blue" />
                    Wereldrecord wordt verbroken
                  </span>
                  <span className="text-sm text-ice-400 block mt-1">
                    +3 punten als het wereldrecord wordt verbroken
                  </span>
                </div>
              </label>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-aurora w-full mt-6 py-3 disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <Snowflake className="w-5 h-5 animate-spin" />
                Opslaan...
              </span>
            ) : (
              'Voorspelling Opslaan'
            )}
          </button>
        </form>
      )}

      {/* All predictions (after deadline) */}
      {deadlinePassed && allPredictions.length > 0 && (
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-ice-400" />
            Alle Voorspellingen
          </h2>

          <div className="space-y-4">
            {allPredictions.map((pred) => (
              <div key={pred.id} className="p-4 rounded-lg bg-ice-700/30">
                <div className="flex items-center gap-3 mb-3">
                  {pred.profile_image ? (
                    <img src={pred.profile_image} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-ice-600 flex items-center justify-center text-sm">
                      {pred.nickname?.charAt(0)}
                    </div>
                  )}
                  <span className="font-medium">{pred.nickname}</span>
                  {pred.points_earned > 0 && (
                    <span className="ml-auto text-aurora-green font-bold">+{pred.points_earned} pts</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  <span>
                    <span className="medal-gold px-2 py-0.5 rounded text-xs font-bold">1</span>
                    {' '}{pred.first_name || '-'}
                  </span>
                  <span>
                    <span className="medal-silver px-2 py-0.5 rounded text-xs font-bold">2</span>
                    {' '}{pred.second_name || '-'}
                  </span>
                  <span>
                    <span className="medal-bronze px-2 py-0.5 rounded text-xs font-bold">3</span>
                    {' '}{pred.third_name || '-'}
                  </span>
                  {pred.world_record_prediction && (
                    <span className="text-aurora-blue flex items-center gap-1">
                      <Globe className="w-4 h-4" /> WR
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {event.results?.length > 0 && (
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Uitslag
          </h2>

          <div className="space-y-3">
            {event.results.slice(0, 3).map((result) => (
              <div
                key={result.id}
                className={`flex items-center gap-4 p-4 rounded-lg ${
                  result.position === 1 ? 'bg-yellow-500/20' :
                  result.position === 2 ? 'bg-gray-400/20' :
                  'bg-orange-500/20'
                }`}
              >
                <span className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                  result.position === 1 ? 'medal-gold' :
                  result.position === 2 ? 'medal-silver' : 'medal-bronze'
                }`}>
                  {result.position}
                </span>
                <div className="flex-1">
                  <p className="font-semibold">{result.competitor_name}</p>
                  <p className="text-sm text-ice-400">{result.country}</p>
                </div>
                {result.time && (
                  <div className="text-right">
                    <p className="font-mono text-lg">{result.time}</p>
                    {result.is_world_record && (
                      <span className="text-xs text-aurora-blue flex items-center gap-1">
                        <Globe className="w-3 h-3" /> WR!
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default EventDetail;
