#include <vector>
#include <queue>

#include "scheduler.hpp"
#include "types.hpp"
#include "utils.hpp"


SJFScheduler::SJFScheduler(const ScheduleConfiguration &config): AbstractScheduler(config) { }

using SJob = SJFScheduler::ShortJob;

bool SJob::operator<(const SJob &other) const {
    return std::tie(duration, index) > std::tie(other.duration, other.index);
}

ExecutionSchedule SJFScheduler::execute() {
    ExecutionSchedule schedule = {0.0, 0, 0, {}};
    
    size_t n = processes.size();
    schedule.execution.reserve(n);
    std::vector<size_t> order = orderOfArrival(processes);

    int lastEndTime = 0, nextArrivalTime = 0;
    int next_index = 0;
    std::priority_queue<SJob> next;
    while(next_index < order.size() || next.size()) {
        // Processes that have reached while the last process was processing
        while(next_index < order.size() && processes[order[next_index]].arrivalTime <= lastEndTime) {
            next.emplace(processes[order[next_index]].executionTime, order[next_index]);
            ++next_index;
        }
        if(next.empty()) {
            // Last process ended when no other process was waiting, but more will arrive later
            nextArrivalTime = processes[order[next_index]].arrivalTime;
        }else {
            // Take next process with the smalles duration
            auto [duration, index] = next.top();
            next.pop();
            schedule.execution.emplace_back(
                processes[index].id,
                nextArrivalTime,
                nextArrivalTime - lastEndTime,
                duration,
                ExecutionType::Executing
            );

            lastEndTime = nextArrivalTime += duration;

            schedule.turnaroundTime += lastEndTime - processes[index].arrivalTime;
            schedule.idleTime += schedule.execution.back().idleTime;
        }
    }

    schedule.turnaroundTime /= processes.size();
    
    return schedule;
}
