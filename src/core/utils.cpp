#include <algorithm>
#include <numeric>
#include <tuple>

#include "types.hpp"
#include "utils.hpp"

int endTime(const ExecutionBlock &exec) {
    return exec.startTime + exec.duration;
}

std::vector<size_t> orderOfArrival(const std::vector<Process> &processes) {
    std::vector<size_t> order(processes.size());
    std::iota(order.begin(), order.end(), 0);

    std::sort(order.begin(), order.end(),
        [&processes](const size_t first, const size_t second) {
            return std::tie(processes[first].arrivalTime, processes[first].id)
                <  std::tie(processes[second].arrivalTime, processes[second].id);
        }
    );

    return order;
}