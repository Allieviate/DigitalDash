package com.frank.dashboard.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.frank.dashboard.ui.theme.DashColors

@Composable
fun ShiftLightsBar(
    rpm: Float,
    modifier: Modifier = Modifier
) {
    val lightCount = 7
    val startRpm = 5000f
    val endRpm = 7500f
    val rpmPerLight = (endRpm - startRpm) / lightCount
    
    // Flash animation for redline
    val infiniteTransition = rememberInfiniteTransition(label = "flash")
    val flashAlpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(80),
            repeatMode = RepeatMode.Reverse
        ),
        label = "flashAlpha"
    )
    
    val isRedline = rpm >= endRpm
    
    Row(
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = modifier
    ) {
        repeat(lightCount) { index ->
            val lightThreshold = startRpm + (index * rpmPerLight)
            val isLit = rpm >= lightThreshold
            
            val alpha = when {
                isRedline -> flashAlpha
                isLit -> 1f
                else -> 0.15f
            }
            
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .clip(CircleShape)
                    .background(
                        color = DashColors.ShiftLightOrange.copy(alpha = alpha)
                    )
            ) {
                if (isLit) {
                    // Glow effect
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                brush = androidx.compose.ui.graphics.Brush.radialGradient(
                                    colors = listOf(
                                        DashColors.ShiftLightOrange.copy(alpha = 0.8f),
                                        DashColors.ShiftLightRed.copy(alpha = 0.4f),
                                        Color.Transparent
                                    )
                                )
                            )
                    )
                }
            }
        }
    }
}

@Composable
fun GearIndicator(
    gear: Int,
    modifier: Modifier = Modifier
) {
    val gearText = when (gear) {
        0 -> "N"
        -1 -> "R"
        else -> gear.toString()
    }
    
    val prevGear = when {
        gear <= 0 -> ""
        gear == 1 -> "N"
        else -> (gear - 1).toString()
    }
    
    val nextGear = when {
        gear == -1 -> "N"
        gear == 0 -> "1"
        gear >= 6 -> ""
        else -> (gear + 1).toString()
    }
    
    // Animate gear changes
    val animatedGear by animateIntAsState(
        targetValue = gear,
        animationSpec = tween(100),
        label = "gear"
    )
    
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier
    ) {
        // Speed display would go above, but it's in Dashboard
        
        // Gear row: prev / current / next - URUS style
        Row(
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Previous gear
            Text(
                text = prevGear,
                color = DashColors.TextWhite.copy(alpha = 0.45f),
                fontSize = 28.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.width(40.dp)
            )
            
            // Current gear
            Text(
                text = gearText,
                color = DashColors.TextWhite,
                fontSize = 54.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.width(60.dp)
            )
            
            // Next gear
            Text(
                text = nextGear,
                color = DashColors.TextWhite.copy(alpha = 0.45f),
                fontSize = 28.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.width(40.dp)
            )
        }
        
        Text(
            text = "GEAR",
            color = DashColors.TextDim,
            fontSize = 14.sp,
            letterSpacing = 2.sp
        )
    }
}

@Composable 
fun DigitalSpeedDisplay(
    speed: Float,
    gear: Int,
    modifier: Modifier = Modifier
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = modifier
    ) {
        // Speed
        Text(
            text = speed.toInt().toString(),
            color = DashColors.TextWhite,
            fontSize = 72.sp,
            fontWeight = FontWeight.Medium
        )
        Text(
            text = "MPH",
            color = DashColors.TextDim,
            fontSize = 18.sp,
            letterSpacing = 4.sp
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        // Gear indicator
        GearIndicator(gear = gear)
    }
}

@Composable
fun TurnSignals(
    leftOn: Boolean,
    rightOn: Boolean,
    modifier: Modifier = Modifier
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(80.dp),
        modifier = modifier
    ) {
        // Left arrow
        TurnArrow(
            isOn = leftOn,
            pointLeft = true
        )
        
        // Right arrow
        TurnArrow(
            isOn = rightOn,
            pointLeft = false
        )
    }
}

@Composable
private fun TurnArrow(
    isOn: Boolean,
    pointLeft: Boolean
) {
    val alpha by animateFloatAsState(
        targetValue = if (isOn) 1f else 0.2f,
        animationSpec = tween(100),
        label = "turnAlpha"
    )
    
    val color = DashColors.TurnSignalGreen.copy(alpha = alpha)
    
    // Simple arrow using text (can be replaced with Canvas for custom shape)
    Text(
        text = if (pointLeft) "◀" else "▶",
        color = color,
        fontSize = 48.sp
    )
}
