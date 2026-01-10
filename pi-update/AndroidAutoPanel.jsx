import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Map, 
  Music, 
  Phone, 
  Home,
  Navigation,
  Mic,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  X,
  Loader2
} from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

// OpenAuto Controller Hook
export const useAndroidAutoDHU = () => {
  const [dhuStatus, setDhuStatus] = useState('stopped'); // stopped, starting, running, error
  const [dhuError, setDhuError] = useState(null);

  const startDHU = useCallback(async (windowConfig = {}) => {
    setDhuStatus('starting');
    setDhuError(null);
    try {
      const response = await axios.post(`${API_URL}/dhu/start`, {
        x: windowConfig.x || 640,       // Centered for 1920 width
        y: windowConfig.y || 200,
        width: windowConfig.width || 640,
        height: windowConfig.height || 480,
        borderless: true,
        alwaysOnTop: true
      });
      if (response.data.status === 'running') {
        setDhuStatus('running');
        return true;
      } else {
        setDhuError(response.data.message);
        setDhuStatus('error');
        return false;
      }
    } catch (error) {
      setDhuError(error.response?.data?.detail || error.message);
      setDhuStatus('error');
      return false;
    }
  }, []);

  const stopDHU = useCallback(async () => {
    try {
      await axios.post(`${API_URL}/dhu/stop`);
      setDhuStatus('stopped');
      setDhuError(null);
      return true;
    } catch (error) {
      console.error('Failed to stop DHU:', error);
      return false;
    }
  }, []);

  const getDHUStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/dhu/status`);
      setDhuStatus(response.data.status);
      return response.data;
    } catch (error) {
      return { status: 'unknown' };
    }
  }, []);

  return {
    dhuStatus,
    dhuError,
    startDHU,
    stopDHU,
    getDHUStatus
  };
};

// Mock Android Auto Panel (fallback when DHU not available)
export const AndroidAutoPanel = ({ onClose }) => {
  const [activeApp, setActiveApp] = useState('maps');
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [useMock, setUseMock] = useState(true);
  const { dhuStatus, dhuError, startDHU, stopDHU, getDHUStatus } = useAndroidAutoDHU();

  // Check DHU availability on mount
  useEffect(() => {
    const checkDHU = async () => {
      const status = await getDHUStatus();
      // If DHU is available and configured, we could switch to real mode
      // For now, default to mock
      setUseMock(true);
    };
    checkDHU();
  }, [getDHUStatus]);

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

  // Handle DHU launch
  const handleLaunchDHU = async () => {
    setUseMock(false);
    const success = await startDHU({
      x: 750,
      y: 180,
      width: 420,
      height: 340
    });
    if (!success) {
      setUseMock(true);
    }
  };

  // Handle close - stop DHU if running
  const handleClose = async () => {
    if (dhuStatus === 'running') {
      await stopDHU();
    }
    onClose?.();
  };

  // If trying to use real DHU
  if (!useMock && dhuStatus === 'starting') {
    return (
      <div 
        className="w-full h-full rounded-2xl overflow-hidden flex items-center justify-center"
        style={{
          background: 'linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-blue-400 animate-spin" />
          <span className="text-white/70 text-sm font-orbitron">Launching Android Auto...</span>
        </div>
      </div>
    );
  }

  // If DHU failed, show error with fallback option
  if (!useMock && dhuStatus === 'error') {
    return (
      <div 
        className="w-full h-full rounded-2xl overflow-hidden flex items-center justify-center p-4"
        style={{
          background: 'linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-red-400 text-sm">DHU Error: {dhuError}</span>
          <button
            onClick={() => setUseMock(true)}
            className="px-4 py-2 bg-white/10 rounded-lg text-white/70 text-sm hover:bg-white/20 transition-colors font-orbitron"
          >
            Use Demo Mode
          </button>
        </div>
      </div>
    );
  }

  // If real DHU is running, show placeholder (actual DHU window is overlaid by OS)
  if (!useMock && dhuStatus === 'running') {
    return (
      <div 
        className="w-full h-full rounded-2xl overflow-hidden flex items-center justify-center"
        style={{
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* DHU window is rendered by the system, this is just a placeholder */}
        <span className="text-white/30 text-xs font-orbitron">Android Auto Active</span>
      </div>
    );
  }

  // Mock Android Auto UI
  return (
    <div 
      className="w-full h-full rounded-2xl overflow-hidden relative gpu-accelerated"
      style={{
        background: 'linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 0 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)'
      }}
      data-testid="android-auto-panel"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">A</span>
          </div>
          <span className="text-white/70 text-xs font-medium">Android Auto</span>
        </div>
        <span className="text-white/50 text-xs font-orbitron">{formatTime(currentTime)}</span>
      </div>

      {/* Main content area */}
      <div className="p-2" style={{ height: 'calc(100% - 90px)' }}>
        {activeApp === 'maps' && (
          <div className="w-full h-full rounded-xl overflow-hidden relative bg-[#242f3e]">
            {/* Simulated map */}
            <div className="absolute inset-0 opacity-60">
              <div className="absolute top-1/2 left-0 right-0 h-6 bg-[#3d4f65] transform -skew-y-3" />
              <div className="absolute top-1/3 left-1/4 right-1/4 h-5 bg-[#3d4f65] transform rotate-45" />
              <div className="absolute bottom-1/4 left-1/3 w-16 h-3 bg-[#3d4f65]" />
              <div className="absolute top-1/4 left-1/2 w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
              <div className="absolute bottom-1/3 right-1/4 w-2 h-2 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
            </div>
            
            {/* Navigation info */}
            <div className="absolute top-2 left-2 right-2">
              <div className="bg-black/70 backdrop-blur-sm rounded-lg p-2 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                  <Navigation size={16} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-white text-xs font-medium">Turn right onto Main St</p>
                  <p className="text-white/50 text-[10px]">0.3 mi</p>
                </div>
              </div>
            </div>
            
            {/* ETA */}
            <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1">
              <p className="text-green-400 text-sm font-bold font-orbitron">12 min</p>
              <p className="text-white/50 text-[10px]">5.2 mi</p>
            </div>
          </div>
        )}

        {activeApp === 'music' && (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div 
              className="w-24 h-24 rounded-xl mb-3"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
              }}
            />
            <p className="text-white font-medium text-sm mb-0.5">VTEC Dreams</p>
            <p className="text-white/50 text-xs mb-3">Honda Beats</p>
            <div className="w-full max-w-[160px] h-1 bg-white/20 rounded-full mb-3">
              <div className="w-2/3 h-full bg-white rounded-full" />
            </div>
            <div className="flex items-center gap-5">
              <button className="text-white/50 hover:text-white transition-colors">
                <SkipBack size={20} />
              </button>
              <button 
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause size={20} className="text-black" /> : <Play size={20} className="text-black ml-0.5" />}
              </button>
              <button className="text-white/50 hover:text-white transition-colors">
                <SkipForward size={20} />
              </button>
            </div>
          </div>
        )}

        {activeApp === 'phone' && (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <Phone size={40} className="text-white/30 mb-3" />
            <p className="text-white/50 text-xs">No active call</p>
            <p className="text-white/30 text-[10px] mt-1">Tap to make a call</p>
          </div>
        )}

        {activeApp === 'home' && (
          <div className="w-full h-full grid grid-cols-2 gap-2 p-1">
            <button 
              onClick={() => setActiveApp('maps')}
              className="rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center p-3"
            >
              <Map size={28} className="text-blue-400 mb-1" />
              <span className="text-white/70 text-[10px]">Maps</span>
            </button>
            <button 
              onClick={() => setActiveApp('music')}
              className="rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center p-3"
            >
              <Music size={28} className="text-purple-400 mb-1" />
              <span className="text-white/70 text-[10px]">Music</span>
            </button>
            <button 
              onClick={() => setActiveApp('phone')}
              className="rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center p-3"
            >
              <Phone size={28} className="text-green-400 mb-1" />
              <span className="text-white/70 text-[10px]">Phone</span>
            </button>
            <button 
              className="rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center p-3"
            >
              <Mic size={28} className="text-red-400 mb-1" />
              <span className="text-white/70 text-[10px]">Assistant</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom nav bar */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-black/50 backdrop-blur-sm border-t border-white/10 flex items-center justify-around px-3">
        <button 
          onClick={() => setActiveApp('home')}
          className={`p-1.5 rounded-lg transition-colors ${activeApp === 'home' ? 'bg-white/10' : 'hover:bg-white/5'}`}
        >
          <Home size={18} className={activeApp === 'home' ? 'text-white' : 'text-white/50'} />
        </button>
        <button 
          onClick={() => setActiveApp('maps')}
          className={`p-1.5 rounded-lg transition-colors ${activeApp === 'maps' ? 'bg-white/10' : 'hover:bg-white/5'}`}
        >
          <Map size={18} className={activeApp === 'maps' ? 'text-blue-400' : 'text-white/50'} />
        </button>
        <button 
          onClick={() => setActiveApp('music')}
          className={`p-1.5 rounded-lg transition-colors ${activeApp === 'music' ? 'bg-white/10' : 'hover:bg-white/5'}`}
        >
          <Music size={18} className={activeApp === 'music' ? 'text-purple-400' : 'text-white/50'} />
        </button>
        <button 
          onClick={() => setActiveApp('phone')}
          className={`p-1.5 rounded-lg transition-colors ${activeApp === 'phone' ? 'bg-white/10' : 'hover:bg-white/5'}`}
        >
          <Phone size={18} className={activeApp === 'phone' ? 'text-green-400' : 'text-white/50'} />
        </button>
        <button 
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          <Mic size={18} className="text-white/50" />
        </button>
      </div>
    </div>
  );
};

export default AndroidAutoPanel;
