#include "types.hpp"
#include "utils.hpp"

int endTime(const ExecutionBlock &exec) {
    return exec.startTime + exec.duration;
}
