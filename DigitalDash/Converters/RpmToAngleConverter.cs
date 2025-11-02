using System;
using System.Globalization;
using System.Windows.Data;

namespace DigitalDash.Converters
{
    /// <summary>
    /// Converts RPM values into the rotation angle used to render the gauge needle.
    /// Supports both single-value and multi-value bindings so callers can optionally
    /// supply custom minimum and maximum ranges.
    /// </summary>
    public class RpmToAngleConverter : IValueConverter, IMultiValueConverter
    {
        private const double MinAngle = -135.0;
        private const double MaxAngle = 135.0;
        private static readonly double[] DefaultRange = { 0.0, 8000.0 };

        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (!TryToDouble(value, culture, out var rpm))
            {
                return MinAngle;
            }

            var range = ResolveRange(parameter);
            return ConvertCore(rpm, range[0], range[1]);
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotSupportedException("RpmToAngleConverter only supports one-way conversion.");
        }

        public object Convert(object[] values, Type targetType, object parameter, CultureInfo culture)
        {
            if (values == null || values.Length == 0)
            {
                return MinAngle;
            }

            if (!TryToDouble(values[0], culture, out var rpm))
            {
                return MinAngle;
            }

            var range = DefaultRange;
            if (values.Length >= 3
                && TryToDouble(values[1], culture, out var minimum)
                && TryToDouble(values[2], culture, out var maximum))
            {
                range = new[] { minimum, maximum };
            }

            return ConvertCore(rpm, range[0], range[1]);
        }

        public object[] ConvertBack(object value, Type[] targetTypes, object parameter, CultureInfo culture)
        {
            throw new NotSupportedException("RpmToAngleConverter only supports one-way conversion.");
        }

        private static object ConvertCore(double rpm, double minimum, double maximum)
        {
            var clampedRpm = Clamp(rpm, minimum, maximum);
            if (Math.Abs(maximum - minimum) < double.Epsilon)
            {
                return MinAngle;
            }

            var normalized = (clampedRpm - minimum) / (maximum - minimum);
            return MinAngle + normalized * (MaxAngle - MinAngle);
        }

        private static double[] ResolveRange(object parameter)
        {
            if (parameter is double[] array && array.Length >= 2)
            {
                return new[] { array[0], array[1] };
            }

            if (parameter is string raw && TryParseRange(raw, out var minimum, out var maximum))
            {
                return new[] { minimum, maximum };
            }

            return DefaultRange;
        }

        private static bool TryParseRange(string value, out double minimum, out double maximum)
        {
            minimum = 0;
            maximum = 0;

            var parts = value.Split(new[] { ',', ';', '|' }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length < 2)
            {
                return false;
            }

            if (!double.TryParse(parts[0], NumberStyles.Float, CultureInfo.InvariantCulture, out minimum))
            {
                return false;
            }

            if (!double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out maximum))
            {
                return false;
            }

            return true;
        }

        private static bool TryToDouble(object value, CultureInfo culture, out double result)
        {
            try
            {
                result = System.Convert.ToDouble(value, culture);
                return !double.IsNaN(result) && !double.IsInfinity(result);
            }
            catch (FormatException)
            {
                result = 0;
                return false;
            }
            catch (InvalidCastException)
            {
                result = 0;
                return false;
            }
        }

        private static double Clamp(double value, double minimum, double maximum)
        {
            if (minimum > maximum)
            {
                (minimum, maximum) = (maximum, minimum);
            }

            if (value < minimum)
            {
                return minimum;
            }

            if (value > maximum)
            {
                return maximum;
            }

            return value;
        }
    }
}