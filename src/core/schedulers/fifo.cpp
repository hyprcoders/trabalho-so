#include <algorithm>
#include <vector>
#include <numeric>

#include "scheduler.hpp"
#include "types.hpp"
#include "utils.hpp"


FIFOScheduler::FIFOScheduler(const ScheduleConfiguration &config): AbstractScheduler(config) { }

ExecutionSchedule FIFOScheduler::execute() {
    ExecutionSchedule schedule = {0.0, 0, 0, {}};
    
    size_t n = processes.size();
    schedule.execution.reserve(n);
    std::vector<int> order(n);
    std::iota(order.begin(), order.end(), 0); // order={0..n-1}

    // Order of execution is based on order of arrival
    std::sort(order.begin(), order.end(),
        [this](const int first, const int second) { 
            return processes[first].arrivalTime < processes[second].arrivalTime 
                || (processes[first].arrivalTime == processes[second].arrivalTime && processes[first].id < processes[second].id); 
        }
    );

    int lastEndTime = 0;
    for(const auto &index : order) {
        schedule.execution.emplace_back(
            // Start when arrive or when the prevous process has ended
            std::max(lastEndTime, processes[index].arrivalTime),
            // The idle time will be the start times minus the lastEndTime
            std::max(0, processes[index].arrivalTime - lastEndTime),
            processes[index].executionTime,
            // There's no context switch or tardiness in FIFO
            ExecutionType::Executing
        );
        lastEndTime = endTime(schedule.execution.back());

        // turnaround = sum of times taken since each process arrives until it ends
        schedule.turnaroundTime += lastEndTime - processes[index].arrivalTime;
        schedule.idleTime += schedule.execution.back().idleTime;
    }

    return schedule;
}
