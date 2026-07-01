#pragma once
#include <vector>
#include <unordered_map>

#include "types.hpp"

constexpr float EPSILON = 1e-6; 

float endTime(const ExecutionBlock &exec);

std::vector<size_t> orderOfArrival(const std::vector<Process> &processes);

std::unordered_map<int,size_t> mapIdToIndex(const std::vector<Process> &processes);
