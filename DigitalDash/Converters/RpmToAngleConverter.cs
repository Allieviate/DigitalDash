using System;
using System.Globalization;
using System.Windows.Data;

namespace DigitalDash.Converters
{
    /// <summary>
    /// Converts RPM values into the rotation angle used to render the gauge needle.
    /// </summary>
    public class RpmToAngleConverter : IValueConverter
    {
        private const double MinRpm = 0.0;
        private const double MaxRpm = 8000.0;

        private const double MinAngle = -135.0;
        private const double MaxAngle = 135.0;

        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (value == null)
            {
                return MinAngle;
            }

            double rpm;
            try
            {
                rpm = System.Convert.ToDouble(value, culture);
            }
            catch (FormatException)
            {
                return MinAngle;
            }
            catch (InvalidCastException)
            {
                return MinAngle;
            }

            rpm = Math.Max(MinRpm, Math.Min(MaxRpm, rpm));

            var normalized = (rpm - MinRpm) / (MaxRpm - MinRpm);
            var angle = MinAngle + normalized * (MaxAngle - MinAngle);

            return angle;
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotSupportedException("RpmToAngleConverter only supports one-way conversion.");
        }
    }
}