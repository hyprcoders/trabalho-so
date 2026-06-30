#include <emscripten/bind.h>
#include "types.hpp"

using namespace emscripten;

EMSCRIPTEN_BINDINGS(scheduling) {
    enum_<ExecutionType>("ExecutionType")
        .value("Executing", ExecutionType::Executing)
        .value("Switching", ExecutionType::Switching)
        .value("Tardy", ExecutionType::Tardy);
    
    enum_<SchedulingAlgorithm>("SchedulingAlgorithm")
        .value("FIFO", SchedulingAlgorithm::FIFO)
        .value("SJF", SchedulingAlgorithm::SJF)
        .value("SRTF", SchedulingAlgorithm::SRTF)
        .value("RR", SchedulingAlgorithm::RR)
        .value("EDF", SchedulingAlgorithm::EDF)
        .value("HPF", SchedulingAlgorithm::HPF)
        .value("CFSS", SchedulingAlgorithm::CFSS)
        .value("FPEA", SchedulingAlgorithm::FPEA)
        .value("MHPEA", SchedulingAlgorithm::MHPEA);

    register_vector<Process>("VectorProcess");
    register_vector<ExecutionBlock>("VectorExecutionBlock");

    register_optional<int>();
    register_optional<float>();

    value_object<Process>("Process")
        .field("id", &Process::id)
        .field("arrivalTime", &Process::arrivalTime)
        .field("deadline", &Process::deadline)
        .field("executionTime", &Process::executionTime)
        .field("priority", &Process::priority)
        .field("pageCount", &Process::pageCount);

    value_object<ScheduleConfiguration>("ScheduleConfiguration")
        .field("quantum", &ScheduleConfiguration::quantum)
        .field("switchingTime", &ScheduleConfiguration::switchingTime)
        .field("seed", &ScheduleConfiguration::seed)
        .field("schedulingAlgorithm", &ScheduleConfiguration::schedulingAlgorithm)
        .field("diskCost", &ScheduleConfiguration::diskCost)
        .field("temperature", &ScheduleConfiguration::temperature)
        .field("processes", &ScheduleConfiguration::processes);

    value_object<ExecutionBlock>("ExecutionBlock")
        .field("id", &ExecutionBlock::id)
        .field("startTime", &ExecutionBlock::startTime)
        .field("idleTime", &ExecutionBlock::idleTime)
        .field("duration", &ExecutionBlock::duration)
        .field("type", &ExecutionBlock::type);
    
    value_object<ExecutionSchedule>("ExecutionSchedule")
        .field("turnaroundTime", &ExecutionSchedule::turnaroundTime)
        .field("idleTime", &ExecutionSchedule::idleTime)
        .field("contextSwitches", &ExecutionSchedule::contextSwitches)
        .field("execution", &ExecutionSchedule::execution)
        .field("tardyCnt", &ExecutionSchedule::tardyCnt)
        .field("earliness", &ExecutionSchedule::earliness)
        .field("tardiness", &ExecutionSchedule::tardiness);

    function("schedule", &schedule);
}