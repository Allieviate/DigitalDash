// ============================================================================
// TurnByTurnWidget.qml
// FRANK Dashboard — Minimalist Turn-by-Turn Navigation HUD
//
// Displays: Turn arrow (SVG) + distance + street name
// Bound to NavigationManager.isNavigating — invisible when no route.
// Animation: Smooth opacity pulse + directional slide on the arrow icon.
// Hardware-accelerated via QML's scene graph (layer.enabled: true).
// ============================================================================
import QtQuick 2.15
import QtQuick.Layouts 1.15

Item {
    id: root

    // Size — parent should set these based on dash layout
    width: 280
    height: 120

    // Bind visibility to navigation state
    visible: navManager.isNavigating
    opacity: visible ? 1.0 : 0.0

    Behavior on opacity {
        NumberAnimation { duration: 350; easing.type: Easing.InOutQuad }
    }

    // ── Background: frosted dark pill ──────────────────────────────────
    Rectangle {
        anchors.fill: parent
        radius: 16
        color: "#1a1a1a"
        opacity: 0.85
        border.color: Qt.rgba(1, 1, 1, 0.06)
        border.width: 1

        // Hardware-accelerated compositing
        layer.enabled: true
        layer.smooth: true
    }

    RowLayout {
        anchors.fill: parent
        anchors.margins: 12
        spacing: 14

        // ── Turn Icon with Pulse Animation ─────────────────────────────
        Item {
            id: iconContainer
            Layout.preferredWidth: 56
            Layout.preferredHeight: 56
            Layout.alignment: Qt.AlignVCenter

            Image {
                id: turnArrow
                anchors.centerIn: parent
                width: 48
                height: 48
                source: navManager.turnIcon
                sourceSize: Qt.size(48, 48)
                fillMode: Image.PreserveAspectFit
                smooth: true
                mipmap: true

                // Hardware-accelerated: offload to GPU texture
                layer.enabled: true
                layer.smooth: true
            }

            // ── Pulse + Slide animation (loops while navigating) ───────
            SequentialAnimation {
                id: pulseAnim
                loops: Animation.Infinite
                running: navManager.isNavigating

                // Phase 1: Pulse bright + subtle slide in turn direction
                ParallelAnimation {
                    NumberAnimation {
                        target: turnArrow
                        property: "opacity"
                        from: 0.45
                        to: 1.0
                        duration: 900
                        easing.type: Easing.InOutSine
                    }
                    NumberAnimation {
                        target: turnArrow
                        property: "x"
                        from: turnArrow.x
                        to: turnArrow.x + _slideOffset()
                        duration: 900
                        easing.type: Easing.InOutSine
                    }
                }

                // Phase 2: Fade back + slide return
                ParallelAnimation {
                    NumberAnimation {
                        target: turnArrow
                        property: "opacity"
                        from: 1.0
                        to: 0.45
                        duration: 900
                        easing.type: Easing.InOutSine
                    }
                    NumberAnimation {
                        target: turnArrow
                        property: "x"
                        from: turnArrow.x + _slideOffset()
                        to: turnArrow.x
                        duration: 900
                        easing.type: Easing.InOutSine
                    }
                }
            }
        }

        // ── Text column: distance + street ─────────────────────────────
        ColumnLayout {
            Layout.fillWidth: true
            Layout.alignment: Qt.AlignVCenter
            spacing: 4

            // Distance to turn (larger, bolder)
            Text {
                id: distanceText
                text: navManager.distanceToTurn
                color: navManager.isImminent ? "#FF6B6B" : "#FFFFFF"
                font.family: "Helvetica Neue"
                font.pixelSize: 22
                font.weight: Font.Bold
                font.letterSpacing: 1.2
                elide: Text.ElideRight
                Layout.fillWidth: true

                // Flash red when imminent
                Behavior on color {
                    ColorAnimation { duration: 300 }
                }
            }

            // Street name (smaller, dimmer)
            Text {
                id: streetText
                text: navManager.streetName
                color: Qt.rgba(1, 1, 1, 0.55)
                font.family: "Helvetica Neue"
                font.pixelSize: 13
                font.weight: Font.Normal
                font.letterSpacing: 0.8
                elide: Text.ElideRight
                Layout.fillWidth: true
                maximumLineCount: 1
            }
        }
    }

    // ── Imminent turn indicator: thin accent bar at bottom ──────────────
    Rectangle {
        anchors.bottom: parent.bottom
        anchors.left: parent.left
        anchors.right: parent.right
        anchors.leftMargin: 24
        anchors.rightMargin: 24
        height: 2
        radius: 1
        color: navManager.isImminent ? "#FF6B6B" : "#3B82F6"
        opacity: navManager.isImminent ? 1.0 : 0.3

        Behavior on color   { ColorAnimation { duration: 300 } }
        Behavior on opacity { NumberAnimation { duration: 300 } }
    }

    // ── Helper: slide direction based on turn icon name ─────────────────
    function _slideOffset() {
        var icon = navManager.turnIcon;
        if (icon.indexOf("left") !== -1)  return -4;
        if (icon.indexOf("right") !== -1) return  4;
        if (icon.indexOf("uturn") !== -1) return  0;
        return 0; // straight: no slide
    }
}
