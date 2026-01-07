import React, { useState, useEffect } from 'react';
import { 
  Map, 
  Music, 
  Phone, 
  Home,
  Navigation,
  Mic,
  Volume2,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  X
} from 'lucide-react';

// Simulated Android Auto Panel - Mock UI for demo
export const AndroidAutoPanel = ({ onClose }) => {
  const [activeApp, setActiveApp] = useState('maps'); // maps, music, phone, home
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div 
      className="w-full h-full rounded-2xl overflow-hidden relative"
      style={{
        background: 'linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 0 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'
      }}
      data-testid="android-auto-panel"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <span className="text-white/70 text-sm font-medium">Android Auto</span>
        </div>
        <span className="text-white/50 text-sm font-orbitron">{formatTime(currentTime)}</span>
      </div>

      {/* Main content area */}
      <div className="flex-1 p-3" style={{ height: 'calc(100% - 100px)' }}>
        {activeApp === 'maps' && (
          <div className="w-full h-full rounded-xl overflow-hidden relative bg-[#242f3e]">
            {/* Simulated map */}
            <div className="absolute inset-0 opacity-60">
              {/* Road lines */}
              <div className="absolute top-1/2 left-0 right-0 h-8 bg-[#3d4f65] transform -skew-y-3" />
              <div className="absolute top-1/3 left-1/4 right-1/4 h-6 bg-[#3d4f65] transform rotate-45" />
              <div className="absolute bottom-1/4 left-1/3 w-20 h-4 bg-[#3d4f65]" />
              
              {/* Map markers */}
              <div className="absolute top-1/4 left-1/2 w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
              <div className="absolute bottom-1/3 right-1/4 w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
            </div>
            
            {/* Navigation info overlay */}
            <div className="absolute top-3 left-3 right-3">
              <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Navigation size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">Turn right onto Main St</p>
                  <p className="text-white/50 text-xs">0.3 mi</p>
                </div>
              </div>
            </div>
            
            {/* ETA */}
            <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2">
              <p className="text-green-400 text-lg font-bold font-orbitron">12 min</p>
              <p className="text-white/50 text-xs">5.2 mi</p>
            </div>
          </div>
        )}

        {activeApp === 'music' && (
          <div className="w-full h-full flex flex-col items-center justify-center">
            {/* Album art */}
            <div 
              className="w-32 h-32 rounded-xl mb-4"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
              }}
            />
            
            {/* Track info */}
            <p className="text-white font-medium text-base mb-1">VTEC Dreams</p>
            <p className="text-white/50 text-sm mb-4">Honda Beats</p>
            
            {/* Progress bar */}
            <div className="w-full max-w-[200px] h-1 bg-white/20 rounded-full mb-4">
              <div className="w-2/3 h-full bg-white rounded-full" />
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-6">
              <button className="text-white/50 hover:text-white transition-colors">
                <SkipBack size={24} />
              </button>
              <button 
                className="w-12 h-12 rounded-full bg-white flex items-center justify-center"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause size={24} className="text-black" /> : <Play size={24} className="text-black ml-1" />}
              </button>
              <button className="text-white/50 hover:text-white transition-colors">
                <SkipForward size={24} />
              </button>
            </div>
          </div>
        )}

        {activeApp === 'phone' && (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <Phone size={48} className="text-white/30 mb-4" />
            <p className="text-white/50 text-sm">No active call</p>
            <p className="text-white/30 text-xs mt-2">Tap to make a call</p>
          </div>
        )}

        {activeApp === 'home' && (
          <div className="w-full h-full grid grid-cols-2 gap-3 p-2">
            <button 
              onClick={() => setActiveApp('maps')}
              className="rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center p-4"
            >
              <Map size={32} className="text-blue-400 mb-2" />
              <span className="text-white/70 text-xs">Maps</span>
            </button>
            <button 
              onClick={() => setActiveApp('music')}
              className="rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center p-4"
            >
              <Music size={32} className="text-purple-400 mb-2" />
              <span className="text-white/70 text-xs">Music</span>
            </button>
            <button 
              onClick={() => setActiveApp('phone')}
              className="rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center p-4"
            >
              <Phone size={32} className="text-green-400 mb-2" />
              <span className="text-white/70 text-xs">Phone</span>
            </button>
            <button 
              className="rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center p-4"
            >
              <Mic size={32} className="text-red-400 mb-2" />
              <span className="text-white/70 text-xs">Assistant</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom nav bar */}
      <div className="absolute bottom-0 left-0 right-0 h-14 bg-black/50 backdrop-blur-sm border-t border-white/10 flex items-center justify-around px-4">
        <button 
          onClick={() => setActiveApp('home')}
          className={`p-2 rounded-lg transition-colors ${activeApp === 'home' ? 'bg-white/10' : 'hover:bg-white/5'}`}
        >
          <Home size={20} className={activeApp === 'home' ? 'text-white' : 'text-white/50'} />
        </button>
        <button 
          onClick={() => setActiveApp('maps')}
          className={`p-2 rounded-lg transition-colors ${activeApp === 'maps' ? 'bg-white/10' : 'hover:bg-white/5'}`}
        >
          <Map size={20} className={activeApp === 'maps' ? 'text-blue-400' : 'text-white/50'} />
        </button>
        <button 
          onClick={() => setActiveApp('music')}
          className={`p-2 rounded-lg transition-colors ${activeApp === 'music' ? 'bg-white/10' : 'hover:bg-white/5'}`}
        >
          <Music size={20} className={activeApp === 'music' ? 'text-purple-400' : 'text-white/50'} />
        </button>
        <button 
          onClick={() => setActiveApp('phone')}
          className={`p-2 rounded-lg transition-colors ${activeApp === 'phone' ? 'bg-white/10' : 'hover:bg-white/5'}`}
        >
          <Phone size={20} className={activeApp === 'phone' ? 'text-green-400' : 'text-white/50'} />
        </button>
        <button 
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <Mic size={20} className="text-white/50" />
        </button>
      </div>
    </div>
  );
};

export default AndroidAutoPanel;
