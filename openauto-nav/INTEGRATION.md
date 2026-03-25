# FRANK Navigation HUD — Integration Guide

## Overview

This module adds a minimalist Turn-by-Turn navigation widget to the FRANK dashboard,
extracting lightweight HUD data from Android Auto (turn arrows, distance, street name)
without embedding the full Google Maps video feed.

## Architecture

```
Phone (Google Maps)
    │
    ▼  Android Auto Protocol (protobuf over USB)
    │
aasdk ─── NavigationStatusChannel ─── receives NavigationStateProto
    │
    ▼
NavigationBridge.cpp ─── decodes protobuf → calls NavigationManager
    │
    ▼
NavigationManager.cpp ─── QObject with Q_PROPERTY (singleton)
    │
    ▼  QML property bindings
    │
TurnByTurnWidget.qml ─── SVG icon + distance + street name
```

## Files

```
openauto-nav/
├── cpp/
│   ├── NavigationManager.hpp    # QObject bridge (Q_PROPERTY → QML)
│   ├── NavigationManager.cpp    # Maneuver→SVG mapping, state management
│   ├── NavigationBridge.hpp     # aasdk channel → NavigationManager
│   └── NavigationBridge.cpp     # Protobuf decoding (Option A or B)
├── qml/
│   └── TurnByTurnWidget.qml    # Minimalist HUD widget
├── assets/
│   ├── straight.svg             # 16 flat SVG turn icons
│   ├── turn_left.svg
│   ├── turn_right.svg
│   ├── slight_left.svg
│   ├── slight_right.svg
│   ├── sharp_left.svg
│   ├── sharp_right.svg
│   ├── keep_left.svg
│   ├── keep_right.svg
│   ├── uturn_left.svg
│   ├── uturn_right.svg
│   ├── merge_left.svg
│   ├── merge_right.svg
│   ├── roundabout.svg
│   ├── destination.svg
│   └── ferry.svg
├── CMakeLists.txt
├── nav_resources.qrc
└── INTEGRATION.md               # This file
```

## Step-by-Step Integration into OpenAuto

### Step 1: Copy files into the OpenAuto source tree

```bash
cp -r /path/to/openauto-nav /opt/openauto/openauto/openauto-nav
```

### Step 2: Add to OpenAuto's CMakeLists.txt

In `/opt/openauto/openauto/CMakeLists.txt`, add:

```cmake
# After the existing add_subdirectory() calls
add_subdirectory(openauto-nav)

# Link against the openauto target
target_link_libraries(openauto frank_navigation)
```

### Step 3: Register NavigationManager with QML

In OpenAuto's `main.cpp` (or wherever the QQmlEngine is created):

```cpp
#include "openauto-nav/cpp/NavigationManager.hpp"
#include "openauto-nav/cpp/NavigationBridge.hpp"

// After QQmlEngine is created:
auto *navManager = new NavigationManager(qApp);
auto *navBridge  = new NavigationBridge(navManager, qApp);

// Register singleton for QML access
engine.rootContext()->setContextProperty("navManager", navManager);
```

### Step 4: Hook into the aasdk Navigation Channel

There are **two options** depending on how your OpenAuto fork handles navigation:

#### Option A: High-Level Feed (Recommended)

If your OpenAuto/aasdk fork already has a navigation status handler that decodes
the protobuf messages, find the callback where navigation data arrives and add:

```cpp
// In your existing navigation status handler callback:
void onNavigationStatus(const NavigationStateProto &navState) {
    if (navState.steps_size() > 0) {
        const auto &step = navState.steps(0);

        int maneuverType = step.has_maneuver()
            ? static_cast<int>(step.maneuver().type())
            : 0;

        QString distance;
        QString distUnit;
        if (step.has_distance()) {
            distance = QString::fromStdString(step.distance().display_value());
            // Map enum to string
            switch (step.distance().display_units()) {
                case Distance::METERS:     distUnit = "m";  break;
                case Distance::KILOMETERS: distUnit = "km"; break;
                case Distance::MILES:      distUnit = "mi"; break;
                case Distance::FEET:       distUnit = "ft"; break;
                case Distance::YARDS:      distUnit = "yd"; break;
                default:                   distUnit = "";   break;
            }
        }

        QString road;
        if (step.has_cue()) {
            road = QString::fromStdString(step.cue().alternate_text());
        } else if (step.has_road()) {
            road = QString::fromStdString(step.road().name());
        }

        // Feed into FRANK navigation bridge
        navBridge->feedNavigationState(
            maneuverType, distance, distUnit, road, step.is_imminent()
        );
    }
}
```

#### Option B: Raw Bytes

If you have access to the raw channel bytes before protobuf decoding:

```cpp
// In your channel message handler:
void onNavigationChannelMessage(const uint8_t *data, size_t len) {
    navBridge->feedRawNavigationBytes(
        reinterpret_cast<const char*>(data), len
    );
}
```

