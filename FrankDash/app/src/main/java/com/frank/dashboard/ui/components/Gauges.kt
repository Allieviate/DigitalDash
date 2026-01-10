package com.frank.dashboard.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.*
import androidx.compose.ui.text.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.frank.dashboard.ui.theme.DashColors
import kotlin.math.*

@Composable
fun RpmGauge(
    rpm: Float,
    maxRpm: Float = 8000f,
    vtecRpm: Float = 5500f,
    shiftRpm: Float = 7500f,
    modifier: Modifier = Modifier
) {
    val animatedRpm by animateFloatAsState(
        targetValue = rpm,
        animationSpec = tween(durationMillis = 100, easing = LinearEasing),
        label = "rpm"
    )
    
    val inVtec = animatedRpm >= vtecRpm
    val atShift = animatedRpm >= shiftRpm
    
    // VTEC glow animation
    val vtecGlow by animateFloatAsState(
        targetValue = if (inVtec) 1f else 0f,
        animationSpec = tween(durationMillis = 300),
        label = "vtecGlow"
    )
    
    // Shift light flash
    val infiniteTransition = rememberInfiniteTransition(label = "shift")
    val shiftFlash by infiniteTransition.animateFloat(
        initialValue = 0.5f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(100),
            repeatMode = RepeatMode.Reverse
        ),
        label = "shiftFlash"
    )
    
    Box(
        modifier = modifier.size(320.dp),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val center = Offset(size.width / 2, size.height / 2)
            val radius = size.minDimension / 2 - 20f
            
            // Background circle
            drawCircle(
                color = DashColors.GaugeBackground,
                radius = radius,
                center = center
            )
            
            // Outer ring
            drawCircle(
                color = DashColors.GaugeRing,
                radius = radius,
                center = center,
                style = Stroke(width = 8f)
            )
            
            // RPM scale marks
            val startAngle = 135f
            val sweepAngle = 270f
            
            for (i in 0..8) {
                val rpmValue = i * 1000f
                val angle = startAngle + (rpmValue / maxRpm) * sweepAngle
                val angleRad = Math.toRadians(angle.toDouble())
                
                val innerRadius = radius - 30f
                val outerRadius = radius - 10f
                
                val startX = center.x + innerRadius * cos(angleRad).toFloat()
                val startY = center.y + innerRadius * sin(angleRad).toFloat()
                val endX = center.x + outerRadius * cos(angleRad).toFloat()
                val endY = center.y + outerRadius * sin(angleRad).toFloat()
                
                // Red zone for high RPM
                val color = if (rpmValue >= 7000) DashColors.WarningRed else DashColors.TextWhite
                
                drawLine(
                    color = color,
                    start = Offset(startX, startY),
                    end = Offset(endX, endY),
                    strokeWidth = 4f
                )
            }
            
            // VTEC zone arc (red)
            if (vtecGlow > 0f) {
                val vtecStartAngle = startAngle + (vtecRpm / maxRpm) * sweepAngle
                val vtecSweep = ((maxRpm - vtecRpm) / maxRpm) * sweepAngle
                
                drawArc(
                    color = DashColors.VtecGlow.copy(alpha = vtecGlow * 0.3f),
                    startAngle = vtecStartAngle,
                    sweepAngle = vtecSweep,
                    useCenter = false,
                    topLeft = Offset(center.x - radius + 15f, center.y - radius + 15f),
                    size = Size((radius - 15f) * 2, (radius - 15f) * 2),
                    style = Stroke(width = 20f)
                )
            }
            
            // Needle
            val needleAngle = startAngle + (animatedRpm / maxRpm) * sweepAngle
            val needleRad = Math.toRadians(needleAngle.toDouble())
            val needleLength = radius - 50f
            
            val needleColor = if (atShift) {
                DashColors.NeedleRed.copy(alpha = shiftFlash)
            } else {
                DashColors.NeedleRed
            }
            
            // Needle shadow
            drawLine(
                color = Color.Black.copy(alpha = 0.5f),
                start = Offset(center.x + 3f, center.y + 3f),
                end = Offset(
                    center.x + needleLength * cos(needleRad).toFloat() + 3f,
                    center.y + needleLength * sin(needleRad).toFloat() + 3f
                ),
                strokeWidth = 6f,
                cap = StrokeCap.Round
            )
            
            // Needle
            drawLine(
                color = needleColor,
                start = center,
                end = Offset(
                    center.x + needleLength * cos(needleRad).toFloat(),
                    center.y + needleLength * sin(needleRad).toFloat()
                ),
                strokeWidth = 5f,
                cap = StrokeCap.Round
            )
            
            // Center cap
            drawCircle(
                color = Color(0xFF333333),
                radius = 20f,
                center = center
            )
            drawCircle(
                color = DashColors.NeedleRed,
                radius = 12f,
                center = center
            )
        }
        
        // Digital RPM readout
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.offset(y = 60.dp)
        ) {
            Text(
                text = animatedRpm.toInt().toString(),
                color = if (inVtec) DashColors.VtecGlow else DashColors.TextWhite,
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "x1000",
                color = DashColors.TextDim,
                fontSize = 12.sp
            )
        }
    }
}

