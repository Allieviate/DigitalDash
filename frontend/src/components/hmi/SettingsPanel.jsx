import React, { useMemo } from 'react';
import { X, CarFront, LayoutGrid, Save } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import { useVehicleData } from '../../contexts/VehicleDataContext';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';

/**
 * Shared, known-safe gauge image assets from /public/assets/gauges.
 * Keeping this list explicit prevents typo-prone manual entry for common paths.
 */
const GAUGE_ASSET_OPTIONS = [
  '/assets/gauges/rpm-gauge.png',
  '/assets/gauges/spd-gauge.png',
  '/assets/gauges/rpm-needle.png',
  '/assets/gauges/rpm-medium-ticks.png',
  '/assets/gauges/spd-medium-ticks.png',
  '/assets/gauges/rpm-large-ticks.png',
  '/assets/gauges/spd-large-ticks.png',
];

const WIDGET_TYPE_OPTIONS = [
  'RpmGauge',
  'SpeedGauge',
  'ShiftLightsBar',
  'DigitalSpeedGear',
  'TurnSignalsRow',
  'WarningPanel',
  'CriticalWarningBanner',
  'AndroidAutoPanel',
  'ConnectionStatus',
  'InfoGauge',
  'CircularGauge',
];

/**
 * Helper row used by both tabs for consistent motorsport-themed settings styling.
 */
const SettingRow = ({ label, description, children, testId }) => (
  <div
    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3"
    data-testid={testId}
  >
    <div className="pr-4">
      <h4 className="font-eurostar text-sm uppercase tracking-wider text-zinc-100">{label}</h4>
      {description && <p className="mt-1 text-xs text-zinc-500">{description}</p>}
    </div>
    {children}
  </div>
);