For this to work, uncomment the protobuf parsing block in `NavigationBridge.cpp`
and ensure the navigation_state.proto is compiled and linked.

#### Option C: Intercepting the aasdk Service Channel

If you need to add a new channel handler from scratch, here's the pattern.
In aasdk, navigation status comes through `INavigationStatusServiceChannel`.
Register a handler in the service factory:

```cpp
// In your service factory or app initialization:
#include <aasdk/Channel/Navigation/NavigationStatusServiceChannel.hpp>

// Create the channel handler
auto navChannel = std::make_shared<aasdk::channel::navigation::
    NavigationStatusServiceChannel>(strand, std::move(cryptor));

// Set callback
navChannel->setMessageHandler([navBridge](const auto& message) {
    // message contains the serialized NavigationStateProto
    const auto& payload = message.payload();
    navBridge->feedRawNavigationBytes(payload.data(), payload.size());
});
```

### Step 5: Place the QML Widget in Your Dashboard

In your main QML file, add the TurnByTurnWidget:

```qml
import QtQuick 2.15

// In your dashboard layout:
TurnByTurnWidget {
    id: navHud

    // Position: top-left corner of the gauge cluster
    anchors.top: parent.top
    anchors.left: parent.left
    anchors.topMargin: 20
    anchors.leftMargin: 20

    // Or anchor to the center panel area:
    // anchors.horizontalCenter: parent.horizontalCenter
    // anchors.top: parent.top
    // anchors.topMargin: 140

    width: 280
    height: 120
}
```

### Step 6: Handle Phone Disconnect

In your phone connection lifecycle handler:

```cpp
// When phone disconnects:
navBridge->onPhoneDisconnected();  // This clears the HUD

// When phone connects:
navBridge->onPhoneConnected();     // Logs, ready state
```

### Step 7: Build

```bash
cd /opt/openauto/openauto/build
cmake .. -DCMAKE_BUILD_TYPE=Release -DNOPI=ON -DCMAKE_CXX_STANDARD=17
make -j2
```

## Testing Without a Phone

For development/testing, you can simulate navigation data from C++:

```cpp
// In your test code or a debug button handler:
auto *nav = NavigationManager::instance();
if (nav) {
    // Simulate "Turn left in 500 ft onto Main St"
    nav->updateNavigation(
        7,              // TURN_NORMAL_LEFT
        "500 ft",       // distance
        "Main St",      // road
        false           // not imminent yet
    );

    // Later, simulate imminent turn
    nav->updateNavigation(7, "100 ft", "Main St", true);

    // Simulate arrival
    nav->updateNavigation(50, "", "Destination", false);

    // Clear navigation
    nav->clearNavigation();
}
```

## Maneuver Type Reference

| Value | Enum                    | Icon SVG        |
|-------|-------------------------|-----------------|
| 0     | UNKNOWN                 | straight.svg    |
| 1     | DEPART                  | straight.svg    |
| 2     | NAME_CHANGE             | straight.svg    |
| 3     | KEEP_LEFT               | keep_left.svg   |
| 4     | KEEP_RIGHT              | keep_right.svg  |
| 5     | TURN_SLIGHT_LEFT        | slight_left.svg |
| 6     | TURN_SLIGHT_RIGHT       | slight_right.svg|
| 7     | TURN_NORMAL_LEFT        | turn_left.svg   |
| 8     | TURN_NORMAL_RIGHT       | turn_right.svg  |
| 9     | TURN_SHARP_LEFT         | sharp_left.svg  |
| 10    | TURN_SHARP_RIGHT        | sharp_right.svg |
| 11    | U_TURN_LEFT             | uturn_left.svg  |
| 12    | U_TURN_RIGHT            | uturn_right.svg |
| 25    | FORK_LEFT               | keep_left.svg   |
| 26    | FORK_RIGHT              | keep_right.svg  |
| 27    | MERGE_LEFT              | merge_left.svg  |
| 28    | MERGE_RIGHT             | merge_right.svg |
| 29    | ROUNDABOUT_ENTER        | roundabout.svg  |
| 30    | ROUNDABOUT_EXIT         | roundabout.svg  |
| 47    | STRAIGHT                | straight.svg    |
| 48    | FERRY_BOAT              | ferry.svg       |
| 49    | FERRY_TRAIN             | ferry.svg       |
| 50-53 | DESTINATION*            | destination.svg |

## Performance Notes for Raspberry Pi

- **GPU-accelerated**: The QML widget uses `layer.enabled: true` which offloads
  compositing to the GPU via OpenGL ES. No CPU-bound canvas drawing.
- **SVG icons**: Pre-rasterized at 48x48 with `sourceSize`. Only re-rasterized
  if the icon changes (new maneuver).
- **Animations**: `PropertyAnimation` on `opacity` and `x` are GPU-composited
  properties — no layout recalculation needed.
- **Minimal redraws**: `navigationChanged()` signal only fires when data actually
  changes, avoiding unnecessary QML binding re-evaluation.
