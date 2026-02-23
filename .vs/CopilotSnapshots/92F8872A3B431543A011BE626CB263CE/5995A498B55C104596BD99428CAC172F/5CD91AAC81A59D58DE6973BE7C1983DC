using SkiaSharp;
using System;
using System.Collections.Generic;

// ReSharper disable all

namespace MicroGauge
{
    /// <summary>
    ///     GaugeBrushes - Standard brushes
    /// </summary>
    public static class GaugeBrushes
    {
        // Empty brush (always a fresh instance to avoid shared mutable state)
        public static GaugeBrush Empty => new GaugeBrush(new SKColor(0x00000000));

        // Individual named brushes exposed as properties that create new instances.
        // This avoids shared mutable GaugeBrush instances while keeping the API simple.
        public static GaugeBrush AliceBlue => new GaugeBrush(s_colors["aliceblue"]);
        public static GaugeBrush AntiqueWhite => new GaugeBrush(s_colors["antiquewhite"]);
        public static GaugeBrush Aqua => new GaugeBrush(s_colors["aqua"]);
        public static GaugeBrush Aquamarine => new GaugeBrush(s_colors["aquamarine"]);
        public static GaugeBrush Azure => new GaugeBrush(s_colors["azure"]);
        public static GaugeBrush Beige => new GaugeBrush(s_colors["beige"]);
        public static GaugeBrush Bisque => new GaugeBrush(s_colors["bisque"]);
        public static GaugeBrush Black => new GaugeBrush(s_colors["black"]);
        public static GaugeBrush BlanchedAlmond => new GaugeBrush(s_colors["blanchedalmond"]);
        public static GaugeBrush Blue => new GaugeBrush(s_colors["blue"]);
        public static GaugeBrush BlueViolet => new GaugeBrush(s_colors["blueviolet"]);
        public static GaugeBrush Brown => new GaugeBrush(s_colors["brown"]);
        public static GaugeBrush BurlyWood => new GaugeBrush(s_colors["burlywood"]);
        public static GaugeBrush CadetBlue => new GaugeBrush(s_colors["cadetblue"]);
        public static GaugeBrush Chartreuse => new GaugeBrush(s_colors["chartreuse"]);
        public static GaugeBrush Chocolate => new GaugeBrush(s_colors["chocolate"]);
        public static GaugeBrush Coral => new GaugeBrush(s_colors["coral"]);
        public static GaugeBrush CornflowerBlue => new GaugeBrush(s_colors["cornflowerblue"]);
        public static GaugeBrush Cornsilk => new GaugeBrush(s_colors["cornsilk"]);
        public static GaugeBrush Crimson => new GaugeBrush(s_colors["crimson"]);
        public static GaugeBrush Cyan => new GaugeBrush(s_colors["cyan"]);
        public static GaugeBrush DarkBlue => new GaugeBrush(s_colors["darkblue"]);
        public static GaugeBrush DarkCyan => new GaugeBrush(s_colors["darkcyan"]);
        public static GaugeBrush DarkGoldenrod => new GaugeBrush(s_colors["darkgoldenrod"]);
        public static GaugeBrush DarkGray => new GaugeBrush(s_colors["darkgray"]);
        public static GaugeBrush DarkGreen => new GaugeBrush(s_colors["darkgreen"]);
        public static GaugeBrush DarkKhaki => new GaugeBrush(s_colors["darkkhaki"]);
        public static GaugeBrush DarkMagenta => new GaugeBrush(s_colors["darkmagenta"]);
        public static GaugeBrush DarkOliveGreen => new GaugeBrush(s_colors["darkolivegreen"]);
        public static GaugeBrush DarkOrange => new GaugeBrush(s_colors["darkorange"]);
        public static GaugeBrush DarkOrchid => new GaugeBrush(s_colors["darkorchid"]);
        public static GaugeBrush DarkRed => new GaugeBrush(s_colors["darkred"]);
        public static GaugeBrush DarkSalmon => new GaugeBrush(s_colors["darksalmon"]);
        public static GaugeBrush DarkSeaGreen => new GaugeBrush(s_colors["darkseagreen"]);
        public static GaugeBrush DarkSlateBlue => new GaugeBrush(s_colors["darkslateblue"]);
        public static GaugeBrush DarkSlateGray => new GaugeBrush(s_colors["darkslategray"]);
        public static GaugeBrush DarkTurquoise => new GaugeBrush(s_colors["darkturquoise"]);
        public static GaugeBrush DarkViolet => new GaugeBrush(s_colors["darkviolet"]);
        public static GaugeBrush DeepPink => new GaugeBrush(s_colors["deeppink"]);
        public static GaugeBrush DeepSkyBlue => new GaugeBrush(s_colors["deepskyblue"]);
        public static GaugeBrush DimGray => new GaugeBrush(s_colors["dimgray"]);
        public static GaugeBrush DodgerBlue => new GaugeBrush(s_colors["dodgerblue"]);
        public static GaugeBrush Firebrick => new GaugeBrush(s_colors["firebrick"]);
        public static GaugeBrush FloralWhite => new GaugeBrush(s_colors["floralwhite"]);
        public static GaugeBrush ForestGreen => new GaugeBrush(s_colors["forestgreen"]);
        public static GaugeBrush Fuchsia => new GaugeBrush(s_colors["fuchsia"]);
        public static GaugeBrush Gainsboro => new GaugeBrush(s_colors["gainsboro"]);
        public static GaugeBrush GhostWhite => new GaugeBrush(s_colors["ghostwhite"]);
        public static GaugeBrush Gold => new GaugeBrush(s_colors["gold"]);
        public static GaugeBrush Goldenrod => new GaugeBrush(s_colors["goldenrod"]);
        public static GaugeBrush Gray => new GaugeBrush(s_colors["gray"]);
        public static GaugeBrush Green => new GaugeBrush(s_colors["green"]);
        public static GaugeBrush GreenYellow => new GaugeBrush(s_colors["greenyellow"]);
        public static GaugeBrush Honeydew => new GaugeBrush(s_colors["honeydew"]);
        public static GaugeBrush HotPink => new GaugeBrush(s_colors["hotpink"]);
        public static GaugeBrush IndianRed => new GaugeBrush(s_colors["indianred"]);
        public static GaugeBrush Indigo => new GaugeBrush(s_colors["indigo"]);
        public static GaugeBrush Ivory => new GaugeBrush(s_colors["ivory"]);
        public static GaugeBrush Khaki => new GaugeBrush(s_colors["khaki"]);
        public static GaugeBrush Lavender => new GaugeBrush(s_colors["lavender"]);
        public static GaugeBrush LavenderBlush => new GaugeBrush(s_colors["lavenderblush"]);
        public static GaugeBrush LawnGreen => new GaugeBrush(s_colors["lawngreen"]);
        public static GaugeBrush LemonChiffon => new GaugeBrush(s_colors["lemonchiffon"]);
        public static GaugeBrush LightBlue => new GaugeBrush(s_colors["lightblue"]);
        public static GaugeBrush LightCoral => new GaugeBrush(s_colors["lightcoral"]);
        public static GaugeBrush LightCyan => new GaugeBrush(s_colors["lightcyan"]);
        public static GaugeBrush LightGoldenrodYellow => new GaugeBrush(s_colors["lightgoldenrodyellow"]);
        public static GaugeBrush LightGray => new GaugeBrush(s_colors["lightgray"]);
        public static GaugeBrush LightGreen => new GaugeBrush(s_colors["lightgreen"]);
        public static GaugeBrush LightPink => new GaugeBrush(s_colors["lightpink"]);
        public static GaugeBrush LightSalmon => new GaugeBrush(s_colors["lightsalmon"]);
        public static GaugeBrush LightSeaGreen => new GaugeBrush(s_colors["lightseagreen"]);
        public static GaugeBrush LightSkyBlue => new GaugeBrush(s_colors["lightskyblue"]);
        public static GaugeBrush LightSlateGray => new GaugeBrush(s_colors["lightslategray"]);
        public static GaugeBrush LightSteelBlue => new GaugeBrush(s_colors["lightsteelblue"]);
        public static GaugeBrush LightYellow => new GaugeBrush(s_colors["lightyellow"]);
        public static GaugeBrush Lime => new GaugeBrush(s_colors["lime"]);
        public static GaugeBrush LimeGreen => new GaugeBrush(s_colors["limegreen"]);
        public static GaugeBrush Linen => new GaugeBrush(s_colors["linen"]);
        public static GaugeBrush Magenta => new GaugeBrush(s_colors["magenta"]);
        public static GaugeBrush Maroon => new GaugeBrush(s_colors["maroon"]);
        public static GaugeBrush MediumAquamarine => new GaugeBrush(s_colors["mediumaquamarine"]);
        public static GaugeBrush MediumBlue => new GaugeBrush(s_colors["mediumblue"]);
        public static GaugeBrush MediumOrchid => new GaugeBrush(s_colors["mediumorchid"]);
        public static GaugeBrush MediumPurple => new GaugeBrush(s_colors["mediumpurple"]);
        public static GaugeBrush MediumSeaGreen => new GaugeBrush(s_colors["mediumseagreen"]);
        public static GaugeBrush MediumSlateBlue => new GaugeBrush(s_colors["mediumslateblue"]);
        public static GaugeBrush MediumSpringGreen => new GaugeBrush(s_colors["mediumspringgreen"]);
        public static GaugeBrush MediumTurquoise => new GaugeBrush(s_colors["mediumturquoise"]);
        public static GaugeBrush MediumVioletRed => new GaugeBrush(s_colors["mediumvioletred"]);
        public static GaugeBrush MidnightBlue => new GaugeBrush(s_colors["midnightblue"]);
        public static GaugeBrush MintCream => new GaugeBrush(s_colors["mintcream"]);
        public static GaugeBrush MistyRose => new GaugeBrush(s_colors["mistyrose"]);
        public static GaugeBrush Moccasin => new GaugeBrush(s_colors["moccasin"]);
        public static GaugeBrush NavajoWhite => new GaugeBrush(s_colors["navajowhite"]);
        public static GaugeBrush Navy => new GaugeBrush(s_colors["navy"]);
        public static GaugeBrush OldLace => new GaugeBrush(s_colors["oldlace"]);
        public static GaugeBrush Olive => new GaugeBrush(s_colors["olive"]);
        public static GaugeBrush OliveDrab => new GaugeBrush(s_colors["olivedrab"]);
        public static GaugeBrush Orange => new GaugeBrush(s_colors["orange"]);
        public static GaugeBrush OrangeRed => new GaugeBrush(s_colors["orangered"]);
        public static GaugeBrush Orchid => new GaugeBrush(s_colors["orchid"]);
        public static GaugeBrush PaleGoldenrod => new GaugeBrush(s_colors["palegoldenrod"]);
        public static GaugeBrush PaleGreen => new GaugeBrush(s_colors["palegreen"]);
        public static GaugeBrush PaleTurquoise => new GaugeBrush(s_colors["paleturquoise"]);
        public static GaugeBrush PaleVioletRed => new GaugeBrush(s_colors["palevioletred"]);
        public static GaugeBrush PapayaWhip => new GaugeBrush(s_colors["papayawhip"]);
        public static GaugeBrush PeachPuff => new GaugeBrush(s_colors["peachpuff"]);
        public static GaugeBrush Peru => new GaugeBrush(s_colors["peru"]);
        public static GaugeBrush Pink => new GaugeBrush(s_colors["pink"]);
        public static GaugeBrush Plum => new GaugeBrush(s_colors["plum"]);
        public static GaugeBrush PowderBlue => new GaugeBrush(s_colors["powderblue"]);
        public static GaugeBrush Purple => new GaugeBrush(s_colors["purple"]);
        public static GaugeBrush Red => new GaugeBrush(s_colors["red"]);
        public static GaugeBrush RosyBrown => new GaugeBrush(s_colors["rosybrown"]);
        public static GaugeBrush RoyalBlue => new GaugeBrush(s_colors["royalblue"]);
        public static GaugeBrush SaddleBrown => new GaugeBrush(s_colors["saddlebrown"]);
        public static GaugeBrush Salmon => new GaugeBrush(s_colors["salmon"]);
        public static GaugeBrush SandyBrown => new GaugeBrush(s_colors["sandybrown"]);
        public static GaugeBrush SeaGreen => new GaugeBrush(s_colors["seagreen"]);
        public static GaugeBrush SeaShell => new GaugeBrush(s_colors["seashell"]);
        public static GaugeBrush Sienna => new GaugeBrush(s_colors["sienna"]);
        public static GaugeBrush Silver => new GaugeBrush(s_colors["silver"]);
        public static GaugeBrush SkyBlue => new GaugeBrush(s_colors["skyblue"]);
        public static GaugeBrush SlateBlue => new GaugeBrush(s_colors["slateblue"]);
        public static GaugeBrush SlateGray => new GaugeBrush(s_colors["slategray"]);
        public static GaugeBrush Snow => new GaugeBrush(s_colors["snow"]);
        public static GaugeBrush SpringGreen => new GaugeBrush(s_colors["springgreen"]);
        public static GaugeBrush SteelBlue => new GaugeBrush(s_colors["steelblue"]);
        public static GaugeBrush Tan => new GaugeBrush(s_colors["tan"]);
        public static GaugeBrush Teal => new GaugeBrush(s_colors["teal"]);
        public static GaugeBrush Thistle => new GaugeBrush(s_colors["thistle"]);
        public static GaugeBrush Tomato => new GaugeBrush(s_colors["tomato"]);
        public static GaugeBrush Turquoise => new GaugeBrush(s_colors["turquoise"]);
        public static GaugeBrush Violet => new GaugeBrush(s_colors["violet"]);
        public static GaugeBrush Wheat => new GaugeBrush(s_colors["wheat"]);
        public static GaugeBrush White => new GaugeBrush(s_colors["white"]);
        public static GaugeBrush WhiteSmoke => new GaugeBrush(s_colors["whitesmoke"]);
        public static GaugeBrush Yellow => new GaugeBrush(s_colors["yellow"]);
        public static GaugeBrush YellowGreen => new GaugeBrush(s_colors["yellowgreen"]);
        public static GaugeBrush Transparent => new GaugeBrush(new SKColor(0x00FFFFFF));

