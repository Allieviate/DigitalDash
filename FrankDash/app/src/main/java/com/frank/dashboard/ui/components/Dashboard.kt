package com.frank.dashboard.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.frank.dashboard.data.VehicleDataSimulator
import com.frank.dashboard.ui.theme.DashColors
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun Dashboard(
    vehicleData: VehicleDataSimulator,
    modifier: Modifier = Modifier
) {
    val signals by vehicleData.signals
    
    // Breathing background animation
    val infiniteTransition = rememberInfiniteTransition(label = "breathing")
    val breathingPhase by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(4000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "breathingPhase"
    )
    
    // Type R red mode based on speed
    val speedFactor = ((signals.speedMph - 86f) / 34f).coerceIn(0f, 1f)
    val isTypeRMode = signals.speedMph > 86f
    
    val backgroundColor = if (isTypeRMode) {
        Color(
            red = (0.1f + speedFactor * 0.4f),
            green = 0.02f,
            blue = 0.02f
        )
    } else {
        // Breathing purple/dark background
        Color(
            red = 0.05f + breathingPhase * 0.03f,
            green = 0.02f,
            blue = 0.08f + breathingPhase * 0.04f
        )
    }
    
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(backgroundColor)
    ) {
        // Top section: Shift lights + Speed/Gear + Turn signals
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp)
        ) {
            // Shift lights
            ShiftLightsBar(rpm = signals.rpm)
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Digital speed and gear
            DigitalSpeedDisplay(
                speed = signals.speedMph,
                gear = signals.gear
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Turn signals
            TurnSignals(
                leftOn = signals.turnLeft,
                rightOn = signals.turnRight
            )
        }
        
        // Middle section: Gauges
        Row(
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom,
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.Center)
                .padding(horizontal = 32.dp)
                .padding(top = 80.dp)
        ) {
            // RPM Gauge (left)
            RpmGauge(
                rpm = signals.rpm,
                modifier = Modifier.size(320.dp)
            )
            
            // Center area (for Android Auto later)
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(300.dp),
                contentAlignment = Alignment.Center
            ) {
                // Placeholder for Android Auto
            }
            
            // Speed Gauge (right)
            SpeedGauge(
                speed = signals.speedMph,
                modifier = Modifier.size(320.dp)
            )
        }
        
        // Bottom section: Warning lights
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .padding(bottom = 24.dp)
        ) {
            WarningPanel(
                checkEngine = signals.checkEngine,
                oilPressure = signals.oilPressureWarning,
                highCoolant = signals.highCoolant,
                lowFuel = signals.lowFuel,
                maintenance = signals.maintenance,
                absWarning = signals.absWarning,
                brakeWarning = signals.brakeWarning,
                modifier = Modifier.align(Alignment.Center)
            )
        }
        
        // Connection status
        Box(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(16.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .background(
                            color = DashColors.TurnSignalGreen,
                            shape = androidx.compose.foundation.shape.CircleShape
                        )
                )
                Text(
                    text = "LIVE",
                    color = DashColors.TurnSignalGreen,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
    
    // Cleanup on dispose
    DisposableEffect(Unit) {
        onDispose {
            vehicleData.cleanup()
        }
    }
}
