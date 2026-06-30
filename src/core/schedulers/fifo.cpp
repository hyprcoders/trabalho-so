#include <vector>

#include "scheduler.hpp"
#include "types.hpp"
#include "utils.hpp"


FIFOScheduler::FIFOScheduler(const ScheduleConfiguration &config): AbstractScheduler(config) { }

ExecutionSchedule FIFOScheduler::execute() {
    ExecutionSchedule schedule = {0.0, 0, 0, {}};
    
    size_t n = processes.size();
    schedule.execution.reserve(n);
    std::vector<size_t> order = orderOfArrival(processes);

    float lastEndTime = 0;
    for(const auto &index : order) {
        schedule.execution.emplace_back(
            processes[index].id,
            // Start when arrive or when the prevous process has ended
            std::max(lastEndTime, processes[index].arrivalTime),
            // The idle time will be the start times minus the lastEndTime
            std::max(0.0F, processes[index].arrivalTime - lastEndTime),
            processes[index].executionTime,
            // There's no context switch or tardiness in FIFO
            ExecutionType::Executing
        );
        lastEndTime = endTime(schedule.execution.back());

        // turnaround = sum of times taken since each process arrives until it ends
        schedule.turnaroundTime += lastEndTime - processes[index].arrivalTime;
        schedule.idleTime += schedule.execution.back().idleTime;
    }

    if(n > 0)
        schedule.turnaroundTime /= n;

    return schedule;
}
