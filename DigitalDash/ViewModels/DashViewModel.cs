using System;
using System.Windows;
using System.Windows.Threading;

namespace DigitalDash.ViewModels
{
    public class DashViewModel : BaseViewModel
    {
        // === Engine constants ===
        private const double IdleRpm = 900.0;
        private const double RedlineRpm = 8000.0;

        // === Sim fields ===
        private double _rpm;
        private double _speed;
        private int _gear;

        private double _rpmTarget;
        private double _speedTarget;

        private readonly DispatcherTimer _timer;
        private double _time;

        private readonly Random _rand = new();

        // Gear flash control
        private int _lastDisplayedGear;
        private double _upShiftFlashTimer;
        private double _downShiftFlashTimer;
        private bool _flashUpShift;
        private bool _flashDownShift;

        // Shutdown
        private bool _isShuttingDown;
        private double _shutdownTimer;

        // Shift lights
        private double _shiftLight1, _shiftLight2, _shiftLight3;
        private double _shiftLight4, _shiftLight5, _shiftLight6, _shiftLight7;

        private double _clusterOpacity = 1.0;
        private double _shiftLightMasterOpacity = 1.0;

        // =========================
        // PHASE 1: Fuel + Coolant + Indicators
        // =========================

        private double _fuelLevel = 1.0;          // 0..1
        private double _coolantTempC = 25.0;      // deg C

        private bool _leftTurn;
        private bool _rightTurn;

        private bool _checkEngine;
        private bool _maintenance;

        private bool _lowFuel;
        private bool _highCoolant;

        // Internal blink timing
        private double _blinkTimer;
        private bool _blinkOn;

        // === Public bindables ===

        public double Rpm
        {
            get => _rpm;
            set => SetField(ref _rpm, value);
        }

        public double Speed
        {
            get => _speed;
            set => SetField(ref _speed, value);
        }

        // -1 = R, 0 = N, 1..6 forward
        public int Gear
        {
            get => _gear;
            set
            {
                if (SetField(ref _gear, value))
                {
                    OnPropertyChanged(nameof(GearText));
                    OnPropertyChanged(nameof(PrevGearText));
                    OnPropertyChanged(nameof(NextGearText));

                    if (_gear != _lastDisplayedGear)
                    {
                        if (_gear > _lastDisplayedGear) TriggerUpShiftFlash();
                        else if (_gear < _lastDisplayedGear) TriggerDownShiftFlash();

                        _lastDisplayedGear = _gear;
                    }
                }
            }
        }

        public string GearText => Gear switch
        {
            -1 => "R",
            0 => "N",
            _ => Gear.ToString()
        };

        public string PrevGearText => Gear switch
        {
            -1 => " ",
            0 => "R",
            1 => "N",
            _ => (Gear - 1).ToString()
        };

        public string NextGearText => Gear switch
        {
            -1 => "N",
            0 => "1",
            6 => " ",
            _ => (Gear + 1).ToString()
        };

        public bool FlashUpShift
        {
            get => _flashUpShift;
            set => SetField(ref _flashUpShift, value);
        }

        public bool FlashDownShift
        {
            get => _flashDownShift;
            set => SetField(ref _flashDownShift, value);
        }

        public double ShiftLight1 { get => _shiftLight1; set => SetField(ref _shiftLight1, value); }
        public double ShiftLight2 { get => _shiftLight2; set => SetField(ref _shiftLight2, value); }
        public double ShiftLight3 { get => _shiftLight3; set => SetField(ref _shiftLight3, value); }
        public double ShiftLight4 { get => _shiftLight4; set => SetField(ref _shiftLight4, value); }
        public double ShiftLight5 { get => _shiftLight5; set => SetField(ref _shiftLight5, value); }
        public double ShiftLight6 { get => _shiftLight6; set => SetField(ref _shiftLight6, value); }
        public double ShiftLight7 { get => _shiftLight7; set => SetField(ref _shiftLight7, value); }

        public double ClusterOpacity
        {
            get => _clusterOpacity;
            set => SetField(ref _clusterOpacity, value);
        }

