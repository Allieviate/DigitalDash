package com.frank.dashboard.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
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

data class Warning(
    val id: String,
    val label: String,
    val color: Color,
    val critical: Boolean = false
)

@Composable
fun WarningPanel(
    checkEngine: Boolean,
    oilPressure: Boolean,
    highCoolant: Boolean,
    lowFuel: Boolean,
    maintenance: Boolean,
    absWarning: Boolean,
    brakeWarning: Boolean,
    modifier: Modifier = Modifier
) {
    val warnings = listOf(
        Warning("check_engine", "CHECK", DashColors.WarningYellow, true) to checkEngine,
        Warning("oil", "OIL", DashColors.WarningRed, true) to oilPressure,
        Warning("temp", "TEMP", DashColors.WarningRed, true) to highCoolant,
        Warning("fuel", "FUEL", DashColors.WarningYellow) to lowFuel,
        Warning("service", "SERVICE", DashColors.WarningYellow) to maintenance,
        Warning("abs", "ABS", DashColors.WarningYellow) to absWarning,
        Warning("brake", "BRAKE", DashColors.WarningRed, true) to brakeWarning
    )
    
    Row(
        horizontalArrangement = Arrangement.spacedBy(50.dp),
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
    ) {
        warnings.forEach { (warning, isActive) ->
            WarningLight(
                label = warning.label,
                color = warning.color,
                isActive = isActive,
                isCritical = warning.critical
            )
        }
    }
}

@Composable
private fun WarningLight(
    label: String,
    color: Color,
    isActive: Boolean,
    isCritical: Boolean
) {
    val alpha = if (isActive) 1f else 0.2f
    val displayColor = color.copy(alpha = alpha)
    
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Icon placeholder (could use actual icons)
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(displayColor.copy(alpha = if (isActive) 0.3f else 0.1f)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = label.first().toString(),
                color = displayColor,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )
        }
        
        Spacer(modifier = Modifier.height(4.dp))
        
        Text(
            text = label,
            color = displayColor,
            fontSize = 10.sp,
            fontWeight = FontWeight.Medium,
            letterSpacing = 1.sp
        )
    }
}
