package com.frank.dashboard.data

import androidx.compose.runtime.*
import kotlinx.coroutines.*
import kotlin.math.sin
import kotlin.random.Random

data class VehicleSignals(
    val rpm: Float = 0f,
    val speedMph: Float = 0f,
    val gear: Int = 0,
    val fuelPct: Float = 1f,
    val coolantTempC: Float = 90f,
    val oilPressurePsi: Float = 40f,
    val batteryVoltage: Float = 12.6f,
    val turnLeft: Boolean = false,
    val turnRight: Boolean = false,
    val checkEngine: Boolean = false,
    val maintenance: Boolean = false,
    val oilPressureWarning: Boolean = false,
    val lowFuel: Boolean = false,
    val highCoolant: Boolean = false,
    val absWarning: Boolean = false,
    val brakeWarning: Boolean = false,
    val headlights: Boolean = true,
    val highBeams: Boolean = false
)

class VehicleDataSimulator {
    private var _signals = mutableStateOf(VehicleSignals())
    val signals: State<VehicleSignals> = _signals
    
    private var simulationTime = 0f
    private var currentGear = 0
    private var targetRpm = 800f
    private var targetSpeed = 0f
    private var actualRpm = 800f
    private var actualSpeed = 0f
    
    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())
    
    init {
        startSimulation()
    }
    
    private fun startSimulation() {
        scope.launch {
            while (isActive) {
                simulationTime += 0.033f
                updateSimulation()
                delay(33) // ~30fps update
            }
        }
    }
    
    private fun updateSimulation() {
        // Simulate a drive cycle
        val cycleTime = simulationTime % 60f
        
        when {
            cycleTime < 5f -> {
                // Idle
                targetRpm = 800f + Random.nextFloat() * 50f
                targetSpeed = 0f
                currentGear = 0
            }
            cycleTime < 15f -> {
                // Accelerate through gears
                val accelPhase = (cycleTime - 5f) / 10f
                targetSpeed = accelPhase * 80f
                targetRpm = 2000f + accelPhase * 5000f
                currentGear = when {
                    targetSpeed < 15 -> 1
                    targetSpeed < 30 -> 2
                    targetSpeed < 50 -> 3
                    targetSpeed < 70 -> 4
                    else -> 5
                }
                
                // Simulate gear shift RPM drop
                if (targetRpm > 7000f) {
                    targetRpm = 3500f
                }
            }
            cycleTime < 35f -> {
                // Cruise
                targetRpm = 3000f + sin(simulationTime * 0.5f).toFloat() * 300f
                targetSpeed = 65f + sin(simulationTime * 0.3f).toFloat() * 5f
                currentGear = 5
            }
            cycleTime < 45f -> {
                // Decelerate
                val decelPhase = (cycleTime - 35f) / 10f
                targetSpeed = 65f * (1f - decelPhase)
                targetRpm = 3000f * (1f - decelPhase) + 800f
                currentGear = when {
                    targetSpeed > 50 -> 4
                    targetSpeed > 30 -> 3
                    targetSpeed > 15 -> 2
                    targetSpeed > 5 -> 1
                    else -> 0
                }
            }
            else -> {
                // Idle again
                targetRpm = 800f + Random.nextFloat() * 50f
                targetSpeed = 0f
                currentGear = 0
            }
        }
        
        // Smooth interpolation
        actualRpm += (targetRpm - actualRpm) * 0.1f
        actualSpeed += (targetSpeed - actualSpeed) * 0.08f
        
        // Update signals
        val turnSignalCycle = (simulationTime * 2f).toInt() % 2 == 0
        
        _signals.value = VehicleSignals(
            rpm = actualRpm,
            speedMph = actualSpeed,
            gear = currentGear,
            fuelPct = 0.75f,
            coolantTempC = 88f + Random.nextFloat() * 4f,
            oilPressurePsi = 35f + actualRpm / 200f,
            batteryVoltage = 13.8f + Random.nextFloat() * 0.4f,
            turnLeft = cycleTime > 20f && cycleTime < 25f && turnSignalCycle,
            turnRight = cycleTime > 40f && cycleTime < 45f && turnSignalCycle,
            checkEngine = false,
            maintenance = true, // Show SERVICE light
            oilPressureWarning = false,
            lowFuel = false,
            highCoolant = false,
            absWarning = false,
            brakeWarning = false,
            headlights = true,
            highBeams = false
        )
    }
    
    fun cleanup() {
        scope.cancel()
    }
}
