#include "scheduler.hpp"
#include "types.hpp"
#include "utils.hpp"

#include <vector>
#include <numeric>
#include <queue>
#include <stack>
#include <random>


EAScheduler::EAScheduler(const ScheduleConfiguration &config): AbstractScheduler(config) {}
FPETScheduler::FPETScheduler(const ScheduleConfiguration &config): EAScheduler(config) {}
MHPETScheduler::MHPETScheduler(const ScheduleConfiguration &config): EAScheduler(config) {}

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

float EAScheduler::getValue(const std::vector<float> &pushs, const std::vector<int> &order) {
    size_t n = processes.size();

    float lastPush = 0.0f, lastEndTime = 0.0f, base = 0.0f;
    float earliness = 0.0f, tardiness = 0.0f;

    for(size_t i = 0; i < n; ++i) {
        lastPush = std::max(lastPush, pushs[order[i]]);
        float start = base + lastPush;
        base += processes[order[i]].executionTime;
        lastEndTime = start + processes[order[i]].executionTime;
        earliness += std::max(0.0f, processes[order[i]].deadline - lastEndTime);
        tardiness += std::max(0.0f, lastEndTime - processes[order[i]].deadline);
    }
    return earliness + tardiness;
}

ExecutionSchedule FPETScheduler::execute() {
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

struct Solution {
    std::vector<int> order;
    Solution() = default;
    Solution(size_t n): order(n) {
        std::iota(order.begin(),order.end(),0);
    }

    void getNeighbor(Solution &neighbor, std::mt19937 &rng) {
        std::copy(order.begin(), order.end(), neighbor.order.begin());
        std::uniform_int_distribution<int> choose(0, order.size()-1);
        int a = choose(rng);
        int b = choose(rng);
        std::swap(neighbor.order[a], neighbor.order[b]);
    }
};

bool MHPETScheduler::PAF(double current, double next, double temperature, std::mt19937 &rng) {
    double probability =  std::exp((current-next)/temperature);
    if(probability > 1) 
        return true;
    else {
        std::bernoulli_distribution d(probability); 
        return d(rng);
    }
}

std::vector<int> MHPETScheduler::simulatedAnnealing() {
    size_t n = processes.size();
    Solution sol(n);
    Solution bestSol = sol;
    Solution nextSol(n);
    std::mt19937 rng(seed);
    double temp = temperature.value();
    double decay = quantum;
    double totET = getValue(timeTable(sol.order), sol.order);
    double bestTot = totET;
    while(temp > 1) {
        sol.getNeighbor(nextSol, rng);
        double nextTot = getValue(timeTable(nextSol.order), nextSol.order);
        if(PAF(totET, nextTot, temp, rng)) {
            std::swap(sol, nextSol);
            totET = nextTot;
            if(totET < bestTot) {
                bestTot = totET;
                bestSol = sol;
            }
        }
        temp *= quantum;
    }
    return bestSol.order;
}

ExecutionSchedule MHPETScheduler::execute() {
    ExecutionSchedule schedule(0.0f,0,0,{});

    size_t n = processes.size();

    std::vector<ExecutionBlock> execution;
    execution.reserve(n);

    std::vector<int> order = simulatedAnnealing();
    std::vector<float> pushs = timeTable(order);

    float lastPush = 0.0f, lastEndTime = 0.0f, base = 0.0f;
    float earliness = 0.0f, tardiness = 0.0f;

    for(size_t i = 0; i < n; ++i) {
        lastPush = std::max(lastPush, pushs[order[i]]);
        float start = base + lastPush;
        execution.emplace_back(
            processes[order[i]].id,
            start,
            start - lastEndTime,
            processes[order[i]].executionTime,
            ExecutionType::Executing
        );
        schedule.idleTime += execution.back().idleTime;
        base += processes[order[i]].executionTime;
        lastEndTime = start + processes[order[i]].executionTime;
        earliness += std::max(0.0f, processes[order[i]].deadline - lastEndTime);
        tardiness += std::max(0.0f, lastEndTime - processes[order[i]].deadline);
    }

    schedule.earliness = earliness;
    schedule.tardiness = tardiness;
    schedule.execution = execution;

    return schedule;
}
