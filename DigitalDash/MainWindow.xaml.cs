using System;
using System.Windows;
using System.Windows.Threading;

namespace DigitalDash
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        private readonly MainViewModel _viewModel = new MainViewModel();
        private readonly DispatcherTimer _rpmTimer;
        private double _direction = 1.0;

        public MainWindow()
        {
            InitializeComponent();

            DataContext = _viewModel;

            _rpmTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromMilliseconds(100)
            };
            _rpmTimer.Tick += OnRpmTimerTick;

            Loaded += MainWindow_Loaded;
        }

        private void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            Loaded -= MainWindow_Loaded;

            if (TryFindResource("StartupStoryboard") is Storyboard storyboard)
            {
                storyboard.Begin(this);
            }

            _viewModel.CurrentRpm = _viewModel.MinimumRpm;
            _rpmTimer.Start();
        }

        protected override void OnClosed(EventArgs e)
        {
            _rpmTimer.Tick -= OnRpmTimerTick;
            _rpmTimer.Stop();

            base.OnClosed(e);
        }

        private void OnRpmTimerTick(object sender, EventArgs e)
        {
            const double Step = 250.0;
            var next = _viewModel.CurrentRpm + Step * _direction;

            if (next >= _viewModel.MaximumRpm)
            {
                next = _viewModel.MaximumRpm;
                _direction = -1.0;
            }
            else if (next <= _viewModel.MinimumRpm)
            {
                next = _viewModel.MinimumRpm;
                _direction = 1.0;
            }

            _viewModel.CurrentRpm = next;
        }
    }
}
