# Process Scheduler Simulator

This program has didactic purposes and is an evaluative work for the MATA58 - Operating Systems course at the Federal University of Bahia (UFBA).

## How to run the project

### with nix-shell - Linux/WSL/MacOS (recommended)

* **Requirements**: Nix package manager installed on your system.

1. Clone the repository and navigate to the project directory.
2. Run `nix-shell` to enter the development environment.

### without nix-shell - Linux/WSL/MacOS/Windows

* **Requirements**: CMake, Emscripten, Ninja, and a C++ compiler installed on your system.

### System independent steps

1. Use the provided scripts to compile the project:
    1. For Web Assembly: `./compileWasm.sh`
    2. For native binaries: `./compileNative.sh`
2. Run the program depending on your choice:
    1. For Web Assembly: open `public/index.html` in a browser or serve `public` with a local web server.
    2. For native execution: run `./bin/cli_app` after compiling native binaries.

## Project Structure

### Configuration and Setup

Files related to configuration, build and setup of the project. These are the least changed after the initial setup of the project.

- `shell.nix`
  - Nix shell configuration for reproducible development with `cmake`, `ninja`, `emscripten`, and `gcc`.
  - With Nix, you can create an encapsulated environment to run the project without poluting your whole system.
- `CMakeLists.txt`
  - Defines the CMake project, builds the `core_engine` static library, and creates either the native `cli_app` executable or the WebAssembly `wasm_module` depending on the build environment.
- `compileNative.sh`
  - Generates and builds the native CMake project in `build_native` using Ninja.
  - The generated binaries will be in the bin/ folder.
- `compileWasm.sh`
  - Generates and builds the Emscripten CMake project in `build_wasm` using Ninja.
  - The generated .js and .wasm will be in the public/wasm folder.
  - The generated code is modularized, so it can be imported in other js files with `import` keyword

### "Back-end" C++ code

.cpp and .hpp files with the core application logic. These files contains the main scheduler logic and its external interfaces.

- `include/`
  - Public headers exposed to the core engine and other components.
  - Includes types, schedulers and utils.
- `src/`
  - `core/`
    - Core scheduling engine implementation and algorithms.
    - `main.cpp` contains the core simulator logic reused by both native and Wasm builds.
    - `schedulers/` contains scheduler implementations such as FIFO and SJF.
  - `cli/`
    - Native terminal application entrypoint (`src/cli/main.cpp`).
  - `bindings/`
    - Emscripten-specific bindings for the web interface (`src/bindings/api.cpp`).

### "Front-end" HTML, CSS, JS code

Files associated with the web-page that will receive user data and consume the WASM api implemented in C++.

- `public/`
  - Front-end assets for the WebAssembly version.
  - `public/index.html` loads the generated Wasm module and JavaScript UI.
  - `public/wasm/` contains the Wasm output files after `compileWasm.sh` runs.

### Meta-documents

Documents that describe the project architecture and/or its decisions.

- `README.md` This file!
- `adrs/`
  - Architecture Decision Records for project design choices.

## Key concepts

- `core_engine` is the platform-independent scheduler engine compiled as a static library.
- `cli_app` is the native executable linking against `core_engine` for terminal use.
- The WebAssembly build uses `src/bindings/api.cpp` to expose the same core logic to the browser.
- The project separates implementation (`src/core/`), platform integration (`src/cli/`, `src/bindings/`), and public interface (`include/`, `public/`).