@Composable
fun SpeedGauge(
    speed: Float,
    maxSpeed: Float = 170f,
    modifier: Modifier = Modifier
) {
    val animatedSpeed by animateFloatAsState(
        targetValue = speed,
        animationSpec = tween(durationMillis = 100, easing = LinearEasing),
        label = "speed"
    )
    
    Box(
        modifier = modifier.size(320.dp),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val center = Offset(size.width / 2, size.height / 2)
            val radius = size.minDimension / 2 - 20f
            
            // Background circle
            drawCircle(
                color = DashColors.GaugeBackground,
                radius = radius,
                center = center
            )
            
            // Outer ring
            drawCircle(
                color = DashColors.GaugeRing,
                radius = radius,
                center = center,
                style = Stroke(width = 8f)
            )
            
            // Speed scale marks
            val startAngle = 135f
            val sweepAngle = 270f
            
            for (i in 0..17) {
                val speedValue = i * 10f
                val angle = startAngle + (speedValue / maxSpeed) * sweepAngle
                val angleRad = Math.toRadians(angle.toDouble())
                
                val isMajor = i % 2 == 0
                val innerRadius = radius - if (isMajor) 30f else 20f
                val outerRadius = radius - 10f
                
                val startX = center.x + innerRadius * cos(angleRad).toFloat()
                val startY = center.y + innerRadius * sin(angleRad).toFloat()
                val endX = center.x + outerRadius * cos(angleRad).toFloat()
                val endY = center.y + outerRadius * sin(angleRad).toFloat()
                
                drawLine(
                    color = DashColors.TextWhite,
                    start = Offset(startX, startY),
                    end = Offset(endX, endY),
                    strokeWidth = if (isMajor) 4f else 2f
                )
            }
            
            // Needle
            val needleAngle = startAngle + (animatedSpeed / maxSpeed) * sweepAngle
            val needleRad = Math.toRadians(needleAngle.toDouble())
            val needleLength = radius - 50f
            
            // Needle shadow
            drawLine(
                color = Color.Black.copy(alpha = 0.5f),
                start = Offset(center.x + 3f, center.y + 3f),
                end = Offset(
                    center.x + needleLength * cos(needleRad).toFloat() + 3f,
                    center.y + needleLength * sin(needleRad).toFloat() + 3f
                ),
                strokeWidth = 6f,
                cap = StrokeCap.Round
            )
            
            // Needle
            drawLine(
                color = DashColors.NeedleRed,
                start = center,
                end = Offset(
                    center.x + needleLength * cos(needleRad).toFloat(),
                    center.y + needleLength * sin(needleRad).toFloat()
                ),
                strokeWidth = 5f,
                cap = StrokeCap.Round
            )
            
            // Center cap
            drawCircle(
                color = Color(0xFF333333),
                radius = 20f,
                center = center
            )
            drawCircle(
                color = DashColors.NeedleRed,
                radius = 12f,
                center = center
            )
        }
        
        // Digital speed readout
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.offset(y = 60.dp)
        ) {
            Text(
                text = animatedSpeed.toInt().toString(),
                color = DashColors.TextWhite,
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = "MPH",
                color = DashColors.TextDim,
                fontSize = 12.sp
            )
        }
    }
}
