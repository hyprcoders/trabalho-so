#pragma once
#include "types.hpp"

/**
 * @brief An abstract container for scheduling data to be scheduled by the function `execute`
 */
class AbstractScheduler {
protected:
    float quantum;
    float switchingTime;
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
    /**
     * @brief Scheduler using first-in, first-out ordering.
     *
     * Processes are executed in the order they arrive without preemption.
     */
    FIFOScheduler(const ScheduleConfiguration &config);

    /**
     * @brief Executes the schedule using FIFO ordering.
     *
     * @return ExecutionSchedule containing the ordered execution timeline.
     */
    ExecutionSchedule execute();
};


struct ShortJob {
    int duration;
    size_t index;
    bool operator<(const ShortJob &other) const;
};

class SJFScheduler: public AbstractScheduler {
public:
    /**
     * @brief Scheduler using shortest job first ordering.
     *
     * Processes are scheduled in non-decreasing order of durations without preemption.
     */
    SJFScheduler(const ScheduleConfiguration &config);

    /**
     * @brief Executes the schedule using SJF ordering.
     *
     * @return ExecutionSchedule containing the ordered execution timeline.
     */
    ExecutionSchedule execute();
};

class SRTFScheduler: public AbstractScheduler {
public:
    /**
     * @brief Scheduler using shortest remaining time first ordering.
     * 
     * Processes are selected by the shortest remaining time
     */
    SRTFScheduler(const ScheduleConfiguration &config);

    /**
     * @brief Executes the schedule using SRTF ordering.
     * 
     * @return ExecutionSchedule containing the detailed execution
     */
    ExecutionSchedule execute();
};


class HPFScheduler: public AbstractScheduler {
public:
    /**
     * @brief Scheduler using Highest Priority first ordering.
     *
     * Processes are scheduled preemptively so that the ones with highest priority are executed first
     * Processes with equal priorities are scheduled like in round robin, with a portion of time (quantum)
     *  being given to each one alternatively.
     */
    HPFScheduler(const ScheduleConfiguration &config);

    /**
     * @brief Executes the schedule using HPFS ordering.
     *
     * @return ExecutionSchedule containing the ordered execution timeline.
     */
    ExecutionSchedule execute();
};

class CFSSimScheduler: public AbstractScheduler {
    public:
    
    CFSSimScheduler(const ScheduleConfiguration &config);

    ExecutionSchedule execute();
};
