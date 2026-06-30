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

class RRScheduler: public AbstractScheduler {
public:
    /** @brief Scheduler using first-in, first-out order with preemption
     * 
     * The processes are processed in order of arrival, but only run in the cpu for a
     * slice of time equal to the quantum.
     * If the process dont finish, it will be put in the end of the queue.
     * All processes are put in the end of the queue as soon as they arrive.
     */
    RRScheduler(const ScheduleConfiguration &config);

    /**
     * @brief Executes the schedule using Round Robin ordering.
     * 
     * @return ExecutionSchedule containing the detailed execution
     */
    ExecutionSchedule execute();
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

class EDFScheduler: public AbstractScheduler {
public:
    /** @brief Scheduler using Earliest Deadline First priority
     * 
     * Processes are scheduler preemptively so that the process with 
     * earliest deadline will be executed first. 
     * Preemption ocurrs when a new process is created and its deadline 
     * is earlier than the one of the current running process.
     */
    EDFScheduler(const ScheduleConfiguration &config);

    /**
     * @brief Executes the schedule using EDF ordering.
     *
     * @return ExecutionSchedule containing the ordered execution timeline.
     */
    ExecutionSchedule execute();
};

class CFSSimScheduler: public AbstractScheduler {
public:
    /** @brief Scheduler using Completely Fair Scheduler - Simplified algorithm
     * 
     * Processes are scheduled preemptively so that all of them get a 
     * fair share of cpu time.
     * This is ensured through the use of virtual runtimes (vtimes)
     * that say how many time has the processes been executing.
     * After a granular amount of time (taken as the quantum) the scheduler 
     * will check for the process with the least vtime and if it is less than
     * the running one, then preemption happens.
     * The initial vtime of a process is its arrival time and it then
     * goes up by the tame it was in the cpu times a weght function that grows
     * exponentialy with the priority value (higher equals less priority).
     */
    CFSSimScheduler(const ScheduleConfiguration &config);

    /**
     * @brief Executes the schedule using CFS-Sim ordering.
     *
     * @return ExecutionSchedule containing the ordered execution timeline.
     */
    ExecutionSchedule execute();
};

class EAScheduler: public AbstractScheduler {
public:
    EAScheduler(const ScheduleConfiguration &config);
protected:
    std::vector<float> timeTable(const std::vector<int> &order);
    float getValue(const std::vector<float> &pushs);
};

class FPEAScheduler: public EAScheduler {
public:
    /** @brief Scheduler that minimizes earliness and tardiness for a fixed permutation of processes
     * 
     * Earliness is the max(0, deadline - end).
     * 
     * Tardiness is the max(0, end - deadline).
     * 
     * For a fixed permutation, this scheduler first schedule all jobs as early as possible
     * and then applies a greedy right to left push until the sum of Earliness and Tardiness
     * is minimized.
     */
    FPEAScheduler(const ScheduleConfiguration &config);

    /**
     * @brief Returns the execution of the process that minimizes earliness and taridness for a fixed permutation.
     *
     * @return ExecutionSchedule containing the ordered execution timeline.
     */
    ExecutionSchedule execute();
};

// class PEAScheduler: public EAScheduler {
// public:
//     /** @brief Scheduler using permutational earliness and tardiness algorithm
//      * 
//      */
//     PEAScheduler(const ScheduleConfiguration &config);

//     ExecutionSchedule execute();
// };