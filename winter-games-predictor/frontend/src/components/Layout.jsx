import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  Users,
  Trophy,
  User,
  LogOut,
  Menu,
  X,
  Snowflake,
  Award
} from 'lucide-react';
import { useState } from 'react';

function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Mijn Poules', href: '/pools', icon: Users },
    { name: 'Ranglijst', href: '/leaderboard', icon: Trophy },
    { name: 'Trofeeën', href: '/trophies', icon: Award },
    { name: 'Profiel', href: '/profile', icon: User },
  ];

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-winter-gradient">
      {/* Decorative snowflakes */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {[...Array(15)].map((_, i) => (
          <Snowflake
            key={i}
            className="snowflake text-white/10"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${10 + Math.random() * 10}s`,
              fontSize: `${12 + Math.random() * 20}px`,
            }}
            size={12 + Math.random() * 20}
          />
        ))}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-ice-700/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2">
              <Snowflake className="w-8 h-8 text-ice-400" />
              <span className="text-xl font-bold text-gradient hidden sm:block">
                Winter Games
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                      isActive(item.href)
                        ? 'bg-ice-600/50 text-white'
                        : 'text-ice-200 hover:bg-ice-700/30 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User menu */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2">
                {user?.profile_image ? (
                  <img
                    src={user.profile_image}
                    alt={user.nickname}
                    className="w-8 h-8 rounded-full object-cover border-2 border-ice-500"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-ice-600 flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                )}
                <span className="text-sm font-medium">{user?.nickname}</span>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-lg hover:bg-ice-700/30 transition-colors text-ice-300 hover:text-white"
                title="Uitloggen"
              >
                <LogOut className="w-5 h-5" />
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-ice-700/30 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-ice-700/30 bg-ice-900/95 backdrop-blur-lg">
            <div className="px-4 py-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive(item.href)
                        ? 'bg-ice-600/50 text-white'
                        : 'text-ice-200 hover:bg-ice-700/30'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-ice-700/30 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-ice-400">
              <Snowflake className="w-5 h-5" />
              <span className="text-sm">Winter Games Predictor 2026</span>
            </div>
            <div className="text-sm text-ice-500">
              Voorspel de Olympische Winterspelen met vrienden!
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
