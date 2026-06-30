cmake_minimum_required(VERSION 3.16)
project(HybridSPA CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ---------------------------------------------------------
# CORE ENGINE: files in src/core/
# This code knows nothing about WebAssembly or JS 
# ---------------------------------------------------------
add_library(core_engine STATIC
    src/core/utils.cpp
    src/core/schedulers/scheduler.cpp
    src/core/schedulers/fifo.cpp
    src/core/schedulers/sjf.cpp
    src/core/schedulers/hpf.cpp
    src/core/main.cpp
    src/core/schedulers/cfs.cpp
    src/core/schedulers/edf.cpp
    src/core/schedulers/rr.cpp
)

# including the include/ directory
target_include_directories(core_engine PUBLIC include)

# ---------------------------------------------------------
# WEBASSEMBLY BINDINGS: Only relevant when converting to WebAssembly (Emscripten Specific)
# ---------------------------------------------------------
if (EMSCRIPTEN)
    # main api file that handles js<->wasm communication
    add_executable(wasm_module src/bindings/api.cpp)

    # make the binding between api and core cpp files
    target_link_libraries(wasm_module PRIVATE core_engine)

    target_link_options(wasm_module PRIVATE
        "--bind"
        "-sWASM=1"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME='createModule'"
        "-sALLOW_MEMORY_GROWTH=1"
    )

    set_target_properties(wasm_module PROPERTIES
        RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/public/wasm"
        OUTPUT_NAME "module"
        SUFFIX ".js"
    )

else()
    # ---------------------------------------------------------
    # NATIVE BUILD (Terminal App & Catch2 Tests)
    # ---------------------------------------------------------

        option(BUILD_TESTS "Build Catch2 unit tests" OFF)

        # Terminal app
    add_executable(cli_app src/cli/main.cpp)
    target_link_libraries(cli_app PRIVATE core_engine)
    set_target_properties(cli_app PROPERTIES
        RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/bin"
    )

        # Optionally add Catch2-based native test executable
        if (BUILD_TESTS)
            include(FetchContent)
            FetchContent_Declare(
                Catch2
                GIT_REPOSITORY https://github.com/catchorg/Catch2.git
                GIT_TAG        v3.5.2
            )
            FetchContent_MakeAvailable(Catch2)

            add_executable(core_tests tests/test_scheduler.cpp)
            target_link_libraries(core_tests PRIVATE core_engine Catch2::Catch2WithMain)
        endif()

endif()