// ============================================================================
// NavigationManager.cpp
// FRANK Dashboard — Android Auto Turn-by-Turn HUD Bridge
// ============================================================================
#include "NavigationManager.hpp"
#include <QDebug>

// ── Maneuver Type enum values from AOSP navigation_state.proto ─────────
// These MUST match the proto enum values exactly.
namespace ManeuverType {
    enum Type {
        UNKNOWN                   = 0,
        DEPART                    = 1,
        NAME_CHANGE               = 2,
        KEEP_LEFT                 = 3,
        KEEP_RIGHT                = 4,
        TURN_SLIGHT_LEFT          = 5,
        TURN_SLIGHT_RIGHT         = 6,
        TURN_NORMAL_LEFT          = 7,
        TURN_NORMAL_RIGHT         = 8,
        TURN_SHARP_LEFT           = 9,
        TURN_SHARP_RIGHT          = 10,
        U_TURN_LEFT               = 11,
        U_TURN_RIGHT              = 12,
        ON_RAMP_SLIGHT_LEFT       = 13,
        ON_RAMP_SLIGHT_RIGHT      = 14,
        ON_RAMP_NORMAL_LEFT       = 15,
        ON_RAMP_NORMAL_RIGHT      = 16,
        ON_RAMP_SHARP_LEFT        = 17,
        ON_RAMP_SHARP_RIGHT       = 18,
        ON_RAMP_U_TURN_LEFT       = 19,
        ON_RAMP_U_TURN_RIGHT      = 20,
        OFF_RAMP_SLIGHT_LEFT      = 21,
        OFF_RAMP_SLIGHT_RIGHT     = 22,
        OFF_RAMP_NORMAL_LEFT      = 23,
        OFF_RAMP_NORMAL_RIGHT     = 24,
        FORK_LEFT                 = 25,
        FORK_RIGHT                = 26,
        MERGE_LEFT                = 27,
        MERGE_RIGHT               = 28,
        ROUNDABOUT_ENTER          = 29,
        ROUNDABOUT_EXIT           = 30,
        STRAIGHT                  = 47,
        FERRY_BOAT                = 48,
        FERRY_TRAIN               = 49,
        DESTINATION               = 50,
        DESTINATION_STRAIGHT      = 51,
        DESTINATION_LEFT          = 52,
        DESTINATION_RIGHT         = 53,
        MERGE_SIDE_UNSPECIFIED    = 54,
    };
}

// Singleton
NavigationManager *NavigationManager::s_instance = nullptr;

NavigationManager::NavigationManager(QObject *parent)
    : QObject(parent)
{
    s_instance = this;
    qDebug() << "[NAV] NavigationManager initialized";
}

NavigationManager *NavigationManager::instance()
{
    return s_instance;
}

// ────────────────────────────────────────────────────────────────────────
// updateNavigation — Main entry: aasdk bridge feeds data here
// ────────────────────────────────────────────────────────────────────────
void NavigationManager::updateNavigation(int maneuverType,
                                          const QString &distanceText,
                                          const QString &road,
                                          bool imminent)
{
    bool changed = false;

    // Resolve icon SVG from maneuver enum
    QString icon = iconForManeuver(maneuverType);
    QString name = nameForManeuver(maneuverType);

    if (!m_isNavigating)    { m_isNavigating = true;   changed = true; }
    if (m_turnIcon      != icon)         { m_turnIcon      = icon;         changed = true; }
    if (m_distanceToTurn != distanceText) { m_distanceToTurn = distanceText; changed = true; }
    if (m_streetName    != road)         { m_streetName    = road;         changed = true; }
    if (m_maneuverName  != name)         { m_maneuverName  = name;         changed = true; }
    if (m_isImminent    != imminent)     { m_isImminent    = imminent;     changed = true; }

    if (changed) {
        qDebug() << "[NAV] Update:" << name << distanceText << "on" << road
                 << (imminent ? "(IMMINENT)" : "");
        emit navigationChanged();
    }
}

void NavigationManager::clearNavigation()
{
    if (m_isNavigating) {
        m_isNavigating   = false;
        m_turnIcon       = "";
        m_distanceToTurn = "";
        m_streetName     = "";
        m_maneuverName   = "";
        m_isImminent     = false;
        qDebug() << "[NAV] Navigation cleared";
        emit navigationChanged();
    }
}

