using System;

namespace DigitalDash.SimSources
{
    public class CvtSimSource : ISimSource
    {
        private const double IdleRpm = 850;
        private const double RedlineRpm = 6500;

        private readonly Random _rand = new();
        private double _time;

        private double _rpm;
        private double _speed;

        // Display state
        private string _gearText = "N";
        private string _prev = " ";
        private string _next = " ";

        // Flash flags + timers
        private bool _flashUp;
        private bool _flashDown;
        private double _upTimer;
        private double _downTimer;

        // Shutdown
        private bool _isShuttingDown;
        private double _shutdownTimer;
        private double _clusterOpacity = 1.0;
        private double _shiftLightMasterOpacity = 1.0;

        // Shift lights
        private double s1, s2, s3, s4, s5, s6, s7;

        public double Rpm => _rpm;
        public double Speed => _speed;

        public string GearText => _gearText;
        public string PrevGearText => _prev;
        public string NextGearText => _next;

        public bool FlashUpShift => _flashUp;
        public bool FlashDownShift => _flashDown;

        public double ShiftLight1 => s1;
        public double ShiftLight2 => s2;
        public double ShiftLight3 => s3;
        public double ShiftLight4 => s4;
        public double ShiftLight5 => s5;
        public double ShiftLight6 => s6;
        public double ShiftLight7 => s7;

        public bool IsShuttingDown => _isShuttingDown;
        public double ClusterOpacity => _clusterOpacity;
        public double ShiftLightMasterOpacity => _shiftLightMasterOpacity;

        public CvtSimSource()
        {
            _rpm = IdleRpm;
            _speed = 0;
            SetRangeNeutral();
        }

        public void Tick(double dt)
        {
            _time += dt;

            if (_isShuttingDown)
            {
                HandleShutdown(dt);
                return;
            }

            // Phase 1 bench: start like a normal car
            // 0–2s: N idle
            // 2–3s: D engage
            // 3s+: gentle drive wave 0–70mph
            if (_time < 2.0)
            {
                SetRangeNeutral();
                _speed = Ease(_speed, 0, 0.10);
                _rpm = Ease(_rpm, IdleRpm + Noise(30), 0.12);
            }
            else if (_time < 3.0)
            {
                SetRangeDrive();
                _speed = Ease(_speed, 0, 0.10);
                _rpm = Ease(_rpm, 1100 + Noise(40), 0.12);
            }
            else
            {
                SetRangeDrive();

                // smooth speed wave 0–70
                double load = (Math.Sin((_time - 3.0) * 0.18 - Math.PI / 2.0) * 0.5) + 0.5;
                double targetSpeed = load * 70.0 + Noise(0.4);

                if (targetSpeed < 0) targetSpeed = 0;
                _speed = Ease(_speed, targetSpeed, 0.08);

                // CVT-ish RPM behavior: rises with load, not stepped gears
                double targetRpm = IdleRpm + (load * 4200.0);
                if (_speed < 3) targetRpm = IdleRpm + 100;
                targetRpm += Noise(60);

                if (targetRpm < IdleRpm) targetRpm = IdleRpm;
                if (targetRpm > RedlineRpm) targetRpm = RedlineRpm;

                _rpm = Ease(_rpm, targetRpm, 0.10);
            }

            UpdateFlashTimers(dt);
            UpdateShiftLights(_rpm);
        }

        public void BeginShutdown()
        {
            if (_isShuttingDown) return;
            _isShuttingDown = true;
            _shutdownTimer = 0;
        }

        private void HandleShutdown(double dt)
        {
            _shutdownTimer += dt;

            _speed = Ease(_speed, 0, 0.20);
            _rpm = Ease(_rpm, 0, 0.20);

            double fade = Math.Min(1.0, _shutdownTimer / 1.2);
            _clusterOpacity = 1.0 - fade;
            _shiftLightMasterOpacity = _clusterOpacity;

            if (_shutdownTimer > 1.2)
            {
                // leave actual app shutdown to MainWindow or VM if you want
            }
        }

        private void UpdateFlashTimers(double dt)
        {
            if (_upTimer > 0)
            {
                _upTimer -= dt;
                if (_upTimer <= 0) _flashUp = false;
            }
            if (_downTimer > 0)
            {
                _downTimer -= dt;
                if (_downTimer <= 0) _flashDown = false;
            }
        }

        private void SetRangeNeutral()
        {
            _gearText = "N";
            _prev = "R";
            _next = "D";
        }

        private void SetRangeDrive()
        {
            _gearText = "D";
            _prev = " ";
            _next = " ";
        }

        private void UpdateShiftLights(double rpm)
        {
            // Keep them mostly off in D/CVT unless you want “Type R style” based on RPM.
            // If you DO want them: map 1000..8000 the same way.
            double[] levels = new double[7];
            for (int i = 0; i < 7; i++)
            {
                double start = (i + 1) * 1000.0;
                levels[i] = Clamp01((rpm - start) / 1000.0);
            }

            s1 = levels[0]; s2 = levels[1]; s3 = levels[2]; s4 = levels[3];
            s5 = levels[4]; s6 = levels[5]; s7 = levels[6];

            _shiftLightMasterOpacity = 1.0;
        }

        private double Noise(double amp) => (_rand.NextDouble() - 0.5) * 2.0 * amp;
        private static double Ease(double v, double t, double k) => v + (t - v) * k;
        private static double Clamp01(double t) => t < 0 ? 0 : (t > 1 ? 1 : t);
    }
}
