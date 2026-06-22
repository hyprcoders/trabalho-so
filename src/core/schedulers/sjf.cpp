#include <vector>
#include <queue>

#include "scheduler.hpp"
#include "types.hpp"
#include "utils.hpp"


SJFScheduler::SJFScheduler(const ScheduleConfiguration &config): AbstractScheduler(config) { }
SRTFScheduler::SRTFScheduler(const ScheduleConfiguration &config): AbstractScheduler(config) { }

using SJob = ShortJob;

bool SJob::operator<(const SJob &other) const {
    return std::tie(duration, index) > std::tie(other.duration, other.index);
}

ExecutionSchedule SJFScheduler::execute() {
    ExecutionSchedule schedule = {0.0, 0, 0, {}};
    
    size_t n = processes.size();
    schedule.execution.reserve(n);
    std::vector<size_t> order = orderOfArrival(processes);

    int lastEndTime = 0, nextArrivalTime = 0;
    int nextIndex = 0;
    std::priority_queue<SJob> next;
    while(nextIndex < n || next.size()) {
        // Processes that have reached while the last process was processing
        while(nextIndex < n && processes[order[nextIndex]].arrivalTime <= lastEndTime) {
            next.emplace(processes[order[nextIndex]].executionTime, order[nextIndex]);
            ++nextIndex;
        }
        if(next.empty()) {
            // Last process ended when no other process was waiting, but more will arrive later
            nextArrivalTime = processes[order[nextIndex]].arrivalTime;
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

    schedule.turnaroundTime /= n;

    return schedule;
}

ExecutionSchedule SRTFScheduler::execute() {
    ExecutionSchedule schedule = {0.0, 0, 0, {}};
    
    size_t n = processes.size();

    if(n==0)
        return schedule;

    std::vector<ExecutionBlock> execution;
    execution.reserve(n);
    std::vector<size_t> order = orderOfArrival(processes);

    int lastEndTime = 0, nextArrivalTime = 0;
    int nextIndex = 0;
    SJob current(0,-1);
    std::priority_queue<SJob> next;
    
    auto prepareForArrival = [
        &execution, &current, &nextIndex, &n,
        &nextArrivalTime, &lastEndTime, &schedule, this
    ]() {
        auto &b = execution.back(); 
        if(nextIndex < n && processes[nextIndex].arrivalTime < endTime(execution.back()))
            execution.back().duration -= endTime(execution.back()) - processes[nextIndex].arrivalTime;
        current.duration -= execution.back().duration;
        lastEndTime = nextArrivalTime = endTime(execution.back());
        if(current.duration==0) {
            schedule.turnaroundTime += endTime(execution.back()) - processes[current.index].arrivalTime;
        }
    };

    auto emplaceCurrent = [
        &execution, &current, &nextIndex, &n,
        &nextArrivalTime, &lastEndTime, &schedule, this,
        &prepareForArrival
    ]() {
        execution.emplace_back(
            processes[current.index].id,
            nextArrivalTime,
            nextArrivalTime - lastEndTime,
            current.duration,
            ExecutionType::Executing
        );
        schedule.idleTime += nextArrivalTime - lastEndTime;
        prepareForArrival();
    };

    while(nextIndex < n || next.size()) {
        // Processes that have reached while the last process was processing
        while(nextIndex < n && processes[order[nextIndex]].arrivalTime <= lastEndTime) {
            next.emplace(processes[order[nextIndex]].executionTime, order[nextIndex]);
            ++nextIndex;
        }
        if(current.duration==0) {
            if(next.empty()) {
                nextArrivalTime = processes[nextIndex].arrivalTime;
            }else {
                current = next.top();
                next.pop();
                emplaceCurrent();
            }
        }else {
            if(next.empty() || next.top().duration >= current.duration) {
                execution.back().duration += current.duration;
                prepareForArrival();
            }else {
                next.emplace(current);
                current = next.top();
                next.pop();
                execution.emplace_back(
                    execution.back().id,
                    lastEndTime,
                    0,
                    switchingTime,
                    ExecutionType::Switching
                );
                ++schedule.contextSwitches;
                lastEndTime = nextArrivalTime += switchingTime;
                emplaceCurrent();
            }
        }
    }

    schedule.turnaroundTime /= n;
    schedule.execution = std::move(execution);

    return schedule;
}