import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Pools from './pages/Pools';
import PoolDetail from './pages/PoolDetail';
import CreatePool from './pages/CreatePool';
import JoinPool from './pages/JoinPool';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import Trophies from './pages/Trophies';
import BulletinBoard from './pages/BulletinBoard';
import LoadingScreen from './components/LoadingScreen';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <Register />
        </PublicRoute>
      } />
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="pools" element={<Pools />} />
        <Route path="pools/create" element={<CreatePool />} />
        <Route path="pools/join/:inviteCode" element={<JoinPool />} />
        <Route path="pools/:id" element={<PoolDetail />} />
        <Route path="pools/:poolId/events" element={<Events />} />
        <Route path="pools/:poolId/events/:eventId" element={<EventDetail />} />
        <Route path="pools/:poolId/board" element={<BulletinBoard />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="user/:id" element={<UserProfile />} />
        <Route path="trophies" element={<Trophies />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
