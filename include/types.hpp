#pragma once
#include <vector>
#include <optional>

enum class ExecutionType {
    Executing,
    Switching,
    Tardy
};

enum class SchedulingAlgorithm {
    FIFO,
    SJF,
    SRTF,
    RR,
    EDF,
    HPF,
    CFSS
};

struct Process {
    int id;
    float arrivalTime;
    float deadline;
    float executionTime;
    int priority;
    std::optional<int> pageCount;
};

struct ScheduleConfiguration {
    float quantum;
    float switchingTime;
    int seed;
    SchedulingAlgorithm schedulingAlgorithm;
    std::optional<float> diskCost;
    std::optional<float> temperature;
    std::vector<Process> processes;
};

struct ExecutionBlock {
    int id;
    float startTime;
    float idleTime;
    float duration;
    ExecutionType type;
};

struct ExecutionSchedule {
    float turnaroundTime;
    float idleTime;
    int contextSwitches;
    std::vector<ExecutionBlock> execution;
    std::optional<int> tardyCnt;
};

ExecutionSchedule schedule(const ScheduleConfiguration& config);