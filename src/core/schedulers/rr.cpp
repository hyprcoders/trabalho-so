#include "types.hpp"
#include "scheduler.hpp"
#include "utils.hpp"

#include <vector>
#include <queue>

RRScheduler::RRScheduler(const ScheduleConfiguration &config): AbstractScheduler(config) {}

ExecutionSchedule RRScheduler::execute() {
    ExecutionSchedule schedule(0.0,0,0,{}); // last parameter is cnt of tardy processes

    size_t n = processes.size();

    std::vector<ExecutionBlock> execution;
    execution.reserve(n);
    std::vector<size_t> order = orderOfArrival(processes);
    std::vector<float> remaingTime(n);
    for(size_t i = 0; i < n; ++i)
        remaingTime[i] = processes[i].executionTime;

    float lastEndTime = 0, nextArrivalTime = 0;
    int nextIndex = 0, toadd = -1;
    std::queue<size_t> next;

    while(nextIndex < n || next.size()) {
        while(nextIndex < n && processes[order[nextIndex]].arrivalTime <= lastEndTime + EPSILON) {
            next.emplace(order[nextIndex]);
            ++nextIndex;
        }

        if(toadd>=0) {
            next.emplace(toadd);
            toadd = -1;
        }

        if(next.empty()) {
            nextArrivalTime = processes[order[nextIndex]].arrivalTime;
        }else {
            auto current = next.front();
            next.pop();
            const Process &process = processes[current];
            if(switchingTime > EPSILON && execution.size() && execution.back().id != process.id && remaingTime[execution.back().id]>EPSILON) {
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
            float deltaT = std::min(quantum,remaingTime[current]);

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

            remaingTime[current] -= deltaT;
            float end = endTime(execution.back());
            lastEndTime = nextArrivalTime = end; 
            
            if(remaingTime[current] <= EPSILON)
                schedule.turnaroundTime += end - process.arrivalTime;
            else
                toadd = current;
        }  
    }

    schedule.turnaroundTime /= n;
    schedule.execution = std::move(execution);

    return schedule;
}