// ────────────────────────────────────────────────────────────────────────
// Maneuver → SVG icon mapping
// Icons are flat 2D SVGs stored in assets/nav-icons/
// ────────────────────────────────────────────────────────────────────────
QString NavigationManager::iconForManeuver(int type)
{
    // Map groups of similar maneuvers to a single SVG
    switch (type) {
    // ── Straight / Continue ────────────────────────
    case ManeuverType::DEPART:
    case ManeuverType::NAME_CHANGE:
    case ManeuverType::STRAIGHT:
        return QStringLiteral("qrc:/nav-icons/straight.svg");

    // ── Left turns ─────────────────────────────────
    case ManeuverType::TURN_SLIGHT_LEFT:
    case ManeuverType::ON_RAMP_SLIGHT_LEFT:
    case ManeuverType::OFF_RAMP_SLIGHT_LEFT:
        return QStringLiteral("qrc:/nav-icons/slight_left.svg");

    case ManeuverType::TURN_NORMAL_LEFT:
    case ManeuverType::ON_RAMP_NORMAL_LEFT:
    case ManeuverType::OFF_RAMP_NORMAL_LEFT:
        return QStringLiteral("qrc:/nav-icons/turn_left.svg");

    case ManeuverType::TURN_SHARP_LEFT:
    case ManeuverType::ON_RAMP_SHARP_LEFT:
        return QStringLiteral("qrc:/nav-icons/sharp_left.svg");

    case ManeuverType::KEEP_LEFT:
    case ManeuverType::FORK_LEFT:
        return QStringLiteral("qrc:/nav-icons/keep_left.svg");

    // ── Right turns ────────────────────────────────
    case ManeuverType::TURN_SLIGHT_RIGHT:
    case ManeuverType::ON_RAMP_SLIGHT_RIGHT:
    case ManeuverType::OFF_RAMP_SLIGHT_RIGHT:
        return QStringLiteral("qrc:/nav-icons/slight_right.svg");

    case ManeuverType::TURN_NORMAL_RIGHT:
    case ManeuverType::ON_RAMP_NORMAL_RIGHT:
    case ManeuverType::OFF_RAMP_NORMAL_RIGHT:
        return QStringLiteral("qrc:/nav-icons/turn_right.svg");

    case ManeuverType::TURN_SHARP_RIGHT:
    case ManeuverType::ON_RAMP_SHARP_RIGHT:
        return QStringLiteral("qrc:/nav-icons/sharp_right.svg");

    case ManeuverType::KEEP_RIGHT:
    case ManeuverType::FORK_RIGHT:
        return QStringLiteral("qrc:/nav-icons/keep_right.svg");

    // ── U-turns ────────────────────────────────────
    case ManeuverType::U_TURN_LEFT:
    case ManeuverType::ON_RAMP_U_TURN_LEFT:
        return QStringLiteral("qrc:/nav-icons/uturn_left.svg");

    case ManeuverType::U_TURN_RIGHT:
    case ManeuverType::ON_RAMP_U_TURN_RIGHT:
        return QStringLiteral("qrc:/nav-icons/uturn_right.svg");

    // ── Merge ──────────────────────────────────────
    case ManeuverType::MERGE_LEFT:
        return QStringLiteral("qrc:/nav-icons/merge_left.svg");
    case ManeuverType::MERGE_RIGHT:
    case ManeuverType::MERGE_SIDE_UNSPECIFIED:
        return QStringLiteral("qrc:/nav-icons/merge_right.svg");

    // ── Roundabout ─────────────────────────────────
    case ManeuverType::ROUNDABOUT_ENTER:
    case ManeuverType::ROUNDABOUT_EXIT:
        return QStringLiteral("qrc:/nav-icons/roundabout.svg");

    // ── Destination ────────────────────────────────
    case ManeuverType::DESTINATION:
    case ManeuverType::DESTINATION_STRAIGHT:
    case ManeuverType::DESTINATION_LEFT:
    case ManeuverType::DESTINATION_RIGHT:
        return QStringLiteral("qrc:/nav-icons/destination.svg");

    // ── Ferry ──────────────────────────────────────
    case ManeuverType::FERRY_BOAT:
    case ManeuverType::FERRY_TRAIN:
        return QStringLiteral("qrc:/nav-icons/ferry.svg");

    default:
        return QStringLiteral("qrc:/nav-icons/straight.svg");
    }
}

QString NavigationManager::nameForManeuver(int type)
{
    switch (type) {
    case ManeuverType::DEPART:              return QStringLiteral("Depart");
    case ManeuverType::NAME_CHANGE:         return QStringLiteral("Continue");
    case ManeuverType::STRAIGHT:            return QStringLiteral("Continue straight");
    case ManeuverType::KEEP_LEFT:           return QStringLiteral("Keep left");
    case ManeuverType::KEEP_RIGHT:          return QStringLiteral("Keep right");
    case ManeuverType::TURN_SLIGHT_LEFT:    return QStringLiteral("Slight left");
    case ManeuverType::TURN_SLIGHT_RIGHT:   return QStringLiteral("Slight right");
    case ManeuverType::TURN_NORMAL_LEFT:    return QStringLiteral("Turn left");
    case ManeuverType::TURN_NORMAL_RIGHT:   return QStringLiteral("Turn right");
    case ManeuverType::TURN_SHARP_LEFT:     return QStringLiteral("Sharp left");
    case ManeuverType::TURN_SHARP_RIGHT:    return QStringLiteral("Sharp right");
    case ManeuverType::U_TURN_LEFT:         return QStringLiteral("U-turn left");
    case ManeuverType::U_TURN_RIGHT:        return QStringLiteral("U-turn right");
    case ManeuverType::FORK_LEFT:           return QStringLiteral("Fork left");
    case ManeuverType::FORK_RIGHT:          return QStringLiteral("Fork right");
    case ManeuverType::MERGE_LEFT:          return QStringLiteral("Merge left");
    case ManeuverType::MERGE_RIGHT:         return QStringLiteral("Merge right");
    case ManeuverType::ROUNDABOUT_ENTER:    return QStringLiteral("Enter roundabout");
    case ManeuverType::ROUNDABOUT_EXIT:     return QStringLiteral("Exit roundabout");
    case ManeuverType::DESTINATION:
    case ManeuverType::DESTINATION_STRAIGHT:
    case ManeuverType::DESTINATION_LEFT:
    case ManeuverType::DESTINATION_RIGHT:   return QStringLiteral("Arriving");
    case ManeuverType::FERRY_BOAT:          return QStringLiteral("Take ferry");
    case ManeuverType::FERRY_TRAIN:         return QStringLiteral("Take train");
    default:                                return QStringLiteral("Navigate");
    }
}
