#include "types.hpp"
#include "scheduler.hpp"


ExecutionSchedule schedule(const ScheduleConfiguration& config) {
    ExecutionSchedule execution;
    
    switch (config.schedulingAlgorithm) {
    case SchedulingAlgorithm::FIFO:
        execution = FIFOScheduler(config).execute();
        break;
    default:    
        break;
    }

    return execution;
}
