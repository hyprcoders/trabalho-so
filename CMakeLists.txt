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
    src/core/main.cpp
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

# ---------------------------------------------------------
# NATIVE TERMINAL BUILD (GCC/Clang/MSVC)
# ---------------------------------------------------------
else()
    # simply compile cli/main.cpp as a terminal app
    add_executable(cli_app src/cli/main.cpp)
    
    # make the binding between cli and core cpp files
    target_link_libraries(cli_app PRIVATE core_engine)
    
    # Puts result in bin/ directory
    set_target_properties(cli_app PROPERTIES
        RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/bin"
    )
endif()