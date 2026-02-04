import { Snowflake } from 'lucide-react';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-winter-gradient flex items-center justify-center">
      <div className="text-center">
        <Snowflake className="w-16 h-16 text-ice-400 animate-spin mx-auto" />
        <p className="mt-4 text-ice-300 animate-pulse">Laden...</p>
      </div>
    </div>
  );
}

export default LoadingScreen;
