#include "scheduler.hpp"
#include "types.hpp"

AbstractScheduler::AbstractScheduler(const ScheduleConfiguration &config)
    : quantum(config.quantum), switchingTime(config.switchingTime), seed(config.seed), 
        diskCost(config.diskCost), temperature(config.temperature), processes(config.processes) 
{ }