        // Centralized color table (keys are normalized to lowercase, no spaces)
        private static readonly Dictionary<string, SKColor> s_colors = new Dictionary<string, SKColor>(StringComparer.OrdinalIgnoreCase)
        {
            ["aliceblue"] = new SKColor(0xFFF0F8FF),
            ["antiquewhite"] = new SKColor(0xFFFAEBD7),
            ["aqua"] = new SKColor(0xFF00FFFF),
            ["aquamarine"] = new SKColor(0xFF7FFFD4),
            ["azure"] = new SKColor(0xFFF0FFFF),
            ["beige"] = new SKColor(0xFFF5F5DC),
            ["bisque"] = new SKColor(0xFFFFE4C4),
            ["black"] = new SKColor(0xFF000000),
            ["blanchedalmond"] = new SKColor(0xFFFFEBCD),
            ["blue"] = new SKColor(0xFF0000FF),
            ["blueviolet"] = new SKColor(0xFF8A2BE2),
            ["brown"] = new SKColor(0xFFA52A2A),
            ["burlywood"] = new SKColor(0xFFDEB887),
            ["cadetblue"] = new SKColor(0xFF5F9EA0),
            ["chartreuse"] = new SKColor(0xFF7FFF00),
            ["chocolate"] = new SKColor(0xFFD2691E),
            ["coral"] = new SKColor(0xFFFF7F50),
            ["cornflowerblue"] = new SKColor(0xFF6495ED),
            ["cornsilk"] = new SKColor(0xFFFFF8DC),
            ["crimson"] = new SKColor(0xFFDC143C),
            ["cyan"] = new SKColor(0xFF00FFFF),
            ["darkblue"] = new SKColor(0xFF00008B),
            ["darkcyan"] = new SKColor(0xFF008B8B),
            ["darkgoldenrod"] = new SKColor(0xFFB8860B),
            ["darkgray"] = new SKColor(0xFFA9A9A9),
            ["darkgreen"] = new SKColor(0xFF006400),
            ["darkkhaki"] = new SKColor(0xFFBDB76B),
            ["darkmagenta"] = new SKColor(0xFF8B008B),
            ["darkolivegreen"] = new SKColor(0xFF556B2F),
            ["darkorange"] = new SKColor(0xFFFF8C00),
            ["darkorchid"] = new SKColor(0xFF9932CC),
            ["darkred"] = new SKColor(0xFF8B0000),
            ["darksalmon"] = new SKColor(0xFFE9967A),
            ["darkseagreen"] = new SKColor(0xFF8FBC8B),
            ["darkslateblue"] = new SKColor(0xFF483D8B),
            ["darkslategray"] = new SKColor(0xFF2F4F4F),
            ["darkturquoise"] = new SKColor(0xFF00CED1),
            ["darkviolet"] = new SKColor(0xFF9400D3),
            ["deeppink"] = new SKColor(0xFFFF1493),
            ["deepskyblue"] = new SKColor(0xFF00BFFF),
            ["dimgray"] = new SKColor(0xFF696969),
            ["dodgerblue"] = new SKColor(0xFF1E90FF),
            ["firebrick"] = new SKColor(0xFFB22222),
            ["floralwhite"] = new SKColor(0xFFFFFAF0),
            ["forestgreen"] = new SKColor(0xFF228B22),
            ["fuchsia"] = new SKColor(0xFFFF00FF),
            ["gainsboro"] = new SKColor(0xFFDCDCDC),
            ["ghostwhite"] = new SKColor(0xFFF8F8FF),
            ["gold"] = new SKColor(0xFFFFD700),
            ["goldenrod"] = new SKColor(0xFFDAA520),
            ["gray"] = new SKColor(0xFF808080),
            ["green"] = new SKColor(0xFF008000),
            ["greenyellow"] = new SKColor(0xFFADFF2F),
            ["honeydew"] = new SKColor(0xFFF0FFF0),
            ["hotpink"] = new SKColor(0xFFFF69B4),
            ["indianred"] = new SKColor(0xFFCD5C5C),
            ["indigo"] = new SKColor(0xFF4B0082),
            ["ivory"] = new SKColor(0xFFFFFFF0),
            ["khaki"] = new SKColor(0xFFF0E68C),
            ["lavender"] = new SKColor(0xFFE6E6FA),
            ["lavenderblush"] = new SKColor(0xFFFFF0F5),
            ["lawngreen"] = new SKColor(0xFF7CFC00),
            ["lemonchiffon"] = new SKColor(0xFFFFFACD),
            ["lightblue"] = new SKColor(0xFFADD8E6),
            ["lightcoral"] = new SKColor(0xFFF08080),
            ["lightcyan"] = new SKColor(0xFFE0FFFF),
            ["lightgoldenrodyellow"] = new SKColor(0xFFFAFAD2),
            ["lightgray"] = new SKColor(0xFFD3D3D3),
            ["lightgreen"] = new SKColor(0xFF90EE90),
            ["lightpink"] = new SKColor(0xFFFFB6C1),
            ["lightsalmon"] = new SKColor(0xFFFFA07A),
            ["lightseagreen"] = new SKColor(0xFF20B2AA),
            ["lightskyblue"] = new SKColor(0xFF87CEFA),
            ["lightslategray"] = new SKColor(0xFF778899),
            ["lightsteelblue"] = new SKColor(0xFFB0C4DE),
            ["lightyellow"] = new SKColor(0xFFFFFFE0),
            ["lime"] = new SKColor(0xFF00FF00),
            ["limegreen"] = new SKColor(0xFF32CD32),
            ["linen"] = new SKColor(0xFFFAF0E6),
            ["magenta"] = new SKColor(0xFFFF00FF),
            ["maroon"] = new SKColor(0xFF800000),
            ["mediumaquamarine"] = new SKColor(0xFF66CDAA),
            ["mediumblue"] = new SKColor(0xFF0000CD),
            ["mediumorchid"] = new SKColor(0xFFBA55D3),
            ["mediumpurple"] = new SKColor(0xFF9370DB),
            ["mediumseagreen"] = new SKColor(0xFF3CB371),
            ["mediumslateblue"] = new SKColor(0xFF7B68EE),
            ["mediumspringgreen"] = new SKColor(0xFF00FA9A),
            ["mediumturquoise"] = new SKColor(0xFF48D1CC),
            ["mediumvioletred"] = new SKColor(0xFFC71585),
            ["midnightblue"] = new SKColor(0xFF191970),
            ["mintcream"] = new SKColor(0xFFF5FFFA),
            ["mistyrose"] = new SKColor(0xFFFFE4E1),
            ["moccasin"] = new SKColor(0xFFFFE4B5),
            ["navajowhite"] = new SKColor(0xFFFFDEAD),
            ["navy"] = new SKColor(0xFF000080),
            ["oldlace"] = new SKColor(0xFFFDF5E6),
            ["olive"] = new SKColor(0xFF808000),
            ["olivedrab"] = new SKColor(0xFF6B8E23),
            ["orange"] = new SKColor(0xFFFFA500),
            ["orangered"] = new SKColor(0xFFFF4500),
            ["orchid"] = new SKColor(0xFFDA70D6),
            ["palegoldenrod"] = new SKColor(0xFFEEE8AA),
            ["palegreen"] = new SKColor(0xFF98FB98),
            ["paleturquoise"] = new SKColor(0xFFAFEEEE),
            ["palevioletred"] = new SKColor(0xFFDB7093),
            ["papayawhip"] = new SKColor(0xFFFFEFD5),
            ["peachpuff"] = new SKColor(0xFFFFDAB9),
            ["peru"] = new SKColor(0xFFCD853F),
            ["pink"] = new SKColor(0xFFFFC0CB),
            ["plum"] = new SKColor(0xFFDDA0DD),
            ["powderblue"] = new SKColor(0xFFB0E0E6),
            ["purple"] = new SKColor(0xFF800080),
            ["red"] = new SKColor(0xFFFF0000),
            ["rosybrown"] = new SKColor(0xFFBC8F8F),
            ["royalblue"] = new SKColor(0xFF4169E1),
            ["saddlebrown"] = new SKColor(0xFF8B4513),
            ["salmon"] = new SKColor(0xFFFA8072),
            ["sandybrown"] = new SKColor(0xFFF4A460),
            ["seagreen"] = new SKColor(0xFF2E8B57),
            ["seashell"] = new SKColor(0xFFFFF5EE),
            ["sienna"] = new SKColor(0xFFA0522D),
            ["silver"] = new SKColor(0xFFC0C0C0),
            ["skyblue"] = new SKColor(0xFF87CEEB),
            ["slateblue"] = new SKColor(0xFF6A5ACD),
            ["slategray"] = new SKColor(0xFF708090),
            ["snow"] = new SKColor(0xFFFFFAFA),
            ["springgreen"] = new SKColor(0xFF00FF7F),
            ["steelblue"] = new SKColor(0xFF4682B4),
            ["tan"] = new SKColor(0xFFD2B48C),
            ["teal"] = new SKColor(0xFF008080),
            ["thistle"] = new SKColor(0xFFD8BFD8),
            ["tomato"] = new SKColor(0xFFFF6347),
            ["turquoise"] = new SKColor(0xFF40E0D0),
            ["violet"] = new SKColor(0xFFEE82EE),
            ["wheat"] = new SKColor(0xFFF5DEB3),
            ["white"] = new SKColor(0xFFFFFFFF),
            ["whitesmoke"] = new SKColor(0xFFF5F5F5),
            ["yellow"] = new SKColor(0xFFFFFF00),
            ["yellowgreen"] = new SKColor(0xFF9ACD32),
        };

        // Try to get a named brush (normalizes input: removes spaces, case-insensitive)
        public static bool TryGet(string name, out GaugeBrush brush)
        {
            brush = null;
            if (string.IsNullOrWhiteSpace(name))
                return false;

            var key = NormalizeKey(name);
            if (s_colors.TryGetValue(key, out var color))
            {
                brush = new GaugeBrush(color);
                return true;
            }

            return false;
        }

        // Get a named brush or throw if not found
        public static GaugeBrush Get(string name)
        {
            if (TryGet(name, out var brush))
                return brush;

            throw new KeyNotFoundException($"GaugeBrush with name '{name}' was not found.");
        }

        private static string NormalizeKey(string name) => name.Replace(" ", string.Empty).Replace("_", string.Empty).ToLowerInvariant();
    }
}