export const SettingsPanel = ({ onClose }) => {
  const { settings, updateLayout, updateFeatureToggle, updateSetting } = useSettings();
  const { dataSource, switchDataSource } = useVehicleData();

  /**
   * We always edit one widget at a time in this step.
   * Default to first available item when a prior selection isn't available.
   */
  const selectedWidgetId = settings?.selectedLayoutWidgetId || settings?.layout?.[0]?.id || '';

  const selectedWidget = useMemo(
    () => settings.layout.find((widget) => widget.id === selectedWidgetId) || settings.layout[0],
    [selectedWidgetId, settings.layout],
  );

  const handleTelemetryModeToggle = async (useObd) => {
    const nextSource = useObd ? 'obd2' : 'simulation';
    switchDataSource(nextSource);
    await updateSetting('data_source', nextSource);
  };

  const FEATURE_LAYOUT_LINKS = {
    showTurnSignals: ['turn_signals'],
    showDiagnostics: ['warning_panel'],
    showAndroidAutoPanel: ['android_auto_panel'],
  };

  const handleFeatureToggle = (key) => (enabled) => {
    // Dispatch directly through SettingsContext to persist immediately.
    updateFeatureToggle(key, enabled);

    // Keep JSON layout in sync so toggles also drive runtime widget visibility.
    const linkedWidgetIds = FEATURE_LAYOUT_LINKS[key];
    if (linkedWidgetIds?.length) {
      updateLayout((currentLayout) =>
        currentLayout.map((widget) =>
          linkedWidgetIds.includes(widget.id)
            ? {
                ...widget,
                visible: Boolean(enabled),
              }
            : widget,
        ),
      );
    }
  };

  const handleWidgetSelection = async (event) => {
    await updateSetting('selectedLayoutWidgetId', event.target.value);
  };

  const patchSelectedWidget = (patch) => {
    if (!selectedWidget) return;

    // Update layout with immutable map to preserve referential clarity.
    updateLayout((currentLayout) =>
      currentLayout.map((widget) =>
        widget.id === selectedWidget.id
          ? {
              ...widget,
              ...patch,
            }
          : widget,
      ),
    );
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" data-testid="settings-panel">
      <div className="h-[90vh] w-full max-w-5xl overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 shadow-[0_0_60px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="font-eurostar text-xl font-bold uppercase tracking-wider text-zinc-50">Project Fran Settings</h2>
            <p className="mt-1 text-xs text-zinc-500">Drive Mode performance-safe editor controls</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-zinc-300 hover:bg-zinc-800" data-testid="close-settings-btn">
            <X size={20} />
          </Button>
        </div>

        <Tabs defaultValue="vehicle-features" className="h-[calc(100%-73px)]">
          <TabsList className="w-full justify-start gap-2 rounded-none border-b border-zinc-800 bg-zinc-950 px-6 py-2">
            <TabsTrigger value="vehicle-features" className="font-eurostar data-[state=active]:bg-red-600/20 data-[state=active]:text-red-500">
              <CarFront size={15} className="mr-2" />
              Vehicle Features
            </TabsTrigger>
            <TabsTrigger value="dashboard-layout" className="font-eurostar data-[state=active]:bg-red-600/20 data-[state=active]:text-red-500">
              <LayoutGrid size={15} className="mr-2" />
              Dashboard Layout
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100%-50px)]">
            <TabsContent value="vehicle-features" className="m-0 space-y-4 p-6">
              <SettingRow
                label="Enable Boost Gauge"
                description="Shows boost telemetry widget when turbo/supercharger data is present."
                testId="feature-enableBoostGauge"
              >
                <Switch checked={Boolean(settings.featureToggles.enableBoostGauge)} onCheckedChange={handleFeatureToggle('enableBoostGauge')} />
              </SettingRow>

              <SettingRow
                label="Enable A/C Status"
                description="Displays compressor/request state indicators in the dash layer."
                testId="feature-enableACStatus"
              >
                <Switch checked={Boolean(settings.featureToggles.enableACStatus)} onCheckedChange={handleFeatureToggle('enableACStatus')} />
              </SettingRow>

              <SettingRow
                label="Show Turn Signals"
                description="Toggles left/right indicator widget visibility from the layout model."
                testId="feature-showTurnSignals"
              >
                <Switch checked={Boolean(settings.featureToggles.showTurnSignals)} onCheckedChange={handleFeatureToggle('showTurnSignals')} />
              </SettingRow>

              <SettingRow
                label="OBD Telemetry Mode"
                description="Switch between simulated telemetry and live OBD stream."
                testId="feature-telemetryMode"
              >
                <div className="flex items-center gap-3">
                  <span className="font-orbitron text-xs text-zinc-500">SIM</span>
                  <Switch
                    checked={dataSource === 'obd1' || dataSource === 'obd2'}
                    onCheckedChange={handleTelemetryModeToggle}
                    data-testid="telemetry-source-switch"
                  />
                  <span className="font-orbitron text-xs text-red-600">OBD</span>
                </div>
              </SettingRow>
            </TabsContent>

            <TabsContent value="dashboard-layout" className="m-0 space-y-6 p-6">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <h3 className="mb-3 font-eurostar text-sm uppercase tracking-wider text-zinc-300">Widget Selection</h3>
                <select
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-orbitron text-sm text-zinc-100 outline-none focus:border-red-600"
                  value={selectedWidget?.id || ''}
                  onChange={handleWidgetSelection}
                  data-testid="layout-widget-selector"
                >
                  {settings.layout.map((widget) => (
                    <option key={widget.id} value={widget.id}>
                      {widget.id}
                    </option>
                  ))}
                </select>
              </div>

              {selectedWidget && (
                <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4" data-testid="layout-widget-editor">
                  <h3 className="font-eurostar text-sm uppercase tracking-wider text-zinc-300">Selected Widget Editor</h3>

                  <SettingRow label="Visible" description="Render this widget in drive mode.">
                    <Switch checked={Boolean(selectedWidget.visible)} onCheckedChange={(value) => patchSelectedWidget({ visible: value })} />
                  </SettingRow>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block font-eurostar text-xs uppercase tracking-wider text-zinc-400">Widget Type</label>
                      <select
                        className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-orbitron text-sm text-zinc-100 outline-none focus:border-red-600"
                        value={selectedWidget.type}
                        onChange={(event) => patchSelectedWidget({ type: event.target.value })}
                        data-testid="layout-widget-type"
                      >
                        {WIDGET_TYPE_OPTIONS.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block font-eurostar text-xs uppercase tracking-wider text-zinc-400">Face Image</label>
                      <Input
                        value={selectedWidget.faceImage || ''}
                        onChange={(event) => patchSelectedWidget({ faceImage: event.target.value })}
                        placeholder="/assets/gauges/rpm-gauge.png"
                        className="border-zinc-700 bg-zinc-950 font-orbitron text-zinc-100 focus-visible:ring-red-600"
                        data-testid="layout-face-image"
                        list="faceImageOptions"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block font-eurostar text-xs uppercase tracking-wider text-zinc-400">Needle Image</label>
                      <Input
                        value={selectedWidget.needleImage || ''}
                        onChange={(event) => patchSelectedWidget({ needleImage: event.target.value })}
                        placeholder="/assets/gauges/rpm-needle.png"
                        className="border-zinc-700 bg-zinc-950 font-orbitron text-zinc-100 focus-visible:ring-red-600"
                        data-testid="layout-needle-image"
                        list="needleImageOptions"
                      />
                    </div>
                  </div>

                  <datalist id="faceImageOptions">
                    {GAUGE_ASSET_OPTIONS.map((assetPath) => (
                      <option key={`face-${assetPath}`} value={assetPath} />
                    ))}
                  </datalist>
                  <datalist id="needleImageOptions">
                    {GAUGE_ASSET_OPTIONS.map((assetPath) => (
                      <option key={`needle-${assetPath}`} value={assetPath} />
                    ))}
                  </datalist>

                  <div className="flex items-center gap-2 border-t border-zinc-800 pt-3 text-xs text-zinc-500">
                    <Save size={14} className="text-red-600" />
                    Changes are written to SettingsContext immediately and persisted locally.
                  </div>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsPanel;
