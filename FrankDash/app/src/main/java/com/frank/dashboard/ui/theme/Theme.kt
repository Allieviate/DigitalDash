package com.frank.dashboard.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFFFF4444),
    secondary = Color(0xFFFF6B35),
    tertiary = Color(0xFF28D86A),
    background = Color.Black,
    surface = Color(0xFF1A1A1A),
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.Black,
    onBackground = Color.White,
    onSurface = Color.White,
)

@Composable
fun FrankDashTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}

// Dashboard colors
object DashColors {
    val GaugeBackground = Color(0xFF0A0A0A)
    val GaugeRing = Color(0xFF2A2A2A)
    val NeedleRed = Color(0xFFFF4444)
    val VtecGlow = Color(0xFFFF0000)
    val ShiftLightOrange = Color(0xFFFF6B35)
    val ShiftLightRed = Color(0xFFE83A14)
    val TurnSignalGreen = Color(0xFF28D86A)
    val WarningYellow = Color(0xFFFFBB00)
    val WarningRed = Color(0xFFFF4444)
    val TextWhite = Color(0xFFFFFFFF)
    val TextDim = Color(0xFF666666)
    val TypeRRed = Color(0xFFCC0000)
    val BreathingBase = Color(0xFF1A0A1A)
}
