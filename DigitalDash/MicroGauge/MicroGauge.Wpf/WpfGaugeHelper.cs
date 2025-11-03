using System;
using System.Windows.Media;
using SkiaSharp;
using SkiaSharp.Views.WPF;
using Brush = System.Windows.Media.Brush;

namespace MicroGauge.Wpf
{
    /// <summary>
    ///     WpfGaugeHelper - static helper methods for WPF
    /// </summary>
    public static class WpfGaugeHelper
    {
        /// <summary>
        ///     GetGaugeBrush
        /// </summary>
        public static GaugeBrush GetGaugeBrush(Brush sourceBrush)
        {
            if (sourceBrush is SolidColorBrush solidColorBrush)
            {
                return new GaugeBrush(solidColorBrush.Color.ToSKColor());
            }
            else if (sourceBrush is LinearGradientBrush linearGradientBrush)
            {
                return ConvertToGaugeBrush(linearGradientBrush);
            }
            else
            {
                return GaugeBrushes.Transparent;
            }
        }

        /// <summary>
        ///     ConvertToGaugeBrush
        /// </summary>
        private static GaugeBrush ConvertToGaugeBrush(LinearGradientBrush platformBrush)
        {
            var startPoint = new SKPoint(Convert.ToSingle(platformBrush.StartPoint.X),
                Convert.ToSingle(platformBrush.StartPoint.Y));
            var endPoint = new SKPoint(Convert.ToSingle(platformBrush.EndPoint.X),
                Convert.ToSingle(platformBrush.EndPoint.Y));
            GaugeBrush brush = new GaugeBrush(startPoint, endPoint);
            foreach (var stop in platformBrush.GradientStops)
                brush.AddStop(new GaugeBrushStop(stop.Color.ToSKColor(), Convert.ToSingle(stop.Offset)));
            return brush;
        }
    }
}