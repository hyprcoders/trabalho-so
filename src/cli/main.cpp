#include "types.hpp"
#include "scheduler.hpp"

#include <iostream>
#include <iomanip>
#include <limits>
#include <optional>
#include <sstream>
#include <string>

static void discardLine() {
    std::cin.ignore(std::numeric_limits<std::streamsize>::max(), '\n');
}

template <typename T = int>
static T promptInt(const std::string &label, T minValue = std::numeric_limits<T>::min(), T maxValue = std::numeric_limits<T>::max()) {
    while (true) {
        std::cout << label;
        T value;
        if (!(std::cin >> value)) {
            std::cout << "Invalid input. Please enter an integer.\n";
            std::cin.clear();
            discardLine();
            continue;
        }
        discardLine();
        if (value < minValue || value > maxValue) {
            std::cout << "Value must be between " << minValue << " and " << maxValue << ".\n";
            continue;
        }
        return value;
    }
}

static std::optional<int> promptOptionalInt(const std::string &label) {
    while (true) {
        std::cout << label;
        std::string line;
        std::getline(std::cin, line);
        if (line.empty()) {
            return std::nullopt;
        }
        std::istringstream iss(line);
        int value;
        if (iss >> value) {
            return value;
        }
        std::cout << "Invalid input. Please enter an integer or leave empty.\n";
    }
}

static SchedulingAlgorithm promptAlgorithm() {
	using SA = SchedulingAlgorithm;
    std::cout << "Select scheduling algorithm:\n";
    std::cout << "  1 - FIFO\n";
    std::cout << "  2 - SJF\n";
    std::cout << "  3 - SRTF\n";
    std::cout << "  4 - HPF\n";
    std::cout << "  5 - CFS-Sim\n";
    int choice = promptInt("Algorithm (1-5): ", 1, 5);
	switch (choice) {
	case 1:
		return SA::FIFO;
	case 2:
		return SA::SJF;
	case 3:
		return SA::SRTF;
    case 4:
        return SA::HPF;
    case 5:
        return SA::CFSS;
	}
}

static const char *executionTypeName(ExecutionType type) {
    switch (type) {
        case ExecutionType::Executing: return "Executing";
        case ExecutionType::Switching: return "Switching";
        case ExecutionType::Tardy: return "Tardy";
        default: return "Unknown";
    }
}

int main() {
    std::cout << "Process Scheduler CLI\n";
    std::cout << "--------------------\n";

    int processCount = promptInt("Number of jobs: ", 1);
    float quantum = promptInt<float>("Quantum: ", 0);
    float switchingTime = promptInt<float>("Switching time: ", 0);
    SchedulingAlgorithm algorithm = promptAlgorithm();

    ScheduleConfiguration config;
    config.quantum = quantum;
    config.switchingTime = switchingTime;
    config.seed = 0;
    config.schedulingAlgorithm = algorithm;
    config.diskCost = std::nullopt;
    config.temperature = std::nullopt;
    config.processes.clear();

    std::cout << "\nEnter process details:\n";
    for (int i = 0; i < processCount; ++i) {
        std::cout << "\nProcess " << (i + 1) << ":\n";
        Process process;
        process.id = promptInt("  id: ");
        process.arrivalTime = promptInt<float>("  arrival time: ", 0);
        process.deadline = promptInt<float>("  deadline: ", 0);
        process.executionTime = promptInt<float>("  execution time: ", 0.01);
        process.priority = promptInt("  priority: ", 0);
        process.pageCount = promptOptionalInt("  page count (leave empty if N/A): ");
        config.processes.push_back(process);
    }

    ExecutionSchedule scheduleResult = schedule(config);

    std::cout << "\nSchedule result:\n";
    std::cout << std::fixed << std::setprecision(2);
	std::cout << "  turnaround time: " << scheduleResult.turnaroundTime << "\n";
    std::cout << "  idle time: " << scheduleResult.idleTime << "\n";
    std::cout << "  context switches: " << scheduleResult.contextSwitches << "\n";
    std::cout << "  execution blocks: " << scheduleResult.execution.size() << "\n";

    for (size_t index = 0; index < scheduleResult.execution.size(); ++index) {
        const ExecutionBlock &block = scheduleResult.execution[index];
        std::cout << "    Block " << (index + 1) << ": id=" << block.id
                  << " start=" << block.startTime
                  << " duration=" << block.duration
                  << " idle=" << block.idleTime
                  << " type=" << executionTypeName(block.type)
                  << "\n";
    }

    return 0;
}
