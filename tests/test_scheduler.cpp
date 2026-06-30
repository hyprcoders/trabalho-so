#include <catch2/catch_test_macros.hpp>
#include <catch2/catch_approx.hpp>
#include "types.hpp"

constexpr float EPSILON = 1e-4;

TEST_CASE("Scheduler basic properties", "[scheduler]") {
    ScheduleConfiguration cfg;
    cfg.quantum = 100.0f;
    cfg.switchingTime = 0.0f;
    cfg.seed = 0;

    SECTION("FIFO sums execution time") {
        cfg.schedulingAlgorithm = SchedulingAlgorithm::FIFO;
        Process p1{1, 0.0f, 0.0f, 1.0f, 1, std::nullopt};
        Process p2{2, 0.5f, 0.0f, 2.0f, 1, std::nullopt};
        cfg.processes = {p1, p2};

        auto res = schedule(cfg);
        float total = 0.0f;
        for (auto &b : res.execution) if (b.type == ExecutionType::Executing) total += b.duration;
        REQUIRE(total == Catch::Approx(3.0f).epsilon(EPSILON));
    }

    SECTION("SRTF preempts shortest remaining") {
        cfg.schedulingAlgorithm = SchedulingAlgorithm::SRTF;
        Process p1{1, 0.0f, 0.0f, 2.5f, 1, std::nullopt};
        Process p2{2, 1.0f, 0.0f, 1.0f, 1, std::nullopt};
        cfg.processes = {p1, p2};

        auto res = schedule(cfg);
        REQUIRE(res.execution.size() > 0);
        REQUIRE(res.execution.front().id == 1);
        REQUIRE(res.execution.front().duration == Catch::Approx(1.0f).epsilon(EPSILON));
    }

    SECTION("CFS total execution preserved") {
        cfg.schedulingAlgorithm = SchedulingAlgorithm::CFSS;
        Process p1{1, 0.0f, 0.0f, 1.0f, 1, std::nullopt};
        Process p2{2, 0.0f, 0.0f, 2.0f, 1, std::nullopt};
        cfg.processes = {p1, p2};

        auto res = schedule(cfg);
        float total = 0.0f;
        for (auto &b : res.execution) if (b.type == ExecutionType::Executing) total += b.duration;
        REQUIRE(total == Catch::Approx(3.0f).epsilon(EPSILON));
    }

    SECTION("SJF schedules shortest job first") {
        cfg.schedulingAlgorithm = SchedulingAlgorithm::SJF;
        Process p1{1, 0.0f, 0.0f, 3.0f, 1, std::nullopt};
        Process p2{2, 0.0f, 0.0f, 1.0f, 1, std::nullopt};
        cfg.processes = {p1, p2};

        auto res = schedule(cfg);
        REQUIRE(res.execution.size() > 0);
        REQUIRE(res.execution.front().id == 2);
        REQUIRE(res.execution.front().duration == Catch::Approx(1.0f).epsilon(EPSILON));
    }

    SECTION("HPF runs higher-priority (lower value) first") {
        cfg.schedulingAlgorithm = SchedulingAlgorithm::HPF;
        Process p1{1, 0.0f, 0.0f, 2.0f, 2, std::nullopt};
        Process p2{2, 0.0f, 0.0f, 1.0f, 1, std::nullopt};
        cfg.processes = {p1, p2};

        auto res = schedule(cfg);
        REQUIRE(res.execution.size() > 0);
        REQUIRE(res.execution.front().id == 2);
    }

    SECTION("EDF picks earliest deadline first") {
        cfg.schedulingAlgorithm = SchedulingAlgorithm::EDF;
        Process p1{1, 0.0f, 5.0f, 1.0f, 1, std::nullopt};
        Process p2{2, 0.0f, 2.0f, 1.0f, 1, std::nullopt};
        cfg.processes = {p1, p2};

        auto res = schedule(cfg);
        REQUIRE(res.execution.size() > 0);
        REQUIRE(res.execution.front().id == 2);
    }

    SECTION("RR rotates among processes with given quantum") {
        cfg.schedulingAlgorithm = SchedulingAlgorithm::RR;
        cfg.quantum = 1.0f;
        Process p1{1, 0.0f, 0.0f, 2.0f, 1, std::nullopt};
        Process p2{2, 0.0f, 0.0f, 1.0f, 1, std::nullopt};
        cfg.processes = {p1, p2};

        auto res = schedule(cfg);
        // Expect at least three execution blocks: p1, p2, p1
        std::vector<int> ids;
        for (auto &b : res.execution) if (b.type == ExecutionType::Executing) ids.push_back(b.id);
        REQUIRE(ids.size() >= 3);
        REQUIRE(ids[0] == 1);
        REQUIRE(ids[1] == 2);
        REQUIRE(ids[2] == 1);
    }
}
