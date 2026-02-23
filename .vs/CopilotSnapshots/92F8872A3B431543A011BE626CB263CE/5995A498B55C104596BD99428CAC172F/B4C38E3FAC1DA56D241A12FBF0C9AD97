using System;
using System.Windows;
using System.Windows.Media;
using Brush = System.Windows.Media.Brush;

namespace MicroGauge.Wpf
{
    /// <summary>
    ///     WpfGaugeLinear - Linear Gauge with tags and bindings for WPF
    /// </summary>
    public class WpfGaugeLinear : WpfGaugeBase
    {
        #region Constructor

        /// <summary>
        ///     Constructor
        /// </summary>
        public WpfGaugeLinear()
        {
            Gauge = new GaugeLinear();
            PaintSurface += OnPaintCanvas;
        }

        #endregion

        #region Gauge Specific Properties

        /// <summary>
        ///     IsVertical
        /// </summary>
        public bool IsVertical
        {
            get => (bool)GetValue(IsVerticalProperty);
            set => SetValue(IsVerticalProperty, value);
        }

        public static readonly DependencyProperty IsVerticalProperty = Create(nameof(IsVertical),
            typeof(bool), false,
            (WpfGaugeBase.GaugePropertyChanged)((gaugeBase, newValue) => { GetLinear(gaugeBase).IsVertical = (bool)newValue; }));

        private static DependencyProperty Create(string v1, Type type, bool v2, GaugePropertyChanged gaugePropertyChanged)
        {
            throw new NotImplementedException();
        }

        /// <summary>
        ///     ValueWidthExtent
        /// </summary>
        public float ValueWidthExtent
        {
            get => (float)GetValue(ValueWidthExtentProperty);
            set => SetValue(ValueWidthExtentProperty, value);
        }

        public static readonly DependencyProperty ValueWidthExtentProperty = Create(nameof(ValueWidthExtent),
            typeof(float), 0.5f,
            (WpfGaugeBase.GaugePropertyChanged)((gaugeBase, newValue) => { GetLinear(gaugeBase).ValueWidthExtent = (float)newValue; }));

        /// <summary>
        ///     TickWidthExtent
        /// </summary>
        public float TickWidthExtent
        {
            get => (float)GetValue(TickWidthExtentProperty);
            set => SetValue(TickWidthExtentProperty, value);
        }

        public static readonly DependencyProperty TickWidthExtentProperty = Create(nameof(TickWidthExtent),
            typeof(float), 0.7f,
            (WpfGaugeBase.GaugePropertyChanged)((gaugeBase, newValue) => { GetLinear(gaugeBase).TickWidthExtent = (float)newValue; }));

        private static DependencyProperty Create(string v1, Type type, float v2, GaugePropertyChanged gaugePropertyChanged)
        {
            throw new NotImplementedException();
        }

        /// <summary>
        ///     MinorTickWidthExtent
        /// </summary>
        public float MinorTickWidthExtent
        {
            get => (float)GetValue(MinorTickWidthExtentProperty);
            set => SetValue(MinorTickWidthExtentProperty, value);
        }

        public static readonly DependencyProperty MinorTickWidthExtentProperty = Create(nameof(MinorTickWidthExtent),
            typeof(float), 0.5f,
            (WpfGaugeBase.GaugePropertyChanged)((gaugeBase, newValue) => { GetLinear(gaugeBase).MinorTickWidthExtent = (float)newValue; }));

        /// <summary>
        ///     ValueBarBrush
        /// </summary>
        public Brush ValueBarBrush
        {
            get => (Brush)GetValue(ValueBarBrushProperty);
            set => SetValue(ValueBarBrushProperty, value);
        }

        private static readonly Type type = typeof(Brush);
        public static readonly DependencyProperty ValueBarBrushProperty = Create(nameof(ValueBarBrush),
            type, new SolidColorBrush(Colors.Black),
            (WpfGaugeBase.GaugePropertyChanged)((gaugeBase, newValue) =>
            {
                GetLinear(gaugeBase).ValueBarBrush = WpfGaugeHelper.GetGaugeBrush((Brush)newValue);
            }));

        private static DependencyProperty Create(string v, Type type, SolidColorBrush solidColorBrush, GaugePropertyChanged gaugePropertyChanged)
        {
            throw new NotImplementedException();
        }
        #endregion

        #region Helper

        /// <summary>
        ///     GaugeLinear - Get Linear Gauge from gauge base
        /// </summary>
        private static GaugeLinear GetLinear(WpfGaugeBase gaugeBase)
        {
            return (GaugeLinear)gaugeBase.Gauge;
        }

        #endregion
    }
}