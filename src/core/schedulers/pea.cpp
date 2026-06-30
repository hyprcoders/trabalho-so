#include "scheduler.hpp"
#include "types.hpp"
#include "utils.hpp"

#include <vector>
#include <numeric>
#include <queue>
#include <stack>


EAScheduler::EAScheduler(const ScheduleConfiguration &config): AbstractScheduler(config) {}
FPEAScheduler::FPEAScheduler(const ScheduleConfiguration &config): EAScheduler(config) {}


struct Block {
    int potential;
    float currPush;
    Block &operator+=(const Block &b) {
        potential += b.potential;
        currPush = b.currPush;
        return *this;
    }
};

std::vector<float> EAScheduler::timeTable(const std::vector<int> &order) {

    size_t n = processes.size();
    
    std::vector<float> initEarl(n), push(n);

    std::stack<Block> nextBlock;
    std::priority_queue<
        float, std::vector<float>, std::greater<float>
    > nextPush;
    float lastEndTime = 0;
    for (size_t i = 0; i < n; ++i) {
        lastEndTime += processes[order[i]].executionTime;
        initEarl[order[i]] = std::max(0.0f, processes[order[i]].deadline - lastEndTime);
    }
    
    for(int i = n-1; i >= 0; --i) {
        const Process &process = processes[order[i]];
        Block newBlock;
        if(nextBlock.empty() || nextBlock.top().currPush - EPSILON > initEarl[order[i]]) {
            newBlock.potential = -1;
            newBlock.currPush = initEarl[order[i]];
        }else {
            newBlock = nextBlock.top();
            nextBlock.pop();
            if(std::abs(initEarl[order[i]] - newBlock.currPush) <= EPSILON) {
                --newBlock.potential;
            }else {
                ++newBlock.potential;
                nextPush.emplace(initEarl[order[i]]);
            }

            while(newBlock.potential >= 0) {
                if(nextBlock.empty() || nextBlock.top().currPush - EPSILON > nextPush.top()) {
                    newBlock.currPush = nextPush.top();
                    nextPush.pop();
                    newBlock.potential -= 2;
                }else {
                    newBlock += nextBlock.top();
                    nextBlock.pop();
                }
            }
        }
        push[order[i]] = newBlock.currPush;
        nextBlock.emplace(newBlock);
    }
    return push;
} 

float EAScheduler::getValue(const std::vector<float> &pushs) {
    size_t n = processes.size();
    
    float lastPush = 0.0f, lastEndTime = 0.0f, base = 0.0f;
    float earliness = 0.0f, tardiness = 0.0f;

    for(size_t i = 0; i < n; ++i) {
        lastPush = std::max(lastPush, pushs[i]);
        float start = base + lastPush;
        base += processes[i].executionTime;
        lastEndTime = start + processes[i].executionTime;
        earliness += std::max(0.0f, processes[i].deadline - lastEndTime);
        tardiness += std::max(0.0f, lastEndTime - processes[i].deadline);
    }
    return earliness + tardiness;
}

ExecutionSchedule FPEAScheduler::execute() {
    ExecutionSchedule schedule(0.0f,0,0,{});

    size_t n = processes.size();

    std::vector<ExecutionBlock> execution;
    execution.reserve(n);
    std::vector<int> order(n);
    std::iota(order.begin(), order.end(), 0);
    std::vector<float> pushs = timeTable(order);

    float lastPush = 0.0f, lastEndTime = 0.0f, base = 0.0f;
    float earliness = 0.0f, tardiness = 0.0f;

    for(size_t i = 0; i < n; ++i) {
        lastPush = std::max(lastPush, pushs[i]);
        float start = base + lastPush;
        execution.emplace_back(
            processes[i].id,
            start,
            start - lastEndTime,
            processes[i].executionTime,
            ExecutionType::Executing
        );
        schedule.idleTime += execution.back().idleTime;
        base += processes[i].executionTime;
        lastEndTime = start + processes[i].executionTime;
        earliness += std::max(0.0f, processes[i].deadline - lastEndTime);
        tardiness += std::max(0.0f, lastEndTime - processes[i].deadline);
    }

    schedule.earliness = earliness;
    schedule.tardiness = tardiness;
    schedule.execution = execution;

    return schedule;
}