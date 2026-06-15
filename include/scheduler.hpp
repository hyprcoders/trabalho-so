#pragma once
#include <types.hpp>

class AbstractScheduler {
protected:
    int quantum;
    int switchingTime;
    int seed;
    std::optional<int> diskCost;
    std::optional<float> temperature;
    std::vector<Process> processes;
public:
    AbstractScheduler(const ScheduleConfiguration &config);

    virtual ~AbstractScheduler() = default;

    virtual ExecutionSchedule execute() = 0;
};

class FIFOScheduler: public AbstractScheduler {
public:
    FIFOScheduler(const ScheduleConfiguration &config);
    ExecutionSchedule execute();
};