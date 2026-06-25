#include "types.hpp"
#include "scheduler.hpp"
#include "utils.hpp"

#include <vector>
#include <queue>

HPFScheduler::HPFScheduler(const ScheduleConfiguration &config): AbstractScheduler(config) {}

struct PriorityJob {
    int priority;
    int used; // Used to simulate a queue inside the priority queue for each priority value
    int index;
    float duration;

    bool operator<(const PriorityJob &a) const {
        return priority < a.priority 
            || (priority == a.priority && std::tie(used, index) > std::tie(a.used, a.index)); 
    }
};

using PJob = PriorityJob;

ExecutionSchedule HPFScheduler::execute() {
    ExecutionSchedule schedule(0.0,0,0,{});

    size_t n = processes.size();

    std::vector<ExecutionBlock> execution;
    execution.reserve(n);
    std::vector<size_t> order = orderOfArrival(processes);
    std::vector<size_t> remaingTime(n);
    for(size_t i = 0; i < n; ++i)
        remaingTime[i] = processes[i].executionTime;

    float lastEndTime = 0, nextArrivalTime = 0;
    int nextIndex = 0, now = 0;
    std::priority_queue<PJob> next;
    
    while(nextIndex < n || next.size()) {
        while(nextIndex < n && processes[order[nextIndex]].arrivalTime <= lastEndTime) {
            next.emplace(
                processes[order[nextIndex]].priority,
                now++,
                order[nextIndex],
                processes[order[nextIndex]].executionTime
            );
            ++nextIndex;
        }

        if(next.empty()) {
            nextArrivalTime = processes[nextIndex].arrivalTime;
        }else {
            auto current = next.top();
            next.pop();
            if(
                execution.size() 
                && execution.back().id != processes[current.index].id 
                && remaingTime[execution.back().id]
            ) {
                execution.emplace_back(
                    execution.back().id,
                    lastEndTime,
                    0,
                    switchingTime,
                    ExecutionType::Switching
                );
                ++schedule.contextSwitches;
                lastEndTime = nextArrivalTime += switchingTime;
            }
            float executeTime = std::min(current.duration, quantum);

            while(
                nextIndex < n 
                && processes[order[nextIndex]].arrivalTime <= lastEndTime + executeTime
            ) {
                next.emplace(
                    processes[order[nextIndex]].priority,
                    now++,
                    order[nextIndex],
                    processes[order[nextIndex]].executionTime
                );
                ++nextIndex;
                if(next.top().priority > current.priority) {
                    executeTime = std::min(
                        executeTime, 
                        processes[next.top().index].arrivalTime - lastEndTime
                    );
                }
            }

            if(executeTime > 0) {
                const Process &process = processes[current.index];
                if(execution.empty() || execution.back().id != process.id) {
                    execution.emplace_back(
                        process.id,
                        nextArrivalTime,
                        nextArrivalTime - lastEndTime,
                        executeTime,
                        ExecutionType::Executing
                    );
                }else {
                    execution.back().duration += executeTime;
                }
                remaingTime[current.index] -= executeTime;
                int end = endTime(execution.back());
                if(remaingTime[current.index] == 0) {
                    schedule.turnaroundTime += end - process.arrivalTime;
                }else {
                    next.emplace(
                        process.priority,
                        now++,
                        current.index,
                        current.duration - executeTime
                    );
                }
                lastEndTime = nextArrivalTime += executeTime;
            }
        }
    }

    schedule.turnaroundTime /= n;
    schedule.execution = std::move(execution);

    return schedule;
}