        public double ShiftLightMasterOpacity
        {
            get => _shiftLightMasterOpacity;
            set => SetField(ref _shiftLightMasterOpacity, value);
        }

        // ===== Phase 1 bindables =====

        /// <summary>0..1</summary>
        public double FuelLevel
        {
            get => _fuelLevel;
            set => SetField(ref _fuelLevel, value);
        }

        public double CoolantTempC
        {
            get => _coolantTempC;
            set => SetField(ref _coolantTempC, value);
        }

        public bool LeftTurn
        {
            get => _leftTurn;
            set => SetField(ref _leftTurn, value);
        }

        public bool RightTurn
        {
            get => _rightTurn;
            set => SetField(ref _rightTurn, value);
        }

        public bool CheckEngine
        {
            get => _checkEngine;
            set => SetField(ref _checkEngine, value);
        }

        public bool Maintenance
        {
            get => _maintenance;
            set => SetField(ref _maintenance, value);
        }

        public bool LowFuel
        {
            get => _lowFuel;
            set => SetField(ref _lowFuel, value);
        }

        public bool HighCoolant
        {
            get => _highCoolant;
            set => SetField(ref _highCoolant, value);
        }

        // === Constructor ===

        public DashViewModel()
        {
            Rpm = IdleRpm;
            Speed = 0;
            Gear = 0;
            _lastDisplayedGear = Gear;

            FuelLevel = 1.0;
            CoolantTempC = 25.0;

            _rpmTarget = Rpm;
            _speedTarget = Speed;

            _timer = new DispatcherTimer
            {
                Interval = TimeSpan.FromMilliseconds(25)
            };
            _timer.Tick += OnTick;
            _timer.Start();
        }

        // === Main loop ===

        private void OnTick(object? sender, EventArgs e)
        {
            double dt = _timer.Interval.TotalSeconds;
            _time += dt;

            if (_isShuttingDown)
            {
                HandleShutdown(dt);
                return;
            }

            UpdateTargets(dt);

            // Smooth movement
            const double smoothing = 0.18;
            Rpm += (_rpmTarget - Rpm) * smoothing;
            Speed += (_speedTarget - Speed) * smoothing;

            UpdateFlashTimers(dt);
            UpdateShiftLights(Rpm, dt);

            // Phase 1
            UpdateFuelAndCoolant(dt);
            UpdateIndicators(dt);
        }

        private void UpdateTargets(double dt)
        {
            // Start “like a normal car”: time=0 near 0 load
            double load = (Math.Sin(_time * 0.15 - Math.PI / 2) * 0.5) + 0.5;

            _speedTarget = load * 120.0;
            _speedTarget += (_rand.NextDouble() - 0.5) * 0.8; // small noise
            if (_speedTarget < 0) _speedTarget = 0;

            int gear = SelectGearForSpeed(_speedTarget);

            if (gear == 0)
            {
                _rpmTarget = IdleRpm;
            }
            else
            {
                // Simple believable RPM mapping (you can re-introduce real math later)
                double rpm = 1200 + (_speedTarget * 60) + (load * 1500);
                _rpmTarget = Math.Clamp(rpm, IdleRpm, RedlineRpm);
            }

            Gear = gear;
        }

        private static int SelectGearForSpeed(double speed)
        {
            if (speed < 3) return 0;
            if (speed < 30) return 1;
            if (speed < 50) return 2;
            if (speed < 70) return 3;
            if (speed < 95) return 4;
            if (speed < 120) return 5;
            return 6;
        }

        // === Gear flash helpers ===

        private void UpdateFlashTimers(double dt)
        {
            if (_upShiftFlashTimer > 0)
            {
                _upShiftFlashTimer -= dt;
                if (_upShiftFlashTimer <= 0) FlashUpShift = false;
            }

            if (_downShiftFlashTimer > 0)
            {
                _downShiftFlashTimer -= dt;
                if (_downShiftFlashTimer <= 0) FlashDownShift = false;
            }
        }

        private void TriggerUpShiftFlash()
        {
            // hard-cancel downshift (prevents “red on upshift” overlap)
            FlashDownShift = false;
            _downShiftFlashTimer = 0;

            FlashUpShift = true;
            _upShiftFlashTimer = 0.25;
        }

