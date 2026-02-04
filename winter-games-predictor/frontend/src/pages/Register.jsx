import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Snowflake, Mail, Lock, User, AlertCircle } from 'lucide-react';

function Register() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen');
      return;
    }

    if (password.length < 6) {
      setError('Wachtwoord moet minimaal 6 karakters zijn');
      return;
    }

    if (nickname.length < 2) {
      setError('Nickname moet minimaal 2 karakters zijn');
      return;
    }

    setLoading(true);

    try {
      await register(email, password, nickname);
    } catch (err) {
      setError(err.response?.data?.error || 'Registratie mislukt. Probeer het opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-winter-gradient flex items-center justify-center p-4">
      {/* Background snowflakes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <Snowflake
            key={i}
            className="snowflake text-white/10"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${10 + Math.random() * 10}s`,
            }}
            size={12 + Math.random() * 20}
          />
        ))}
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-ice-600/30 backdrop-blur-sm border border-ice-500/30 mb-4">
            <Snowflake className="w-10 h-10 text-ice-400" />
          </div>
          <h1 className="text-3xl font-bold text-gradient">Winter Games Predictor</h1>
          <p className="text-ice-300 mt-2">Maak een account aan en doe mee!</p>
        </div>

        {/* Register form */}
        <div className="card p-8">
          <h2 className="text-2xl font-bold text-center mb-6">Registreren</h2>

          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ice-300 mb-2">
                Nickname
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ice-500" />
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="input-field pl-10"
                  placeholder="JouwNickname"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ice-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ice-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="jouw@email.nl"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ice-300 mb-2">
                Wachtwoord
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ice-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ice-300 mb-2">
                Bevestig wachtwoord
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ice-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field pl-10"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Snowflake className="w-5 h-5 animate-spin" />
                  Account aanmaken...
                </span>
              ) : (
                'Registreren'
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-ice-400">
            Al een account?{' '}
            <Link to="/login" className="text-ice-300 hover:text-white font-medium transition-colors">
              Log hier in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
