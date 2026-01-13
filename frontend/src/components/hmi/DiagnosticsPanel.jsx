import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../../contexts/ThemeContext';
import { useSettings } from '../../contexts/SettingsContext';
import { 
  Thermometer, 
  Droplet, 
  Zap, 
  Fuel,
  Gauge,
  Activity,
  AlertTriangle,
  RefreshCw,
  Settings2
} from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DiagnosticCard = ({ title, icon: Icon, children, className = '' }) => {
  const { theme } = useTheme();
  
  return (
    <div className={`glass-card p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800">
        <Icon size={16} style={{ color: theme.accent }} />
        <span className="text-sm font-medium uppercase tracking-wider">{title}</span>
      </div>
      {children}
    </div>
  );
};

const DataRow = ({ label, value, unit = '', warning = false, danger = false }) => {
  let valueColor = '#ffffff';
  if (danger) valueColor = '#EF4444';
  else if (warning) valueColor = '#F59E0B';
  
  return (
    <div className="flex justify-between items-center py-1.5">
      <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
      <span className="font-mono text-sm" style={{ color: valueColor }}>
        {value}
        {unit && <span className="text-zinc-500 ml-1">{unit}</span>}
      </span>
    </div>
  );
};

export const DiagnosticsPanel = ({ className = '' }) => {
  const { theme } = useTheme();
  const [diagnostics, setDiagnostics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDiagnostics = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/diagnostics`);
      setDiagnostics(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch diagnostics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
    const interval = setInterval(fetchDiagnostics, 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading && !diagnostics) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <RefreshCw className="animate-spin text-zinc-500" size={24} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center h-full gap-4 ${className}`}>
        <AlertTriangle className="text-red-500" size={32} />
        <span className="text-red-500">{error}</span>
        <Button variant="outline" onClick={fetchDiagnostics}>Retry</Button>
      </div>
    );
  }

  const { engine, fuel, electrical, transmission, oil, dtc_codes } = diagnostics || {};

  return (
    <ScrollArea className={`h-full ${className}`}>
      <div className="p-4 space-y-4" data-testid="diagnostics-panel">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity size={20} style={{ color: theme.accent }} />
            <h2 className="text-lg font-bold uppercase tracking-wider">
              Live Diagnostics
            </h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchDiagnostics}
            className="text-zinc-500 hover:text-white"
          >
            <RefreshCw size={14} className="mr-2" />
            Refresh
          </Button>
        </div>

        {/* DTC Codes Alert */}
        {dtc_codes && dtc_codes.length > 0 && (
          <div 
            className="p-4 rounded-lg border border-red-500/50 bg-red-950/30"
            data-testid="dtc-codes"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="text-red-500" size={18} />
              <span className="text-red-500 font-bold uppercase tracking-wider">
                Diagnostic Trouble Codes
              </span>
            </div>
            {dtc_codes.map((code, i) => (
              <div key={i} className="text-sm text-red-400 font-mono">
                {code}
              </div>
            ))}
          </div>
        )}

        {/* Grid of diagnostic cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Engine */}
          <DiagnosticCard title="Engine" icon={Gauge}>
            <DataRow label="RPM" value={engine?.rpm || 0} />
            <DataRow label="Load" value={engine?.load || 0} unit="%" />
            <DataRow 
              label="Coolant" 
              value={engine?.coolant_temp_c || 0} 
              unit="°C"
              warning={engine?.coolant_temp_c >= 95}
              danger={engine?.coolant_temp_c >= 105}
            />
            <DataRow label="Intake Air" value={engine?.intake_air_temp_c || 0} unit="°C" />
            <DataRow label="Throttle" value={engine?.throttle_position || 0} unit="%" />
          </DiagnosticCard>

          {/* Fuel System */}
          <DiagnosticCard title="Fuel System" icon={Fuel}>
            <DataRow 
              label="Fuel Level" 
              value={fuel?.fuel_level_pct || 0} 
              unit="%"
              warning={fuel?.fuel_level_pct <= 20}
              danger={fuel?.fuel_level_pct <= 10}
            />
            <DataRow label="Fuel Pressure" value={fuel?.fuel_pressure_kpa || 0} unit="kPa" />
            <DataRow label="Short Trim" value={fuel?.fuel_trim_short || 0} unit="%" />
            <DataRow label="Long Trim" value={fuel?.fuel_trim_long || 0} unit="%" />
          </DiagnosticCard>

          {/* Electrical */}
          <DiagnosticCard title="Electrical" icon={Zap}>
            <DataRow 
              label="Battery" 
              value={electrical?.battery_voltage?.toFixed(1) || 0} 
              unit="V"
              warning={electrical?.battery_voltage < 12.0}
              danger={electrical?.battery_voltage < 11.5}
            />
            <DataRow 
              label="Alternator" 
              value={electrical?.alternator_output?.toFixed(1) || 0} 
              unit="V"
            />
          </DiagnosticCard>

          {/* Transmission */}
          <DiagnosticCard title="Transmission" icon={Activity}>
            <DataRow label="Gear" value={transmission?.gear === 0 ? 'N' : transmission?.gear === -1 ? 'R' : transmission?.gear || 'N'} />
            <DataRow label="Speed (MPH)" value={transmission?.vehicle_speed_mph || 0} />
            <DataRow label="Speed (KM/H)" value={transmission?.vehicle_speed_kmh || 0} />
          </DiagnosticCard>

          {/* Oil */}
          <DiagnosticCard title="Oil System" icon={Droplet} className="md:col-span-2">
            <div className="grid grid-cols-2 gap-4">
              <DataRow 
                label="Pressure" 
                value={oil?.oil_pressure_psi || 0} 
                unit="PSI"
                warning={oil?.oil_pressure_psi < 20}
                danger={oil?.oil_pressure_psi < 15}
              />
              <DataRow 
                label="Temperature" 
                value={oil?.oil_temp_c || 0} 
                unit="°C"
                warning={oil?.oil_temp_c >= 120}
              />
            </div>
          </DiagnosticCard>
        </div>

        {/* Timestamp */}
        <div className="text-center text-[10px] text-zinc-600 uppercase tracking-wider pt-4">
          Last Updated: {diagnostics?.timestamp ? new Date(diagnostics.timestamp).toLocaleTimeString() : 'N/A'}
        </div>
      </div>
    </ScrollArea>
  );
};

export default DiagnosticsPanel;
