#include "types.hpp"

ExecutionSchedule schedule(const ScheduleConfiguration& config) {
    // TODO: Implement scheduling algorithms
    // Empty schedule
    return ExecutionSchedule{
        .turnaroundTime = 0.0f,
        .idleTime = 0,
        .contextSwitches = 0,
        .execution = {}
    };
}
