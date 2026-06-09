# Process Scheduler Simulator

This program has didactic purposes and is an evaluative work for the MATA58 - Operating Systems course at the Federal University of Bahia (UFBA).

## How to run the project

### with nix-shell - Linux/WSL/MacOS (recommended)

* **Requirements**: Nix package manager installed on your system.

1. Clone the repository and navigate to the project directory.
2. Run `nix-shell` to enter the development environment.

### without nix-shell - Linux/WSL/MacOS/Windows

* **Requirements**: CMake, Emscripten, and a C++ compiler installed on your system.

### System independent steps

1. Use the provided scripts to compile the project:
    1. For Web Assembly: `./compileWasm.sh`
    2. For native binaries: `./compileNative.sh`
2. Run the program depending on your choice:
    1. For Web Assembly: Either open `public/index.html` in a web browser or use a local server (ex. vscode live-server) to serve the `public` directory.
    2. Run in a terminal: `./bin/scheduler` (after compiling native binaries).
