import createModule from '../wasm/module.js';

document.addEventListener('DOMContentLoaded', () => {
    const processForm = document.getElementById('process-form');
    const processList = document.getElementById('process-list');
    const clearProcessesBtn = document.getElementById('clear-processes');
    const runSimulationBtn = document.getElementById('run-simulation');
    const algorithmSelect = document.getElementById('algorithm-select');
    const ganttChart = document.getElementById('gantt-chart');
    const statistics = document.getElementById('statistics');

    let processes = []; // Array to hold process data
    let Module; // To hold the Emscripten module instance

    // Initialize the Emscripten module
    createModule({
        locateFile: (path) => {
            if (path.endsWith('.wasm')) {
                return `wasm/${path}`;
            }
            return path;
        }
    }).then(instance => {
        Module = instance;
        console.log('WebAssembly module loaded successfully!');
        // You can now interact with your C++ functions via Module.cwrap or Module.ccall
        // For example, if you had a C++ function `int add(int a, int b)` exposed:
        // const add = Module.cwrap('add', 'number', ['number', 'number']);
        // console.log('1 + 2 =', add(1, 2));
    }).catch(e => {
        console.error('Failed to load WebAssembly module:', e);
    });

    // Function to render the current list of processes
    function renderProcesses() {
        processList.innerHTML = '';
        if (processes.length === 0) {
            processList.innerHTML = '<li>No processes added yet.</li>';
            return;
        }
        processes.forEach(p => {
            const li = document.createElement('li');
            li.textContent = `PID: ${p.pid}, Arrival: ${p.arrivalTime}, Burst: ${p.burstTime}, Priority: ${p.priority}`;
            processList.appendChild(li);
        });
    }

    // Event listener for adding a new process
    processForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const newProcess = {
            pid: parseInt(document.getElementById('pid').value),
            arrivalTime: parseInt(document.getElementById('arrivalTime').value),
            burstTime: parseInt(document.getElementById('burstTime').value),
            priority: parseInt(document.getElementById('priority').value) || 0 // Default to 0 if not provided
        };
        processes.push(newProcess);
        renderProcesses();
        // Increment PID for convenience
        document.getElementById('pid').value = newProcess.pid + 1;
        processForm.reset(); // Clear form fields except PID
    });

    // Event listener for clearing all processes
    clearProcessesBtn.addEventListener('click', () => {
        processes = [];
        renderProcesses();
        document.getElementById('pid').value = 1; // Reset PID
    });

    // Event listener for running the simulation
    runSimulationBtn.addEventListener('click', () => {
        if (!Module) {
            console.error('WebAssembly module not loaded yet.');
            return;
        }
        if (processes.length === 0) {
            alert('Please add some processes first!');
            return;
        }

        const selectedAlgorithm = algorithmSelect.value;
        console.log(`Running simulation with ${selectedAlgorithm} for processes:`, processes);

        // Transform processes to match the C++ Process struct using VectorProcess
        const transformedProcesses = new Module.VectorProcess();
        processes.forEach(p => {
            const process = {};
            process.id = p.pid;
            process.arrivalTime = p.arrivalTime;
            process.deadline = p.arrivalTime + p.burstTime;  // Set deadline to arrival + burst while theres no deadline field
            process.executionTime = p.burstTime;
            process.priority = p.priority;
            process.pageCount = null;
            transformedProcesses.push_back(process);
        });

        // Create ScheduleConfiguration
        const config = {
            quantum: 0,
            switchingTime: 0,
            seed: 0,
            schedulingAlgorithm: Module.SchedulingAlgorithm[selectedAlgorithm],
            diskCost: null,
            temperature: null,
            processes: transformedProcesses
        };

        try {
            // Call the schedule function
            const result = Module.schedule(config);
            const schedule = []
            for(let i = 0; i < result.execution.size(); ++i){

                schedule.push(result.execution.get(i))
            }
            result.schedule = schedule
            // TODO: implement Gantt graph to show the scheduling and other schedule informations.
            console.log('Schedule result:', result);
        } catch (error) {
            console.error('Error running simulation:', error);
        }

        ganttChart.innerHTML = `<p>Simulation results for ${selectedAlgorithm} will appear here.</p>`;
        statistics.innerHTML = `<p>Statistics will appear here.</p>`;
    });

    // Initial render
    renderProcesses();
});