using System;
using System.Windows;
using System.Windows.Media;
using System.Windows.Threading;
using System.Windows.Input;          // <-- needed for KeyEventArgs / Key
using DigitalDash.ViewModels;

namespace DigitalDash
{
    public partial class MainWindow : Window
    {
        private readonly DispatcherTimer _bgTimer;
        private double _time;

        public MainWindow()
        {
            InitializeComponent();

            // Background Update Timer (~60 FPS)
            _bgTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromMilliseconds(60)
            };
            _bgTimer.Tick += OnBgTick;
            _bgTimer.Start();

            // ESC = shutdown sequence
            this.KeyDown += MainWindow_KeyDown;
        }

        private void MainWindow_KeyDown(object? sender, KeyEventArgs e)
        {
            if (e.Key == Key.Escape && DataContext is DashViewModel vm)
            {
                vm.BeginShutdown();
            }
        }

        private void OnBgTick(object? sender, EventArgs e)
        {
            if (DataContext is not DashViewModel vm)
                return;

            _time += _bgTimer.Interval.TotalSeconds;

            double speed = vm.Speed;

            // Clamp speed 0-170 MPH
            if (speed < 0) speed = 0;
            if (speed > 170) speed = 170;

            // --- Base colors for mapping ---

            Color black = Colors.Black;
            Color gray = (Color)ColorConverter.ConvertFromString("#242424")!;
            Color red = (Color)ColorConverter.ConvertFromString("#801212")!;

            Color innerBase;
            double redBlendFactor;

            // 0–80: black → gray
            if (speed <= 80.0)
            {
                double t = speed / 80.0;
                innerBase = LerpColor(black, gray, t);
                redBlendFactor = 0.0;
            }
            // 80–100: gray → red in the CENTER
            else if (speed <= 100.0)
            {
                double t = (speed - 80.0) / 20.0; // 0..1 from 80 to 100
                innerBase = LerpColor(gray, red, t);
                redBlendFactor = t;
            }
            // 100–170: center stays red, edges stay controlled
            else
            {
                innerBase = red;
                redBlendFactor = 0.6;
            }

            // --- Breathing Effect on inner ---

            double breath = 0.5 * (Math.Sin(_time * 0.4) + 1.0); // 0..1
            double strength = 0.06; // subtle

            // shift toward a slightly brighter version of innerBase
            Color innerBright = LerpColor(innerBase, Colors.White, 0.10);
            Color finalInner = LerpColor(innerBase, innerBright, breath * strength);

            // --- Mid + outer: keep them dark, not full red ---

            // mid: darker charcoal with at most ~30% of the red intensity
            Color midBaseGray = LerpColor(gray, black, 0.4); // darker gray
            Color mid = LerpColor(midBaseGray, finalInner, redBlendFactor * 0.2);

            // outer: almost black, just a hint of red at high speed
            Color outer = LerpColor(black, finalInner, redBlendFactor * 0.12);

            // --- Apply to Gradient Stops ---
            // (these are GradientStops you defined in MainWindow.xaml)

            if (BgInnerStop != null)
                BgInnerStop.Color = finalInner;

            if (BgMidStop != null)
                BgMidStop.Color = mid;

            if (BgOuterStop != null)
                BgOuterStop.Color = outer;
        }

        private static Color LerpColor(Color a, Color b, double t)
        {
            if (t < 0) t = 0;
            if (t > 1) t = 1;

            byte A = (byte)(a.A + (b.A - a.A) * t);
            byte R = (byte)(a.R + (b.R - a.R) * t);
            byte G = (byte)(a.G + (b.G - a.G) * t);
            byte B = (byte)(a.B + (b.B - a.B) * t);

            return Color.FromArgb(A, R, G, B);
        }
    }
}
