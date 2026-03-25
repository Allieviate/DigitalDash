// ============================================================================
// NavigationManager.hpp
// FRANK Dashboard — Android Auto Turn-by-Turn HUD Bridge
//
// QObject bridge between aasdk NavigationStatus channel and QML.
// Exposes lightweight HUD data: turn icon, distance, street name.
// ============================================================================
#pragma once

#include <QObject>
#include <QString>
#include <QTimer>
#include <memory>

// Forward-declare aasdk types (avoids pulling heavy headers into QML layer)
namespace aasdk::proto::messages {
    class NavigationStatus;
}

class NavigationManager : public QObject
{
    Q_OBJECT

    // ── Properties exposed to QML ──────────────────────────────────────
    Q_PROPERTY(bool    isNavigating   READ isNavigating   NOTIFY navigationChanged)
    Q_PROPERTY(QString turnIcon       READ turnIcon       NOTIFY navigationChanged)
    Q_PROPERTY(QString distanceToTurn READ distanceToTurn NOTIFY navigationChanged)
    Q_PROPERTY(QString streetName     READ streetName     NOTIFY navigationChanged)
    Q_PROPERTY(QString maneuverName   READ maneuverName   NOTIFY navigationChanged)
    Q_PROPERTY(bool    isImminent     READ isImminent     NOTIFY navigationChanged)

public:
    explicit NavigationManager(QObject *parent = nullptr);
    ~NavigationManager() override = default;

    // ── Singleton accessor (registered once, shared everywhere) ────────
    static NavigationManager *instance();

    // ── Getters for QML binding ────────────────────────────────────────
    bool    isNavigating()   const { return m_isNavigating; }
    QString turnIcon()       const { return m_turnIcon; }
    QString distanceToTurn() const { return m_distanceToTurn; }
    QString streetName()     const { return m_streetName; }
    QString maneuverName()   const { return m_maneuverName; }
    bool    isImminent()     const { return m_isImminent; }

    // ── Public API: called from the aasdk channel handler ──────────────
    // This is the entry point — the NavigationBridge feeds decoded protobuf
    // data into these methods.

    /**
     * Update navigation state from a decoded protobuf message.
     * @param maneuverType  Maneuver.Type enum value from navigation_state.proto
     * @param distanceText  Pre-formatted distance string (e.g. "500 ft")
     * @param road          Road name for the upcoming maneuver
     * @param imminent      True when the turn is about to happen
     */
    void updateNavigation(int maneuverType,
                          const QString &distanceText,
                          const QString &road,
                          bool imminent);

    /** Clear navigation — phone disconnected or route ended. */
    void clearNavigation();

signals:
    /** Emitted whenever any navigation property changes. */
    void navigationChanged();

private:
    // ── Maneuver-to-SVG icon mapping ──────────────────────────────────
    static QString iconForManeuver(int maneuverType);
    static QString nameForManeuver(int maneuverType);

    bool    m_isNavigating  = false;
    QString m_turnIcon      = "";
    QString m_distanceToTurn = "";
    QString m_streetName    = "";
    QString m_maneuverName  = "";
    bool    m_isImminent    = false;

    static NavigationManager *s_instance;
};
