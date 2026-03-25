// ============================================================================
// NavigationBridge.hpp
// FRANK Dashboard — aasdk Channel → NavigationManager Bridge
//
// This class hooks into the aasdk NavigationStatus service channel,
// decodes the protobuf messages, and feeds data into NavigationManager.
//
// Integration point: Register this in openauto's ServiceFactory or
// call feedNavigationState() from your existing channel handler.
// ============================================================================
#pragma once

#include <QObject>
#include <QString>

class NavigationManager;

class NavigationBridge : public QObject
{
    Q_OBJECT

public:
    explicit NavigationBridge(NavigationManager *navManager,
                              QObject *parent = nullptr);
    ~NavigationBridge() override = default;

    // ── Option A: High-level feed ──────────────────────────────────────
    // If you already have a channel handler decoding NavigationStateProto,
    // call this with the decoded fields.
    void feedNavigationState(int maneuverType,
                              const QString &displayDistance,
                              const QString &distanceUnit,
                              const QString &roadName,
                              bool isImminent);

    // ── Option B: Raw protobuf bytes ───────────────────────────────────
    // If you want the bridge to decode the protobuf itself,
    // pass the serialized NavigationStateProto bytes here.
    // Requires linking against the compiled proto library.
    void feedRawNavigationBytes(const char *data, size_t length);

    // ── Connection lifecycle ────────────────────────────────────────────
    void onPhoneConnected();
    void onPhoneDisconnected();

private:
    NavigationManager *m_navManager = nullptr;

    QString formatDistance(const QString &value, const QString &unit);
};
