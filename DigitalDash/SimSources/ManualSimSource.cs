using System;

namespace DigitalDash.SimSources
{
    public class ManualSimSource : ISimSource
    {
        public void Tick(double dt) { }

        public double Rpm => 900;
        public double Speed => 0;

        public string GearText => "N";
        public string PrevGearText => "R";
        public string NextGearText => "1";

        public bool FlashUpShift => false;
        public bool FlashDownShift => false;

        public double ShiftLight1 => 0;
        public double ShiftLight2 => 0;
        public double ShiftLight3 => 0;
        public double ShiftLight4 => 0;
        public double ShiftLight5 => 0;
        public double ShiftLight6 => 0;
        public double ShiftLight7 => 0;

        public bool IsShuttingDown => false;
        public void BeginShutdown() { }
        public double ClusterOpacity => 1.0;
        public double ShiftLightMasterOpacity => 1.0;
    }
}
