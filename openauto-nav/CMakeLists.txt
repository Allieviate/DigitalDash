# ============================================================================
# CMakeLists.txt — FRANK Navigation HUD Module
# Add to your OpenAuto build via add_subdirectory() or include()
# ============================================================================
cmake_minimum_required(VERSION 3.10)

set(NAV_SOURCES
    cpp/NavigationManager.cpp
    cpp/NavigationBridge.cpp
)

set(NAV_HEADERS
    cpp/NavigationManager.hpp
    cpp/NavigationBridge.hpp
)

# Create a static library that can be linked into openauto
add_library(frank_navigation STATIC ${NAV_SOURCES} ${NAV_HEADERS})

target_include_directories(frank_navigation PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/cpp
)

target_link_libraries(frank_navigation
    Qt5::Core
    Qt5::Quick
)

# Optional: if you want to decode raw protobuf in NavigationBridge
# target_link_libraries(frank_navigation navigation_state_proto)

# QML resources
qt5_add_resources(NAV_QRC_SOURCES
    ${CMAKE_CURRENT_SOURCE_DIR}/nav_resources.qrc
)
