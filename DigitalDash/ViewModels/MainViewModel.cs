using System;
using System.Windows.Threading;

namespace DigitalDash.ViewModels
{
    public class MainViewModel : BaseViewModel
    {
        private double _rpm;
        private double _speed;

        private readonly DispatcherTimer _demoTimer;
        private double _demoAngle;

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

        public MainViewModel()
        {
            Rpm = 900;
            Speed = 0;

            _demoTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromMilliseconds(50)
            };
            _demoTimer.Tick += DemoTick;
            _demoTimer.Start();
        }

        private void DemoTick(object? sender, EventArgs e)
        {
            _demoAngle += 0.05;

            Rpm = 800 + Math.Abs(Math.Sin(_demoAngle) * 6000);
            Speed = Math.Abs(Math.Sin(_demoAngle * 0.7) * 140);
        }
    }
}
