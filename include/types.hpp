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
    FCFS,
    SJF,
    SRTF,
    RR,
    EDF
};

struct Process {
    int id;
    int arrivalTime;
    int deadline;
    int executionTime;
    int priority;
    std::optional<int> pageCount;
};

struct ScheduleConfiguration {
    int quantum;
    int switchingTime;
    int seed;
    SchedulingAlgorithm schedulingAlgorithm;
    std::optional<int> diskCost;
    std::optional<float> temperature;
    std::vector<Process> processes;
};

struct ExecutionBlock {
    int startTime;
    int idleTime;
    int duration;
    ExecutionType type;
};

struct ExecutionSchedule {
    float turnaroundTime;
    int idleTime;
    int contextSwitches;
    std::vector<ExecutionBlock> execution;
};

ExecutionSchedule schedule(const ScheduleConfiguration& config);