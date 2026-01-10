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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.frank.dashboard.ui.theme.DashColors
import kotlinx.coroutines.delay
import kotlin.math.cos
import kotlin.math.sin

@Composable
fun BootSequence(
    onComplete: () -> Unit
) {
    var phase by remember { mutableStateOf(0) }
    // 0 = Logo fade in
    // 1 = "FRANK" text
    // 2 = "DIGITAL INSTRUMENT CLUSTER"
    // 3 = Gauge sweep
    // 4 = Complete
    
    val infiniteTransition = rememberInfiniteTransition(label = "boot")
    
    // Logo pulse
    val logoPulse by infiniteTransition.animateFloat(
        initialValue = 0.7f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000),
            repeatMode = RepeatMode.Reverse
        ),
        label = "logoPulse"
    )
    
    // Phase timing
    LaunchedEffect(Unit) {
        delay(2000) // Logo phase
        phase = 1
        delay(1500) // FRANK text
        phase = 2
        delay(1500) // Subtitle
        phase = 3
        delay(2500) // Gauge sweep
        phase = 4
        delay(500)
        onComplete()
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
        contentAlignment = Alignment.Center
    ) {
        when (phase) {
            0 -> {
                // Honda-style logo (H shape)
                Canvas(
                    modifier = Modifier.size(150.dp)
                ) {
                    val color = DashColors.NeedleRed.copy(alpha = logoPulse)
                    val strokeWidth = 12f
                    val padding = 20f
                    
                    // Draw H shape
                    // Left vertical
                    drawLine(
                        color = color,
                        start = Offset(padding, padding),
                        end = Offset(padding, size.height - padding),
                        strokeWidth = strokeWidth,
                        cap = StrokeCap.Round
                    )
                    // Right vertical
                    drawLine(
                        color = color,
                        start = Offset(size.width - padding, padding),
                        end = Offset(size.width - padding, size.height - padding),
                        strokeWidth = strokeWidth,
                        cap = StrokeCap.Round
                    )
                    // Horizontal
                    drawLine(
                        color = color,
                        start = Offset(padding, size.height / 2),
                        end = Offset(size.width - padding, size.height / 2),
                        strokeWidth = strokeWidth,
                        cap = StrokeCap.Round
                    )
                    
                    // Outer border
                    drawRoundRect(
                        color = color,
                        style = Stroke(width = 4f),
                        cornerRadius = androidx.compose.ui.geometry.CornerRadius(16f)
                    )
                }
            }
            
            1 -> {
                // FRANK text
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "FRANK",
                        color = DashColors.NeedleRed,
                        fontSize = 72.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 16.sp
                    )
                }
            }
            
            2 -> {
                // Full title
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "FRANK",
                        color = DashColors.NeedleRed,
                        fontSize = 72.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 16.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "DIGITAL INSTRUMENT CLUSTER",
                        color = DashColors.TextDim,
                        fontSize = 16.sp,
                        letterSpacing = 4.sp
                    )
                }
            }
            
            3 -> {
                // Gauge sweep animation
                GaugeSweepAnimation()
            }
        }
        
        // Progress bar at bottom
        if (phase < 4) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(0.6f)
                    .height(4.dp)
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 60.dp)
                    .background(DashColors.GaugeRing)
            ) {
                val progress = (phase + 1) / 4f
                Box(
                    modifier = Modifier
                        .fillMaxWidth(progress)
                        .fillMaxHeight()
                        .background(DashColors.NeedleRed)
                )
            }
            
            // Phase text
            Text(
                text = when (phase) {
                    0 -> "INITIALIZING..."
                    1 -> "LOADING GAUGES..."
                    2 -> "ECU LINK ESTABLISHED"
                    3 -> "GAUGE SWEEP TEST"
                    else -> ""
                },
                color = DashColors.TextDim,
                fontSize = 12.sp,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 32.dp)
            )
        }
    }
}

@Composable
private fun GaugeSweepAnimation() {
    var sweepProgress by remember { mutableStateOf(0f) }
    
    LaunchedEffect(Unit) {
        // Animate from 0 to 1 and back
        val steps = 60
        val delayPerStep = 2000L / steps
        
        // Sweep up
        for (i in 0..steps) {
            sweepProgress = i.toFloat() / steps
            delay(delayPerStep / 2)
        }
        // Sweep down
        for (i in steps downTo 0) {
            sweepProgress = i.toFloat() / steps
            delay(delayPerStep / 2)
        }
    }
    
    Row(
        horizontalArrangement = Arrangement.spacedBy(100.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // RPM gauge sweep
        SweepGauge(
            progress = sweepProgress,
            label = "RPM",
            maxValue = "8000"
        )
        
        // Speed gauge sweep
        SweepGauge(
            progress = sweepProgress,
            label = "MPH",
            maxValue = "170"
        )
    }
}

@Composable
private fun SweepGauge(
    progress: Float,
    label: String,
    maxValue: String
) {
    Box(
        modifier = Modifier.size(200.dp),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val center = Offset(size.width / 2, size.height / 2)
            val radius = size.minDimension / 2 - 20f
            
            // Background arc
            drawArc(
                color = DashColors.GaugeRing,
                startAngle = 135f,
                sweepAngle = 270f,
                useCenter = false,
                style = Stroke(width = 8f)
            )
            
            // Progress arc
            drawArc(
                color = DashColors.NeedleRed,
                startAngle = 135f,
                sweepAngle = 270f * progress,
                useCenter = false,
                style = Stroke(width = 8f, cap = StrokeCap.Round)
            )
            
            // Needle
            val needleAngle = 135f + (270f * progress)
            val needleRad = Math.toRadians(needleAngle.toDouble())
            val needleLength = radius - 30f
            
            drawLine(
                color = DashColors.NeedleRed,
                start = center,
                end = Offset(
                    center.x + needleLength * cos(needleRad).toFloat(),
                    center.y + needleLength * sin(needleRad).toFloat()
                ),
                strokeWidth = 4f,
                cap = StrokeCap.Round
            )
            
            // Center dot
            drawCircle(
                color = DashColors.NeedleRed,
                radius = 8f,
                center = center
            )
        }
        
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.offset(y = 30.dp)
        ) {
            Text(
                text = (progress * maxValue.toFloat()).toInt().toString(),
                color = DashColors.TextWhite,
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = label,
                color = DashColors.TextDim,
                fontSize = 12.sp
            )
        }
    }
}
