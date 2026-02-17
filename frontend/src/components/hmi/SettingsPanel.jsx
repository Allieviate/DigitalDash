import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useVehicleData } from '../../contexts/VehicleDataContext';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import {
  X,
  Palette,
  Database,
  Volume2,
  VolumeX,
  Sun,
  Activity,
  Check,
  SlidersHorizontal,
  Bluetooth,
  Gauge,
  Zap,
  Turtle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';

export const SettingsPanel = ({ onClose }) => {
  const { themeId, switchTheme, themes } = useTheme();
  const { settings, updateSetting } = useSettings();
  const { dataSource, switchDataSource } = useVehicleData();

  const handleThemeChange = async (newThemeId) => {
    switchTheme(newThemeId);
    await updateSetting('theme_id', newThemeId);
  };

  const handleSoundsToggle = async (enabled) => {
    await updateSetting('warning_sounds', enabled);
  };

  const handleBrightnessChange = async (value) => {
    await updateSetting('brightness', value[0]);
  };

  const handleDataSourceChange = async (source) => {
    switchDataSource(source);
    await updateSetting('data_source', source);
  };

  const handleChimeVolumeChange = async (value) => {
    await updateSetting('chime_volume', value[0]);
  };

  const handleBluetoothToggle = async (enabled) => {
    await updateSetting('bluetooth_enabled', enabled);
  };

  const handlePerformanceModeChange = async (mode) => {
    await updateSetting('performance_mode', mode);
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      data-testid="settings-panel"
    >
      <div
        className="w-full max-w-4xl h-[90vh] bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden"
        style={{ boxShadow: '0 0 60px rgba(0,0,0,0.8)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-xl font-bold uppercase tracking-wider font-eurostar">Settings</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hover:bg-white/10"
            data-testid="close-settings-btn"
          >
            <X size={20} />
          </Button>
        </div>

        <Tabs defaultValue="diagnostics" className="h-[calc(100%-65px)]">
          <TabsList className="w-full justify-start px-6 py-2 bg-transparent border-b border-zinc-800 rounded-none">
            <TabsTrigger value="diagnostics" className="data-[state=active]:bg-white/10 font-eurostar">
              <Activity size={16} className="mr-2" />
              Diagnostics
            </TabsTrigger>
            <TabsTrigger value="appearance" className="data-[state=active]:bg-white/10 font-eurostar">
              <Palette size={16} className="mr-2" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="general" className="data-[state=active]:bg-white/10 font-eurostar">
              <SlidersHorizontal size={16} className="mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="data" className="data-[state=active]:bg-white/10 font-eurostar">
              <Database size={16} className="mr-2" />
              Data Source
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100%-50px)]">
            <TabsContent value="appearance" className="p-6 space-y-8 m-0">
              <div>
                <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-400 mb-4 font-eurostar">
                  Theme
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {Object.values(themes).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleThemeChange(t.id)}
                      className={`
                        relative p-4 rounded-xl border-2 transition-all
                        ${themeId === t.id
                          ? 'border-white/30'
                          : 'border-zinc-800 hover:border-zinc-700'
                        }
                      `}
                      style={{
                        background: themeId === t.id ? 'rgba(255,255,255,0.05)' : 'transparent'
                      }}
                      data-testid={`theme-${t.id}`}
                    >
                      <div
                        className="w-full h-20 rounded-lg mb-3 flex items-center justify-center"
                        style={{
                          background: '#050505',
                          border: `2px solid ${t.accent}`
                        }}
                      >
                        <span
                          className="font-orbitron text-2xl font-bold"
                          style={{
                            color: t.accent,
                            textShadow: t.glow
                          }}
                        >
                          120
                        </span>
                      </div>
                      <span className="text-sm font-medium font-eurostar">{t.name}</span>

                      {themeId === t.id && (
                        <div
                          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: t.accent }}
                        >
                          <Check size={14} className="text-black" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
                <h4 className="text-sm font-medium text-zinc-400 mb-2 font-eurostar">Custom Gauge Images</h4>
                <p className="text-xs text-zinc-600">
                  Your custom gauge PNG assets are loaded from /assets/gauges/.
                  To change gauge appearance, replace the PNG files in that directory.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="general" className="p-6 space-y-8 m-0">
              <div>
                <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-400 mb-4 font-eurostar">
                  Performance Profile
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => handlePerformanceModeChange('high_performance')}
                    className={`
                      p-4 rounded-xl border-2 text-left transition-all
                      ${settings.performance_mode === 'high_performance'
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-zinc-800 hover:border-zinc-700'
                      }
                    `}
                    data-testid="performance-high"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Zap size={18} className={settings.performance_mode === 'high_performance' ? 'text-emerald-400' : 'text-zinc-500'} />
                      <span className="font-medium font-eurostar">High Performance</span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      60 FPS signal polling and smoother gauge transitions. Best for faster hardware.
                    </p>
                  </button>

                  <button
                    onClick={() => handlePerformanceModeChange('low_performance')}
                    className={`
                      p-4 rounded-xl border-2 text-left transition-all
                      ${settings.performance_mode === 'low_performance'
                        ? 'border-amber-500/50 bg-amber-500/10'
                        : 'border-zinc-800 hover:border-zinc-700'
                      }
                    `}
                    data-testid="performance-low"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Turtle size={18} className={settings.performance_mode === 'low_performance' ? 'text-amber-400' : 'text-zinc-500'} />
                      <span className="font-medium font-eurostar">Low Performance</span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      30 FPS signal polling to reduce rendering workload on Pi-class and lower-power systems.
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-400 mb-4 font-eurostar">
                  Display Brightness
                </h3>
                <div className="flex items-center gap-4">
                  <Sun size={18} className="text-zinc-500" />
                  <Slider
                    value={[settings.brightness]}
                    onValueChange={handleBrightnessChange}
                    min={20}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <span className="font-orbitron text-sm w-12 text-right">
                    {settings.brightness}%
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-400 mb-4 font-eurostar">
                  Chime Volume
                </h3>
                <div className="flex items-center gap-4">
                  {settings.warning_sounds ? (
                    <Volume2 size={18} className="text-zinc-500" />
                  ) : (
                    <VolumeX size={18} className="text-zinc-600" />
                  )}
                  <Slider
                    value={[settings.chime_volume ?? 70]}
                    onValueChange={handleChimeVolumeChange}
                    min={0}
                    max={100}
                    step={5}
                    className="flex-1"
                    disabled={!settings.warning_sounds}
                  />
                  <span className="font-orbitron text-sm w-12 text-right">
                    {settings.chime_volume ?? 70}%
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-400 font-eurostar">
                    Warning Sounds
                  </h3>
                  <p className="text-xs text-zinc-600 mt-1">
                    Play audio alerts for critical warnings
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {settings.warning_sounds ? (
                    <Volume2 size={18} className="text-zinc-400" />
                  ) : (
                    <VolumeX size={18} className="text-zinc-600" />
                  )}
                  <Switch
                    checked={settings.warning_sounds}
                    onCheckedChange={handleSoundsToggle}
                    data-testid="sounds-toggle"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-400 font-eurostar">
                    Bluetooth
                  </h3>
                  <p className="text-xs text-zinc-600 mt-1">
                    Enable Bluetooth audio and future hands-free integrations
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Bluetooth size={18} className={settings.bluetooth_enabled ? 'text-blue-400' : 'text-zinc-600'} />
                  <Switch
                    checked={settings.bluetooth_enabled ?? true}
                    onCheckedChange={handleBluetoothToggle}
                    data-testid="bluetooth-toggle"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="data" className="p-6 space-y-8 m-0">
              <div>
                <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-400 mb-4 font-eurostar">
                  Data Source
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => handleDataSourceChange('simulation')}
                    className={`
                      p-4 rounded-xl border-2 text-left transition-all
                      ${dataSource === 'simulation' || dataSource === 'simulated'
                        ? 'border-green-500/50 bg-green-500/10' 
                        : 'border-zinc-800 hover:border-zinc-700'
                      }
                    `}
                    data-testid="data-source-simulation"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Database size={18} className={dataSource === 'simulation' || dataSource === 'simulated' ? 'text-green-500' : 'text-zinc-500'} />
                      <span className="font-medium font-eurostar">Simulation</span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Demo mode with simulated vehicle data for testing and development.
                    </p>
                  </button>

                  <button
                    onClick={() => handleDataSourceChange('obd1')}
                    className={`
                      p-4 rounded-xl border-2 text-left transition-all
                      ${dataSource === 'obd1' 
                        ? 'border-amber-500/50 bg-amber-500/10' 
                        : 'border-zinc-800 hover:border-zinc-700'
                      }
                    `}
                    data-testid="data-source-obd1"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Activity size={18} className={dataSource === 'obd1' ? 'text-amber-500' : 'text-zinc-500'} />
                      <span className="font-medium font-eurostar">OBD0/OBD1</span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Legacy vehicle data via compatible OBD0/OBD1 adapters.
                    </p>
                  </button>

                  <button
                    onClick={() => handleDataSourceChange('obd2')}
                    className={`
                      p-4 rounded-xl border-2 text-left transition-all
                      ${dataSource === 'obd2' 
                        ? 'border-blue-500/50 bg-blue-500/10' 
                        : 'border-zinc-800 hover:border-zinc-700'
                      }
                    `}
                    data-testid="data-source-obd2"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Activity size={18} className={dataSource === 'obd2' ? 'text-blue-500' : 'text-zinc-500'} />
                      <span className="font-medium font-eurostar">OBD-II / CAN</span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Real vehicle data via OBD-II adapter or CAN bus connection.
                    </p>
                  </button>
                </div>

                {(dataSource === 'obd1' || dataSource === 'obd2') && (
                  <div className="mt-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
                    <p className="text-sm text-amber-400 font-eurostar">
                      <strong>Note:</strong> OBD modes require hardware connection. 
                      This feature will be fully available in a future update.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="diagnostics" className="h-full m-0">
              <DiagnosticsPanel className="h-full" />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsPanel;
