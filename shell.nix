{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  nativeBuildInputs = with pkgs; [
    cmake
    emscripten
    ninja 
    gcc   
    gdb
    python3
  ];

  shellHook = ''
    export EM_CACHE=$(pwd)/.emscripten_cache
    echo "Environment Loaded Successfully."
    echo "-----------------------------------"
    echo "Emscripten version: $(emcc --version | head -n 1)"
    echo "CMake version: $(cmake --version | head -n 1)"
    echo "-----------------------------------"
    echo "Commands:"
    echo "  Native : compileNative.sh"
    echo "  Wasm   : compileWasm.sh"
  '';

}