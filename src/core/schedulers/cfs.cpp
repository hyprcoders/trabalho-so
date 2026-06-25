#include "types.hpp"
#include "scheduler.hpp"
#include "utils.hpp"

#include <vector>
#include <queue>


CFSSimScheduler::CFSSimScheduler(const ScheduleConfiguration &config): AbstractScheduler(config) {}

/** weight(p) = 1.25^(p-1) */
float weight(int priority) {
    float result = 1, base = 1.25;
    --priority;
    // Binary exponentiation for fast exponention in O(log (priority))
    while(priority>0) {
        if(priority&1)
            result*=base;
        base*=base;
        priority>>=1;
    }
    return result;
}

struct virtualJob {
    int index;
    int priority;
    float vtime;
    bool operator<(const virtualJob &a) const {
        return std::tie(vtime, priority, a.index) > std::tie(a.vtime, a.priority, index);
    }
    virtualJob &addTime(float time) {
        vtime += time * weight(priority);
        return *this;
    }
};

ExecutionSchedule CFSSimScheduler::execute() {
    ExecutionSchedule schedule(0.0,0,0,{});

    size_t n = processes.size();

    std::vector<ExecutionBlock> execution;
    execution.reserve(n);
    std::vector<size_t> order = orderOfArrival(processes);
    std::vector<float> remaingTime(n);
    for(size_t i = 0; i < n; ++i)
        remaingTime[i] = processes[i].executionTime;

    float lastEndTime = 0, nextArrivalTime = 0;
    int nextIndex = 0;
    std::priority_queue<virtualJob> next;

    while(nextIndex < n || next.size()) {
        while(nextIndex < n && processes[order[nextIndex]].arrivalTime <= lastEndTime + EPSILON) {
            next.emplace(
                order[nextIndex],
                processes[order[nextIndex]].priority,
                processes[order[nextIndex]].arrivalTime
            );
            ++nextIndex;
        }

        if(next.empty()) {
            nextArrivalTime = processes[nextIndex].arrivalTime;
        }else {
            auto current = next.top();
            next.pop();
            const Process &process = processes[current.index];
            if(execution.size() && execution.back().id != process.id && remaingTime[execution.back().id]>EPSILON) {
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
            float deltaT = std::min(quantum, remaingTime[current.index]);
            if(nextIndex < n)
                deltaT = std::min(deltaT, processes[order[nextIndex]].arrivalTime - nextArrivalTime);
            deltaT = std::max(deltaT, 0.0F);
            if(execution.empty() || execution.back().id != process.id){
                execution.emplace_back(
                    process.id,
                    nextArrivalTime,
                    nextArrivalTime - lastEndTime,
                    deltaT,
                    ExecutionType::Executing
                );
                schedule.idleTime += execution.back().idleTime;
            }else {
                execution.back().duration += deltaT;
            }

            remaingTime[current.index] -= deltaT;
            lastEndTime = nextArrivalTime = endTime(execution.back()); 

            if(remaingTime[current.index] <= EPSILON)
                schedule.turnaroundTime += endTime(execution.back()) - process.arrivalTime;
            else
                next.emplace(current.addTime(deltaT));
        }  
    }

    schedule.turnaroundTime /= n;
    schedule.execution = std::move(execution);

    return schedule;
}