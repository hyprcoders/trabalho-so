#pragma once
#include <vector>

#include "types.hpp"

float endTime(const ExecutionBlock &exec);

std::vector<size_t> orderOfArrival(const std::vector<Process> &processes);