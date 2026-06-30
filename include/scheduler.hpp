#pragma once
#include "types.hpp"
#include <vector>
#include <random>

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
    /** @brief Gives the pushes of the processes in order `order` to minimize sum of earlines and tardiness
     * 
     * @returns A vector `push`, in which `push[order[i]]` is how much the job in `order[i]` should be pushed
     * in the optimal scheduling after being in its As Early As Possible state.. 
     */
    std::vector<float> timeTable(const std::vector<int> &order);

    /** @brief Calulates the sum of earliness and tardiness in the optimal schedule 
     * 
     * @returns the sum of earlines and tardiness in the optimal schduler for order `order` and pushes `pushs`
     */
    float getValue(const std::vector<float> &pushs, const std::vector<int> &order);
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

class MHPEAScheduler: public EAScheduler {
public:
    /** @brief Scheduler using a meta-heuristic for permutational earliness and tardiness scheduling problem
     * 
     * Uses simulated annealing to try and found the best order of process to be scheduled non-preemptively.
     * 
     * The temperature parameter in the configurations is used for the intial temperature of the annealing
     * and the value of the quantum is used as decay. The given seed is used to generate random values.
     * 
     * The value of an order of processes is the sum of earliness and tardiness in the optimal timetabled schedule
     * of this order. This value can be calculated exactly with a polynomial time algorithm used in FPEA scheduler
     * ans is calculated for each random neighbor solution (order).
     * 
     * Given that a new solution has value V and the current has value C and the current temperature is T,
     * a function PAF(C,V,T) is used as a probabilistic acceptance function which returns a boolean
     * to indicate if the new solution should replace the current one. If the new solution has a better
     * (smaller) value, the it should always be yes. Otherwise, the higher is T, the higher should be the
     * probability of acceptance, and the lower is T, the lower should be this probability.
     */
    MHPEAScheduler(const ScheduleConfiguration &config);

    /**
     * @brief Returns the execution of the process that minimizes earliness and taridness for the best found order.
     *
     * @return ExecutionSchedule containing the ordered execution timeline.
     */
    ExecutionSchedule execute();
protected:
    /**
     * @brief Probabilistic acceptance function that says if the new solution shoul replace the current one
     * 
     * @param current: (C) the value of the current solution
     * @param next: (N) the value of the next solution
     * @param temperature: (T) the current temperature
     * @param rng: a random number generator
     * 
     * @returns It should return true with a probability of e^((C-N)/T).
     * If N <= C, it always returns true. 
     * Otherwise, the probability decreases as T decreases.
     */
    bool PAF(double current, double next, double temperature, std::mt19937 &rng);

    /** @brief Executes the simulated annealing with the given parameters and try finding the best order
     * 
     * @returns The best order found by the meta-heuristic
     */
    std::vector<int> simulatedAnnealing();
};