        private void TriggerDownShiftFlash()
        {
            // hard-cancel upshift
            FlashUpShift = false;
            _upShiftFlashTimer = 0;

            FlashDownShift = true;
            _downShiftFlashTimer = 0.25;
        }

        // === Shutdown ===

        public void BeginShutdown()
        {
            if (_isShuttingDown) return;
            _isShuttingDown = true;
            _shutdownTimer = 0;
        }

        private void HandleShutdown(double dt)
        {
            _shutdownTimer += dt;

            _rpmTarget = 0;
            _speedTarget = 0;

            Rpm += (_rpmTarget - Rpm) * 0.3;
            Speed += (_speedTarget - Speed) * 0.3;

            ClusterOpacity = 1.0 - Math.Min(1.0, _shutdownTimer / 1.2);
            ShiftLightMasterOpacity = ClusterOpacity;

            if (Rpm < 200 && Speed < 1 && _shutdownTimer > 1.2)
                Application.Current.Shutdown();
        }

        // === Shift lights ===

        private void UpdateShiftLights(double rpm, double dt)
        {
            double[] levels = new double[7];

            for (int i = 0; i < 7; i++)
            {
                double start = (i + 1) * 1000;
                levels[i] = Math.Clamp((rpm - start) / 1000.0, 0, 1);
            }

            ShiftLight1 = levels[0];
            ShiftLight2 = levels[1];
            ShiftLight3 = levels[2];
            ShiftLight4 = levels[3];
            ShiftLight5 = levels[4];
            ShiftLight6 = levels[5];
            ShiftLight7 = levels[6];

            ShiftLightMasterOpacity = rpm >= 7600
                ? 0.5 * (Math.Sin(2 * Math.PI * 7 * _time) + 1)
                : 1.0;
        }

        // =========================
        // Phase 1: Fuel / Coolant / Indicators
        // =========================

        private void UpdateFuelAndCoolant(double dt)
        {
            // Fuel: very slow burn, increases slightly with speed/load
            double load = (Math.Sin(_time * 0.15 - Math.PI / 2) * 0.5) + 0.5;
            double burn = (0.000010 + (Speed / 170.0) * 0.000020 + load * 0.000010) * dt; // subtle
            FuelLevel = Math.Clamp(FuelLevel - burn, 0.0, 1.0);

            // Coolant: warms from ambient up toward ~90–100 depending on “load”
            double coolantTarget = 35.0 + (load * 55.0) + (Speed / 170.0) * 10.0; // ~35..100
            coolantTarget = Math.Clamp(coolantTarget, 20.0, 110.0);

            // Smooth approach
            double rate = 0.35; // higher = faster warmup response
            CoolantTempC += (coolantTarget - CoolantTempC) * rate * dt;

            // Flags driven by values
            LowFuel = FuelLevel <= 0.12;
            HighCoolant = CoolantTempC >= 105.0;
        }

        private void UpdateIndicators(double dt)
        {
            // Blink base (0.5s toggle)
            _blinkTimer += dt;
            if (_blinkTimer >= 0.5)
            {
                _blinkTimer = 0;
                _blinkOn = !_blinkOn;
            }

            // Demo cycle so you can SEE them working without wiring inputs yet:
            // 0–5s: none
            // 5–10s: left
            // 10–15s: right
            // 15–20s: hazards
            double phase = _time % 20.0;

            bool leftReq = phase >= 5.0 && phase < 10.0;
            bool rightReq = phase >= 10.0 && phase < 15.0;
            bool hazardReq = phase >= 15.0;

            bool left = (leftReq || hazardReq) && _blinkOn;
            bool right = (rightReq || hazardReq) && _blinkOn;

            LeftTurn = left;
            RightTurn = right;

            // Maintenance + CEL: keep calm, but show they exist
            // Maintenance comes on after 45 seconds of demo runtime
            Maintenance = _time >= 45.0;

            // CEL only if something is “wrong”
            CheckEngine = HighCoolant; // you can swap this later to a real DTC flag
        }
    }
}
