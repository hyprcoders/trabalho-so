#include "types.hpp"
#include "scheduler.hpp"
#include "utils.hpp"

#include <vector>
#include <queue>

EDFScheduler::EDFScheduler(const ScheduleConfiguration &config): AbstractScheduler(config) {}

struct RealTimeProcess {
    int index;
    float deadline;
    bool operator<(const RealTimeProcess &a) const {
        return std::tie(deadline, index) > std::tie(a.deadline, a.index);
    }
};

using RTProcess = RealTimeProcess;

ExecutionSchedule EDFScheduler::execute() {
    ExecutionSchedule schedule(0.0,0,0,{},0); // last parameter is cnt of tardy processes

    size_t n = processes.size();

    std::vector<ExecutionBlock> execution;
    execution.reserve(n);
    std::vector<size_t> order = orderOfArrival(processes);
    auto idToIndex = mapIdToIndex(processes);
    std::vector<float> remaingTime(n);
    for(size_t i = 0; i < n; ++i)
        remaingTime[i] = processes[i].executionTime;

    float lastEndTime = 0, nextArrivalTime = 0;
    int nextIndex = 0;
    std::priority_queue<RTProcess> next;

    while(nextIndex < n || next.size()) {
        while(nextIndex < n && processes[order[nextIndex]].arrivalTime <= nextArrivalTime + EPSILON) {
            next.emplace(
                order[nextIndex],
                processes[order[nextIndex]].deadline
            );
            ++nextIndex;
        }

        if(next.empty()) {
            nextArrivalTime = processes[order[nextIndex]].arrivalTime;
        }else {
            auto current = next.top();
            next.pop();
            const Process &process = processes[current.index];
            if(
                switchingTime > EPSILON 
                && execution.size() 
                && execution.back().id != process.id 
                && remaingTime[idToIndex[execution.back().id]]>EPSILON
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
            float deltaT = remaingTime[current.index];
            if(nextIndex < n)
                deltaT = std::min(deltaT, processes[order[nextIndex]].arrivalTime - nextArrivalTime);
            deltaT = std::max(deltaT, 0.0F);
            if(deltaT <= EPSILON)
                continue;
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
            float end = endTime(execution.back());
            lastEndTime = nextArrivalTime = end; 

            if(end > process.deadline && execution.back().type != ExecutionType::Tardy) {
                if(execution.back().startTime + EPSILON >= process.deadline) {
                    execution.back().type = ExecutionType::Tardy;
                }else {
                    float tardyTime = end - process.deadline;
                    execution.back().duration -= tardyTime;
                    execution.emplace_back(
                        process.id,
                        endTime(execution.back()),
                        0,
                        tardyTime,
                        ExecutionType::Tardy
                    );
                }
            }
            
            if(remaingTime[current.index] <= EPSILON) {
                schedule.turnaroundTime += end - process.arrivalTime;
                schedule.tardyCnt = schedule.tardyCnt.value() + (end > process.deadline);
            }else
                next.emplace(current);
        }  
    }

    schedule.turnaroundTime /= n;
    schedule.execution = std::move(execution);

    return schedule;

}