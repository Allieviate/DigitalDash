// ============================================================================
// NavigationBridge.cpp
// FRANK Dashboard — aasdk Channel → NavigationManager Bridge
// ============================================================================
#include "NavigationBridge.hpp"
#include "NavigationManager.hpp"
#include <QDebug>

// ── Uncomment if you are linking against the compiled navigation proto ──
// #include "navigation_state.pb.h"
// using NavProto = android::car::cluster::navigation::NavigationStateProto;
// using StepProto = android::car::cluster::navigation::Step;
// using ManeuverProto = android::car::cluster::navigation::Maneuver;
// using DistanceProto = android::car::cluster::navigation::Distance;

NavigationBridge::NavigationBridge(NavigationManager *navManager,
                                    QObject *parent)
    : QObject(parent)
    , m_navManager(navManager)
{
    qDebug() << "[NAV-BRIDGE] NavigationBridge initialized";
}

// ────────────────────────────────────────────────────────────────────────
// Option A: High-level feed — call this from your existing handler
// ────────────────────────────────────────────────────────────────────────
void NavigationBridge::feedNavigationState(int maneuverType,
                                            const QString &displayDistance,
                                            const QString &distanceUnit,
                                            const QString &roadName,
                                            bool isImminent)
{
    if (!m_navManager) return;

    QString formattedDist = formatDistance(displayDistance, distanceUnit);
    m_navManager->updateNavigation(maneuverType, formattedDist, roadName, isImminent);
}

// ────────────────────────────────────────────────────────────────────────
// Option B: Raw protobuf — decodes NavigationStateProto bytes
// ────────────────────────────────────────────────────────────────────────
void NavigationBridge::feedRawNavigationBytes(const char *data, size_t length)
{
    if (!m_navManager || !data || length == 0) return;

    // ── Uncomment this block when linking against compiled proto ──────
    /*
    NavProto navState;
    if (!navState.ParseFromArray(data, static_cast<int>(length))) {
        qWarning() << "[NAV-BRIDGE] Failed to parse NavigationStateProto";
        return;
    }

    // Extract the first (current) step
    if (navState.steps_size() > 0) {
        const StepProto &step = navState.steps(0);

        // Maneuver type
        int maneuverType = 0;
        if (step.has_maneuver()) {
            maneuverType = static_cast<int>(step.maneuver().type());
        }

        // Distance
        QString distText;
        if (step.has_distance()) {
            const DistanceProto &dist = step.distance();
            distText = formatDistance(
                QString::fromStdString(dist.display_value()),
                distUnitToString(dist.display_units())
            );
        }

        // Road name: prefer cue.alternate_text, fallback to step.road.name
        QString road;
        if (step.has_cue() && !step.cue().alternate_text().empty()) {
            road = QString::fromStdString(step.cue().alternate_text());
        } else if (step.has_road()) {
            road = QString::fromStdString(step.road().name());
        }

        // Is the turn imminent?
        bool imminent = step.is_imminent();

        m_navManager->updateNavigation(maneuverType, distText, road, imminent);
    } else {
        // No steps = navigation ended or rerouting
        if (navState.service_status() !=
            NavProto::REROUTING) {
            m_navManager->clearNavigation();
        }
    }
    */

    // ── Stub: Log that raw bytes were received ────────────────────────
    qDebug() << "[NAV-BRIDGE] Received raw nav bytes:" << length << "bytes"
             << "(enable proto parsing by uncommenting the block above)";
}

// ────────────────────────────────────────────────────────────────────────
// Phone lifecycle
// ────────────────────────────────────────────────────────────────────────
void NavigationBridge::onPhoneConnected()
{
    qDebug() << "[NAV-BRIDGE] Phone connected — waiting for navigation data";
}

void NavigationBridge::onPhoneDisconnected()
{
    qDebug() << "[NAV-BRIDGE] Phone disconnected — clearing navigation";
    if (m_navManager) {
        m_navManager->clearNavigation();
    }
}

// ────────────────────────────────────────────────────────────────────────
// Distance formatting
// ────────────────────────────────────────────────────────────────────────
QString NavigationBridge::formatDistance(const QString &value,
                                          const QString &unit)
{
    if (value.isEmpty()) return QString();

    // The display_value from the proto is already locale-formatted
    // (e.g. "1.2" or "500"). We just append the unit.
    if (unit.isEmpty()) return value;
    return value + " " + unit;
}
