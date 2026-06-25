# ADR-02: Back-Front Communication Protocol

* **Issue**: How will the communication between back and front be structured? What fields should the process structure have and what other parameters will be received? What will be returned?
  
* **Decision**: Implement a structured communication protocol using C++ data structures (ScheduleConfiguration and ExecutionSchedule) that are serialized and transmitted between the JavaScript frontend and WebAssembly backend. The frontend sends a ScheduleConfiguration containing processes and scheduling parameters, and receives an ExecutionSchedule with execution results.

* **Status**: Decided and partially implemented.

* **Positions**: 
  - **Statefull C++ back-end**: C++ receives the data as it is inputed and expects the scheduling command. In this way, the front-end only shows the visuals and all state is kept in the back-end.
  - **Structured C++ Structs with Serialization (Selected)**: Type-safe communication using C++ structs that can be serialized (via Emscripten bindings) to JSON or other formats. This provides both type safety and reasonable serialization efficiency while maintaining clarity.

* **Argument**: Using structured C++ structs provides type safety and prevents serialization errors at compile time. The approach leverages Emscripten's ability to automatically generate bindings for C++ types, reducing manual marshalling code. This design integrates naturally with the WASM backend decision (ADR-01), allowing the same struct definitions to be used in both native and WebAssembly builds. The structure enables future flexibility in serialization format (JSON, Protocol Buffers, or binary) without changing the API contract.

* **Implications**: 
  - Requires careful definition and maintenance of struct contracts between backend and frontend to ensure compatibility.
  - Emscripten bindings must be properly configured in `src/bindings/api.cpp` to expose the scheduling function and its data structures to JavaScript.
  - The JavaScript frontend must correctly serialize/deserialize these structures when communicating with the WebAssembly module.
  - Changes to struct definitions require recompilation of the WASM module.
  - Allows seamless code reuse between native CLI applications (using C++ directly) and web applications (via WASM).

* **Notes**:
  * **Input Structure (ScheduleConfiguration)**: Contains quantum (for preemptness), switchingTime, seed, scheduling algorithm choice, list of Process objects, and optional disk cost and temperature parameters.
  * **Process Structure**: Each process has id, arrivalTime, deadline, executionTime, priority, and optional pageCount for paging support.
  * **Output Structure (ExecutionSchedule)**: Returns turnaroundTime, idleTime, context switch count, and a vector of ExecutionBlock objects detailing the schedule.
  * **ExecutionBlock**: Represents a time interval with startTime, idleTime, duration, and ExecutionType (Executing, Switching, or Tardy).
  * **Implementation**: The `schedule()` function in `include/types.hpp` is the main API contract. It must be properly exposed via Emscripten bindings in `src/bindings/api.cpp`.
  * The same types are used by the CLI application (`src/cli/main.cpp`), ensuring code consistency across deployment targets. 