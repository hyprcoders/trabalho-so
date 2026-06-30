#include "types.hpp"
#include "scheduler.hpp"


ExecutionSchedule schedule(const ScheduleConfiguration& config) {
    ExecutionSchedule execution;
    
    using SA = SchedulingAlgorithm;
    switch (config.schedulingAlgorithm) {
    case SA::FIFO:
        execution = FIFOScheduler(config).execute();
        break;
    case SA::SJF:
        execution = SJFScheduler(config).execute();
        break;
    case SA::SRTF:
        execution = SRTFScheduler(config).execute();
        break;
    case SA::RR:
        execution = RRScheduler(config).execute();
        break;
    case SA::HPF:
        execution = HPFScheduler(config).execute();
        break;
    case SA::EDF:
        execution = EDFScheduler(config).execute();
        break;
    case SA::CFSS:
        execution = CFSSimScheduler(config).execute();
        break;
    case SA::FPET:
        execution = FPETScheduler(config).execute();
        break;
    case SA::MHPET:
        execution = MHPETScheduler(config).execute();
        break;
    default:    
        break;
    }

    return execution;
}
