namespace DigitalDash.SimSources
{
    public interface ISimSource
    {
        void Tick(double dt);

        double Rpm { get; }
        double Speed { get; }

        // What the dash should show in the center: "D", "N", "R", "1".."7" etc.
        string GearText { get; }

        // For the “ghost” left/right values
        string PrevGearText { get; }
        string NextGearText { get; }

        // Triggers for pulses
        bool FlashUpShift { get; }
        bool FlashDownShift { get; }

        // Shift light bar 0..1
        double ShiftLight1 { get; }
        double ShiftLight2 { get; }
        double ShiftLight3 { get; }
        double ShiftLight4 { get; }
        double ShiftLight5 { get; }
        double ShiftLight6 { get; }
        double ShiftLight7 { get; }

        // For shutdown test
        bool IsShuttingDown { get; }
        void BeginShutdown();
        double ClusterOpacity { get; }
        double ShiftLightMasterOpacity { get; }
    }
}
