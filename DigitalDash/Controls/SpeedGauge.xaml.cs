using System;
using System.Windows;
using System.Windows.Controls;

namespace DigitalDash.Controls
{
    public partial class SpeedGauge : UserControl
    {
        public SpeedGauge()
        {
            InitializeComponent();
        }

        // --- SPEED (MPH) ---

        public double Speed
        {
            get => (double)GetValue(SpeedProperty);
            set => SetValue(SpeedProperty, value);
        }

        public static readonly DependencyProperty SpeedProperty =
            DependencyProperty.Register(
                nameof(Speed),
                typeof(double),
                typeof(SpeedGauge),
                new PropertyMetadata(0.0, OnSpeedOrMaxSpeedChanged));

        // --- MAX SPEED (SCALE TOP, e.g. 170 MPH) ---

        public double MaxSpeed
        {
            get => (double)GetValue(MaxSpeedProperty);
            set => SetValue(MaxSpeedProperty, value);
        }

        public static readonly DependencyProperty MaxSpeedProperty =
            DependencyProperty.Register(
                nameof(MaxSpeed),
                typeof(double),
                typeof(SpeedGauge),
                new PropertyMetadata(170.0, OnSpeedOrMaxSpeedChanged));

        // --- GEAR (1–6, 0 = neutral) ---

        public int Gear
        {
            get => (int)GetValue(GearProperty);
            set => SetValue(GearProperty, value);
        }

        public static readonly DependencyProperty GearProperty =
            DependencyProperty.Register(
                nameof(Gear),
                typeof(int),
                typeof(SpeedGauge),
                new PropertyMetadata(0));

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
                typeof(SpeedGauge),
                new PropertyMetadata(0.0));

        private static void OnSpeedOrMaxSpeedChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
        {
            ((SpeedGauge)d).UpdateAngle();
        }

        private void UpdateAngle()
        {
            double max = MaxSpeed <= 0 ? 170.0 : MaxSpeed;
            double mph = Speed;

            var t = mph / max;
            if (t < 0) t = 0;
            if (t > 1) t = 1;

            // same arc as RPM gauge (tweak if the art wants different)
            const double startAngle = -120.0;
            const double sweepAngle = 240.0;

            NeedleAngle = startAngle + t * sweepAngle;
        }
    }
}
