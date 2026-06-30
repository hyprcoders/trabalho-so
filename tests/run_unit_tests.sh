#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INCLUDE="$ROOT/include"
SRC="$ROOT/src/core"
OUT="$ROOT/tests/unit_tests"

mkdir -p "$ROOT/tests"

echo "Building unit tests with CMake..."

if ! command -v cmake >/dev/null 2>&1; then
    echo "cmake not found." >&2
    exit 1
fi

BUILD_DIR="$ROOT/build_unit_tests"
mkdir -p "$BUILD_DIR"

# Ensure tests are enabled when configuring this build directory
cmake -S "$ROOT" -B "$BUILD_DIR" -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTS=ON
cmake --build "$BUILD_DIR" --target core_tests --parallel

TEST_EXEC="$BUILD_DIR/core_tests"
if [ ! -x "$TEST_EXEC" ]; then
    TEST_EXEC=$(find "$BUILD_DIR" -type f -name "core_tests" -executable | head -n1 || true)
fi

if [ -z "$TEST_EXEC" ]; then
    echo "Failed to locate core_tests executable" >&2
    exit 1
fi

echo "Running $TEST_EXEC"
"$TEST_EXEC"

echo "Done."
