using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Timers;

public class DashViewModel : INotifyPropertyChanged
{
    private double _rpm;
    public double Rpm
    {
        get => _rpm;
        set { _rpm = value; OnPropertyChanged(); }
    }

    private readonly Timer _updateTimer;

    public DashViewModel()
    {
        _updateTimer = new Timer(1000); // Update every 100ms
        _updateTimer.Elapsed += (_, _) => ReadRpmFromSensor();
        _updateTimer.Start();
    }

    private void ReadRpmFromSensor()
    {
        // Simulate reading RPM from a sensor
        Rpm = new Random().Next(800, 7000);
    }

    public event PropertyChangedEventHandler PropertyChanged;
    protected void OnPropertyChanged([CallerMemberName] string name = null) =>
                PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
}