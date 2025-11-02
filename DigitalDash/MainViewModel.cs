using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace DigitalDash
{
    public class MainViewModel : INotifyPropertyChanged
    {
        private double _currentRpm;

        public event PropertyChangedEventHandler PropertyChanged;

        public double MinimumRpm { get; } = 0.0;

        public double MaximumRpm { get; } = 8000.0;

        public double CurrentRpm
        {
            get => _currentRpm;
            set => SetProperty(ref _currentRpm, value);
        }
        protected bool SetProperty<T>(ref T field, T newValue, [CallerMemberName] string propertyName = null)
        {
            if (!object.Equals(field, newValue))
            {
                field = newValue;
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
                return true;
            }

            return false;
        }
    }
}