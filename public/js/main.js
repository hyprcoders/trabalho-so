import createModule from '../wasm/module.js';

document.addEventListener('DOMContentLoaded', () => {
    const processForm = document.getElementById('process-form');
    const processList = document.getElementById('process-list');
    const clearProcessesBtn = document.getElementById('clear-processes');
    const runSimulationBtn = document.getElementById('run-simulation');
    const algorithmSelect = document.getElementById('algorithm-select');
    const quantumInput = document.getElementById('quantum');
    const switchingTimeInput = document.getElementById('switchingTime');
    const deadlineGroup = document.getElementById('deadline-group');
    const priorityGroup = document.getElementById('priority-group');
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
            const extra = p.deadline !== undefined
                ? `Deadline: ${p.deadline}`
                : `Priority: ${p.priority}`;
            li.textContent = `PID: ${p.pid}, Arrival: ${p.arrivalTime}, Burst: ${p.burstTime}, ${extra}`;
            processList.appendChild(li);
        });
    }

    function updateProcessFieldVisibility() {
        const algorithm = algorithmSelect.value;
        const showDeadline = algorithm === 'EDF';
        const showPriority = algorithm === 'HPF' || algorithm === 'CFSS';

        deadlineGroup.style.display = showDeadline ? 'block' : 'none';
        priorityGroup.style.display = showPriority ? 'block' : 'none';
    }

    algorithmSelect.addEventListener('change', updateProcessFieldVisibility);
    updateProcessFieldVisibility();

    // Event listener for adding a new process
    processForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const newProcess = {
            pid: parseInt(document.getElementById('pid').value),
            arrivalTime: parseInt(document.getElementById('arrivalTime').value),
            burstTime: parseInt(document.getElementById('burstTime').value)
        };

        if (algorithmSelect.value === 'EDF') {
            newProcess.deadline = parseInt(document.getElementById('deadline').value);
        } else if (algorithmSelect.value === 'HPF' || algorithmSelect.value === 'CFSS') {
            newProcess.priority = parseInt(document.getElementById('priority').value) || 0;
        } else {
            newProcess.priority = 0;
        }

        processes.push(newProcess);
        renderProcesses();
        document.getElementById('pid').value = newProcess.pid + 1;
        processForm.reset();
        updateProcessFieldVisibility();
    });

    // Event listener for clearing all processes
    clearProcessesBtn.addEventListener('click', () => {
        processes = [];
        renderProcesses();
        document.getElementById('pid').value = 1; 
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
        const quantum = parseFloat(quantumInput.value) || 0;
        const switchingTime = parseFloat(switchingTimeInput.value) || 0;

        console.log(`Running simulation with ${selectedAlgorithm} for processes:`, processes);

        // Transform processes to match the C++ Process struct using VectorProcess
        const transformedProcesses = new Module.VectorProcess();
        processes.forEach(p => {
            const process = {};
            process.id = p.pid;
            process.arrivalTime = p.arrivalTime;
            process.deadline = p.deadline !== undefined ? p.deadline : p.arrivalTime + p.burstTime;
            process.executionTime = p.burstTime;
            process.priority = p.priority || 0;
            process.pageCount = null;
            transformedProcesses.push_back(process);
            console.log(process,transformedProcesses.get(transformedProcesses.size()-1))
        });

        // Create ScheduleConfiguration
        const config = {
            quantum,
            switchingTime,
            seed: 0,
            schedulingAlgorithm: Module.SchedulingAlgorithm[selectedAlgorithm],
            diskCost: null,
            temperature: null,
            processes: transformedProcesses
        };

        try {
            // Call the schedule function
            console.log("config=",config)
            const result = Module.schedule(config);

            // ==========================================
            // VIS-TIMELINE GROUP SET UP
            // ==========================================
            const groupsArray = [];
            
            // Add individual Process groups
            processes.forEach(p => {
                groupsArray.push({
                    id: p.pid,
                    content: `PID: ${p.pid}`
                });
            });

            // Add a special group for system Idle times
            groupsArray.push({
                id: 'system-idle',
                content: 'System Idle'
            });

            const groups = new vis.DataSet(groupsArray);
            // ==========================================

            const itemsArray = [];
            const now = new Date();
            const scaleMs = 1000; 

            for (let i = 0; i < result.execution.size(); ++i) {
                const block = result.execution.get(i);
                console.log(`block ${i} =`, block);
                const start = block.startTime;
                const duration = block.duration;
                const idle = block.idleTime;
                const pid = block.id;

                // If there's idle time before this block, render it in the system-idle row
                if (idle > 0) {
                    const idleStart = start - idle;
                    itemsArray.push({
                        id: `idle-${i}`,
                        group: 'system-idle', // Placed on the System Idle row
                        content: 'Idle',
                        start: idleStart,
                        end: start,
                        type: 'range',
                        style: 'background-color: gray; color: white;'
                    });
                }

                // Execution / switching / tardy block
                let style = 'background-color: green; color: white;';
                let contentLabel = `P${pid}`;

                if (block.type === Module.ExecutionType.Executing) {
                    style = 'background-color: green; color: white;';
                    contentLabel = 'Executing';
                } else if (block.type === Module.ExecutionType.Switching) {
                    style = 'background-color: orange; color: white;';
                    contentLabel = 'Context Switch';
                } else if (block.type === Module.ExecutionType.Tardy) {
                    style = 'background-color: red; color: white;';
                    contentLabel = 'Tardy';
                }

                itemsArray.push({
                    id: `exec-${i}`,
                    group: pid, // Associates this piece of execution with its specific PID row
                    content: contentLabel,
                    start: start,
                    end: start + duration,
                    type: 'range',
                    style: style
                });
            }

            // Render timeline using vis-timeline
            const container = document.getElementById('gantt-chart');
            container.innerHTML = '';
            const items = new vis.DataSet(itemsArray);
            
            const options = {
                stack: false,
                showCurrentTime: false,
                orientation: 'top',
                selectable: false,
                margin: {
                    item: 5,
                    axis: 5
                },
                // ADD THESE PROPERTIES:
                moment: function (date) {
                    return vis.moment(date).utc(); 
                },
                format: {
                    minorLabels: function (date, scale, step) {
                        return date.valueOf(); // Forces numeric output instead of dates/times
                    },
                    majorLabels: function (date, scale, step) {
                        return ''; // Disables the "25 June" header entirely
                    }
                },
                start: 0, // Forces the visualization window to start exactly at 0
                end: 25
            };

            // Pass 'groups' as the third argument to the constructor
            new vis.Timeline(container, items, groups, options);

            // Also show basic statistics
            statistics.innerHTML = `
                <p>Turnaround time: ${result.turnaroundTime.toFixed(2)}</p>
                <p>Idle time: ${result.idleTime}</p>
                <p>Context switches: ${result.contextSwitches}</p>`;

            console.log('Schedule result:', result);
        } catch (error) {
            console.error('Error running simulation:', error);
        }
    });

    // Initial render
    renderProcesses();
});