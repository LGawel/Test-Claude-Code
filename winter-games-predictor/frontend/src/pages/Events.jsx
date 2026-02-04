import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { Calendar, Clock, Check, AlertCircle, Snowflake, ArrowLeft, Target } from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { nl } from 'date-fns/locale';

function Events() {
  const { poolId } = useParams();
  const [events, setEvents] = useState([]);
  const [pool, setPool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadEvents();
  }, [poolId]);

  const loadEvents = async () => {
    try {
      const [eventsRes, poolRes] = await Promise.all([
        api.get(`/events/pool/${poolId}`),
        api.get(`/pools/${poolId}`)
      ]);
      setEvents(eventsRes.data);
      setPool(poolRes.data);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'upcoming') return !isPast(new Date(event.deadline));
    if (filter === 'predicted') return event.user_prediction;
    if (filter === 'not_predicted') return !event.user_prediction && !isPast(new Date(event.deadline));
    return true;
  });

  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const date = format(new Date(event.event_date), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Snowflake className="w-12 h-12 text-ice-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <Link
          to={`/pools/${poolId}`}
          className="flex items-center gap-2 text-ice-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Terug naar {pool?.name}
        </Link>
        <h1 className="text-3xl font-bold">Wedstrijden</h1>
        <p className="text-ice-400 mt-1">Maak je voorspellingen voor de wedstrijden</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: 'all', label: 'Alles' },
          { value: 'upcoming', label: 'Aankomend' },
          { value: 'predicted', label: 'Voorspeld' },
          { value: 'not_predicted', label: 'Nog te voorspellen' }
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-4 py-2 rounded-lg transition-all ${
              filter === value
                ? 'bg-ice-600 text-white'
                : 'bg-ice-800/50 text-ice-300 hover:bg-ice-700/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Events by date */}
      {Object.keys(groupedEvents).length === 0 ? (
        <div className="card p-12 text-center">
          <Calendar className="w-16 h-16 text-ice-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Geen wedstrijden gevonden</h2>
          <p className="text-ice-400">Pas de filters aan of wacht op nieuwe wedstrijden</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedEvents).map(([date, dayEvents]) => (
            <div key={date}>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-ice-400" />
                {format(new Date(date), 'EEEE d MMMM yyyy', { locale: nl })}
              </h2>

              <div className="grid gap-4">
                {dayEvents.map((event) => {
                  const deadlinePassed = isPast(new Date(event.deadline));
                  const hasPrediction = event.user_prediction;

                  return (
                    <Link
                      key={event.id}
                      to={`/pools/${poolId}/events/${event.id}`}
                      className="card-hover p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-ice-700/50 flex items-center justify-center text-2xl">
                            {event.sport_icon}
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{event.name}</h3>
                            <p className="text-ice-400 text-sm mt-1">
                              {format(new Date(event.event_date), 'HH:mm', { locale: nl })} uur
                            </p>
                            {event.world_record_time && (
                              <p className="text-xs text-ice-500 mt-1">
                                WR: {event.world_record_time} ({event.world_record_holder})
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          {deadlinePassed ? (
                            <span className="inline-flex items-center gap-1 text-sm text-ice-500">
                              <AlertCircle className="w-4 h-4" />
                              Deadline verstreken
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-sm text-aurora-pink">
                              <Clock className="w-4 h-4" />
                              {formatDistanceToNow(new Date(event.deadline), { locale: nl, addSuffix: true })}
                            </span>
                          )}

                          <div className="mt-2">
                            {hasPrediction ? (
                              <span className="inline-flex items-center gap-1 text-sm text-aurora-green bg-aurora-green/20 px-3 py-1 rounded-full">
                                <Check className="w-4 h-4" />
                                Voorspeld
                              </span>
                            ) : !deadlinePassed ? (
                              <span className="inline-flex items-center gap-1 text-sm text-aurora-pink bg-aurora-pink/20 px-3 py-1 rounded-full">
                                <Target className="w-4 h-4" />
                                Voorspel nu
                              </span>
                            ) : (
                              <span className="text-sm text-ice-500">Niet voorspeld</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {hasPrediction && (
                        <div className="mt-4 pt-4 border-t border-ice-700/30">
                          <p className="text-sm text-ice-400">Jouw voorspelling:</p>
                          <div className="flex gap-4 mt-2">
                            <span className="text-sm">
                              <span className="medal-gold px-2 py-0.5 rounded text-xs font-bold">1</span>
                              {' '}{event.user_prediction.first_name || '-'}
                            </span>
                            <span className="text-sm">
                              <span className="medal-silver px-2 py-0.5 rounded text-xs font-bold">2</span>
                              {' '}{event.user_prediction.second_name || '-'}
                            </span>
                            <span className="text-sm">
                              <span className="medal-bronze px-2 py-0.5 rounded text-xs font-bold">3</span>
                              {' '}{event.user_prediction.third_name || '-'}
                            </span>
                          </div>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Events;
