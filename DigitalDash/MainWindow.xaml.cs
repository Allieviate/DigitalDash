using System.Windows;
using DigitalDash.ViewModels;

namespace DigitalDash
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
            DataContext = new MainViewModel();
        }
    }
}
