using System;
using System.Windows;
using System.Windows.Controls;

namespace DigitalDash.Controls
{
    public partial class RpmGauge : UserControl
    {
        public RpmGauge()
        {
            InitializeComponent();
        }

        // --- VTEC START RPM ---

        public double VtecStartRpm
        {
            get => (double)GetValue(VtecStartRpmProperty);
            set => SetValue(VtecStartRpmProperty, value);
        }

        public static readonly DependencyProperty VtecStartRpmProperty =
            DependencyProperty.Register(
                nameof(VtecStartRpm),
                typeof(double),
                typeof(RpmGauge),
                new PropertyMetadata(3000.0, OnRpmOrMaxRpmChanged));

        // --- SHIFT LIGHT RPM ---

        public double ShiftRpm
        {
            get => (double)GetValue(ShiftRpmProperty);
            set => SetValue(ShiftRpmProperty, value);
        }

        public static readonly DependencyProperty ShiftRpmProperty =
            DependencyProperty.Register(
                nameof(ShiftRpm),
                typeof(double),
                typeof(RpmGauge),
                new PropertyMetadata(7800.0, OnRpmOrMaxRpmChanged));

        // --- RPM ---

        public double Rpm
        {
            get => (double)GetValue(RpmProperty);
            set => SetValue(RpmProperty, value);
        }

        public static readonly DependencyProperty RpmProperty =
            DependencyProperty.Register(
                nameof(Rpm),
                typeof(double),
                typeof(RpmGauge),
                new PropertyMetadata(0.0, OnRpmOrMaxRpmChanged));

        // --- MAX RPM ---

        public double MaxRpm
        {
            get => (double)GetValue(MaxRpmProperty);
            set => SetValue(MaxRpmProperty, value);
        }

        public static readonly DependencyProperty MaxRpmProperty =
            DependencyProperty.Register(
                nameof(MaxRpm),
                typeof(double),
                typeof(RpmGauge),
                new PropertyMetadata(8000.0, OnRpmOrMaxRpmChanged));

        // --- NEEDLE ANGLE (for RotateTransform) ---

        public double NeedleAngle
        {
            get => (double)GetValue(NeedleAngleProperty);
            set => SetValue(NeedleAngleProperty, value);
        }

        public static readonly DependencyProperty NeedleAngleProperty =
            DependencyProperty.Register(
                nameof(NeedleAngle),
                typeof(double),
                typeof(RpmGauge),
                new PropertyMetadata(0.0));

        // --- VTEC PROGRESS (0..1 into VTEC band) ---

        private static readonly DependencyPropertyKey VtecProgressPropertyKey =
            DependencyProperty.RegisterReadOnly(
                nameof(VtecProgress),
                typeof(double),
                typeof(RpmGauge),
                new PropertyMetadata(0.0));

        public static readonly DependencyProperty VtecProgressProperty =
            VtecProgressPropertyKey.DependencyProperty;

        public double VtecProgress
        {
            get => (double)GetValue(VtecProgressProperty);
            private set => SetValue(VtecProgressPropertyKey, value);
        }

        // --- IN VTEC (bool for XAML triggers) ---

        private static readonly DependencyPropertyKey InVtecPropertyKey =
            DependencyProperty.RegisterReadOnly(
                nameof(InVtec),
                typeof(bool),
                typeof(RpmGauge),
                new PropertyMetadata(false));

        public static readonly DependencyProperty InVtecProperty =
            InVtecPropertyKey.DependencyProperty;

        public bool InVtec
        {
            get => (bool)GetValue(InVtecProperty);
            private set => SetValue(InVtecPropertyKey, value);
        }

        // --- IN SHIFT LIGHT ---

        private static readonly DependencyPropertyKey InShiftPropertyKey =
            DependencyProperty.RegisterReadOnly(
                nameof(InShift),
                typeof(bool),
                typeof(RpmGauge),
                new PropertyMetadata(false));

        public static readonly DependencyProperty InShiftProperty =
            InShiftPropertyKey.DependencyProperty;

        // --- IN HIGH RPM (for S2000-style sweep) ---

        private static readonly DependencyPropertyKey InHighRpmPropertyKey =
            DependencyProperty.RegisterReadOnly(
                nameof(InHighRpm),
                typeof(bool),
                typeof(RpmGauge),
                new PropertyMetadata(false));

        public static readonly DependencyProperty InHighRpmProperty =
            InHighRpmPropertyKey.DependencyProperty;

        public bool InHighRpm
        {
            get => (bool)GetValue(InHighRpmProperty);
            private set => SetValue(InHighRpmPropertyKey, value);
        }

        public bool InShift
        {
            get => (bool)GetValue(InShiftProperty);
            private set => SetValue(InShiftPropertyKey, value);
        }

        // --- CHANGE HANDLER ---

        private static void OnRpmOrMaxRpmChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
        {
            ((RpmGauge)d).UpdateState();
        }

        private void UpdateState()
        {
            var rpm = Rpm;
            var maxRpm = MaxRpm <= 0 ? 8000.0 : MaxRpm;

            // normalize RPM to 0..1
            var t = rpm / maxRpm;
            if (t < 0) t = 0;
            if (t > 1) t = 1;

            // base needle sweep
            const double startAngle = -120.0;
            const double sweepAngle = 240.0;

            NeedleAngle = startAngle + t * sweepAngle;

            // --- VTEC STATE / PROGRESS ---

            var vtecStart = VtecStartRpm;
            if (vtecStart <= 0 || vtecStart >= maxRpm)
            {
                InVtec = false;
                VtecProgress = 0;
            }
            else if (rpm <= vtecStart)
            {
                InVtec = false;
                VtecProgress = 0;
            }
            else
            {
                InVtec = true;
                var vtecSpan = maxRpm - vtecStart;
                var p = (rpm - vtecStart) / vtecSpan;
                if (p < 0) p = 0;
                if (p > 1) p = 1;
                VtecProgress = p;
            }
            //--- HIGH RPM STATE ---

            var highRpmThreshold = maxRpm * 0.80;
            InHighRpm = rpm >= highRpmThreshold;


            // --- SHIFT LIGHT STATE ---

            var shiftRpm = ShiftRpm;
            if (shiftRpm > 0 && rpm >= shiftRpm)
            {
                InShift = true;
            }
            else
            {
                InShift = false;
            }
        }
    }
}
