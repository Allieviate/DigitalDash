import React from 'react';
import { useTheme, THEMES } from '../../contexts/ThemeContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useVehicleData } from '../../contexts/VehicleDataContext';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { 
  X, 
  Palette, 
  Gauge, 
  Database, 
  Volume2,
  VolumeX,
  Sun,
  Activity,
  Check
} from 'lucide-react';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export const SettingsPanel = ({ onClose }) => {
  const { theme, themeId, switchTheme, themes } = useTheme();
  const { settings, updateSetting, isSaving } = useSettings();
  const { dataSource, switchDataSource } = useVehicleData();

  const handleThemeChange = async (newThemeId) => {
    switchTheme(newThemeId);
    await updateSetting('theme_id', newThemeId);
  };

  const handleUnitsChange = async (units) => {
    await updateSetting('units', units);
  };

  const handleGaugeStyleChange = async (style) => {
    await updateSetting('gauge_style', style);
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

  return (
    <div 
      className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      data-testid="settings-panel"
    >
      <div 
        className="w-full max-w-4xl h-[90vh] bg-[#09090b] border border-zinc-800 rounded-xl overflow-hidden"
        style={{ boxShadow: '0 0 60px rgba(0,0,0,0.8)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-xl font-bold uppercase tracking-wider">Settings</h2>
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

        {/* Content */}
        <Tabs defaultValue="appearance" className="h-[calc(100%-65px)]">
          <TabsList className="w-full justify-start px-6 py-2 bg-transparent border-b border-zinc-800 rounded-none">
            <TabsTrigger value="appearance" className="data-[state=active]:bg-white/10">
              <Palette size={16} className="mr-2" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="gauges" className="data-[state=active]:bg-white/10">
              <Gauge size={16} className="mr-2" />
              Gauges
            </TabsTrigger>
            <TabsTrigger value="data" className="data-[state=active]:bg-white/10">
              <Database size={16} className="mr-2" />
              Data Source
            </TabsTrigger>
            <TabsTrigger value="diagnostics" className="data-[state=active]:bg-white/10">
              <Activity size={16} className="mr-2" />
              Diagnostics
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100%-50px)]">
            {/* Appearance Tab */}
            <TabsContent value="appearance" className="p-6 space-y-8 m-0">
              {/* Theme Selection */}
              <div>
                <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-400 mb-4">
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
                      {/* Theme preview */}
                      <div 
                        className="w-full h-20 rounded-lg mb-3 flex items-center justify-center"
                        style={{ 
                          background: '#050505',
                          border: `2px solid ${t.accent}`
                        }}
                      >
                        <span 
                          className="font-mono text-2xl font-bold"
                          style={{ 
                            color: t.accent,
                            textShadow: t.glow
                          }}
                        >
                          120
                        </span>
                      </div>
                      <span className="text-sm font-medium">{t.name}</span>
                      
                      {/* Selected indicator */}
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

              {/* Brightness */}
              <div>
                <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-400 mb-4">
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
                  <span className="font-mono text-sm w-12 text-right">
                    {settings.brightness}%
                  </span>
                </div>
              </div>

              {/* Warning Sounds */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-400">
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
            </TabsContent>

            {/* Gauges Tab */}
            <TabsContent value="gauges" className="p-6 space-y-8 m-0">
              {/* Units */}
              <div>
                <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-400 mb-4">
                  Units
                </h3>
                <Select value={settings.units} onValueChange={handleUnitsChange}>
                  <SelectTrigger className="w-48" data-testid="units-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="imperial">Imperial (MPH, °F)</SelectItem>
                    <SelectItem value="metric">Metric (KM/H, °C)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Gauge Style */}
              <div>
                <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-400 mb-4">
                  Gauge Style
                </h3>
                <Select value={settings.gauge_style} onValueChange={handleGaugeStyleChange}>
                  <SelectTrigger className="w-48" data-testid="gauge-style-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="classic">Classic</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Gauges Note */}
              <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50">
                <h4 className="text-sm font-medium text-zinc-400 mb-2">Custom Gauges</h4>
                <p className="text-xs text-zinc-600">
                  Custom gauge import feature coming soon. You'll be able to upload your own 
                  gauge designs and backgrounds.
                </p>
              </div>
            </TabsContent>

            {/* Data Source Tab */}
            <TabsContent value="data" className="p-6 space-y-8 m-0">
              <div>
                <h3 className="text-sm font-medium uppercase tracking-wider text-zinc-400 mb-4">
                  Data Source
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleDataSourceChange('simulated')}
                    className={`
                      p-4 rounded-xl border-2 text-left transition-all
                      ${dataSource === 'simulated' 
                        ? 'border-green-500/50 bg-green-500/10' 
                        : 'border-zinc-800 hover:border-zinc-700'
                      }
                    `}
                    data-testid="data-source-simulated"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Database size={18} className={dataSource === 'simulated' ? 'text-green-500' : 'text-zinc-500'} />
                      <span className="font-medium">Simulated</span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Demo mode with simulated vehicle data for testing and development.
                    </p>
                  </button>

                  <button
                    onClick={() => handleDataSourceChange('obd')}
                    className={`
                      p-4 rounded-xl border-2 text-left transition-all
                      ${dataSource === 'obd' 
                        ? 'border-blue-500/50 bg-blue-500/10' 
                        : 'border-zinc-800 hover:border-zinc-700'
                      }
                    `}
                    data-testid="data-source-obd"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Activity size={18} className={dataSource === 'obd' ? 'text-blue-500' : 'text-zinc-500'} />
                      <span className="font-medium">OBD-II / CAN</span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Real vehicle data via OBD-II adapter or CAN bus connection.
                    </p>
                  </button>
                </div>

                {dataSource === 'obd' && (
                  <div className="mt-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
                    <p className="text-sm text-amber-400">
                      <strong>Note:</strong> OBD-II mode requires hardware connection. 
                      This feature will be fully available in a future update.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Diagnostics Tab */}
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
