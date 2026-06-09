rm -rf build_wasm
emcmake cmake -B build_wasm -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build_wasm