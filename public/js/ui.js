// 1. CARREGAMENTO NATIVO (Direto no topo do arquivo)
import createModule from '../wasm/module.js';

document.addEventListener("DOMContentLoaded", async () => {
    // =========================================================================
    // INICIALIZAÇÃO DO WEBASSEMBLY
    // =========================================================================
    let Module;
    try {
        Module = await createModule({
            locateFile: (path) => path.endsWith('.wasm') ? `wasm/${path}` : path
        });
        console.log('WASM Module carregado com sucesso pelo ui.js!');
    } catch (e) {
        console.error('Falha ao carregar o WebAssembly no ui.js:', e);
    }

    // =========================================================================
    // 2. ESTADOS DA APLICAÇÃO (O restante do seu código continua a partir daqui)
    // =========================================================================
    let processes = [];
    let processColors = {};
    
    // Estados do Player e Gráfico
    let timelineInstance = null;
    let fullItemsArray = [];
    let currentSimTime = 0;
    let maxSimTime = 0;
    let isPlaying = false;
    let playInterval = null;
    const SCALE = 100;

    // ... [MANTENHA TODO O RESTO DO CÓDIGO INTACTO AQUI PARA BAIXO] ...

    // =========================================================================
    // 3. REFERÊNCIAS DO DOM
    // =========================================================================
    const form = document.getElementById("process-form");
    const processList = document.getElementById("process-list");
    const clearBtn = document.getElementById("clear-processes");
    const runBtn = document.getElementById("run-simulation");
    const algorithmSelect = document.getElementById("algorithm-select");
    const ganttContainer = document.getElementById("gantt-chart");
    const statistics = document.getElementById("statistics");

    // Inputs visuais
    const priorityGroup = document.getElementById("priority-group");
    const priorityRange = document.getElementById("priority");
    const priorityValDisplay = document.getElementById("priority-val");
    const speedRange = document.getElementById("speed-input");
    const speedValDisplay = document.getElementById("speed-val");
    const colorInput = document.getElementById("process-color");
    const btnCheckDeadline = document.getElementById("check-deadline");
    const deadlineToggleGroup = document.getElementById("deadline-toggle-group");
    const deadlineGroup = document.getElementById("deadline-group");
    const inputDeadline = document.getElementById("input_deadline");
    const switchingGroup = document.getElementById("switching-group");
    const switchingToggle = document.getElementById("switching-toggle");
    const switchingTimeInput = document.getElementById("switching-time-input");
    const decayGroup = document.getElementById("decay-group");
    const decayLabel = document.getElementById("decay-label");
    const decayInput = document.getElementById("decay-input");
    const temperatureGroup = document.getElementById("temperature-group");
    const temperatureInput = document.getElementById("temperature-input");
    const seedGroup = document.getElementById("seed-group");
    const seedInput = document.getElementById("seed-input");

    const priorityAlgorithms = ["HPF", "CFSS"];
    const deadlineAlgorithms = ["EDF", "FPET", "MHPET"];
    const preemptiveAlgorithms = ["SRTF", "RR", "EDF", "HPF", "CFSS"];
    const quantumAlgorithms = ["SRTF", "RR", "EDF", "HPF", "CFSS", "MHPET"];
    const petAlgorithms = ["FPET", "MHPET"];
    const mhpetAlgorithm = "MHPET";

    function updateFieldVisibility() {
        const algorithm = algorithmSelect.value;
        const showPriority = priorityAlgorithms.includes(algorithm);
        const showDeadline = deadlineAlgorithms.includes(algorithm);
        const showSwitching = preemptiveAlgorithms.includes(algorithm);
        const showDecay = quantumAlgorithms.includes(algorithm);
        const showTemperature = algorithm === mhpetAlgorithm;
        const showSeed = algorithm === mhpetAlgorithm;

        if (priorityGroup) priorityGroup.style.display = showPriority ? "" : "none";
        if (deadlineToggleGroup) deadlineToggleGroup.style.display = showDeadline ? "" : "none";
        if (deadlineGroup) deadlineGroup.style.display = showDeadline && btnCheckDeadline?.checked ? "" : "none";
        if (switchingGroup) switchingGroup.style.display = showSwitching ? "" : "none";
        if (decayGroup) decayGroup.style.display = showDecay ? "" : "none";
        if (temperatureGroup) temperatureGroup.style.display = showTemperature ? "" : "none";
        if (seedGroup) seedGroup.style.display = showSeed ? "" : "none";

        if (decayLabel) {
            decayLabel.textContent = algorithm === mhpetAlgorithm ? "Decay" : "Quantum";
            if (decayInput) decayInput.placeholder = algorithm === mhpetAlgorithm ? "Decay" : "Quantum";
        }

        if (!showDeadline && btnCheckDeadline) {
            btnCheckDeadline.checked = false;
        }

        if (!showPriority && priorityRange) {
            priorityRange.value = "10";
            if (priorityValDisplay) priorityValDisplay.textContent = "10";
        }

        if (!showSwitching && switchingToggle && switchingTimeInput) {
            switchingToggle.checked = false;
            switchingTimeInput.disabled = true;
            switchingTimeInput.classList.add("disabled-input");
            switchingTimeInput.value = "";
        }

        if (!showDecay && decayInput) {
            decayInput.value = "";
        }

        if (!showTemperature && temperatureInput) {
            temperatureInput.value = "";
        }

        if (!showSeed && seedInput) {
            seedInput.value = "0";
        }

        if (btnCheckDeadline) {
            inputDeadline.disabled = !btnCheckDeadline.checked;
            if (!btnCheckDeadline.checked) {
                inputDeadline.classList.add("disabled-input");
                inputDeadline.value = "";
            }
        }
    }

    function updateDeadlineVisibility() {
        if (deadlineGroup) {
            deadlineGroup.style.display = btnCheckDeadline?.checked ? "" : "none";
        }
    }

    priorityRange?.addEventListener("input", (e) => priorityValDisplay.textContent = e.target.value);
    speedRange?.addEventListener("input", (e) => speedValDisplay.textContent = e.target.value);
    algorithmSelect?.addEventListener("change", updateFieldVisibility);

    btnCheckDeadline?.addEventListener("change", (e) => {
        if (e.target.checked) {
            inputDeadline.disabled = false;
            inputDeadline.classList.remove("disabled-input");
        } else {
            inputDeadline.disabled = true;
            inputDeadline.classList.add("disabled-input");
            inputDeadline.value = "";
        }
        updateDeadlineVisibility();
    });

    switchingToggle?.addEventListener("change", (e) => {
        if (switchingTimeInput) {
            switchingTimeInput.disabled = !e.target.checked;
            switchingTimeInput.classList.toggle("disabled-input", !e.target.checked);
            if (!e.target.checked) switchingTimeInput.value = "";
        }
    });

    if (algorithmSelect) updateFieldVisibility();

    // =========================================================================
    // 5. GERENCIAMENTO DE PROCESSOS (CRUD)
    // =========================================================================
    function renderProcesses() {
        if (!processList) return;
        processList.innerHTML = "";
        
        if (processes.length === 0) {
            processList.innerHTML = "<li>Nenhum processo adicionado.</li>";
            return;
        }

        processes.forEach((p, index) => {
            const li = document.createElement("li");
            const color = processColors[p.pid] || "#4F46E5";
            
            const extra = p.deadline !== null && p.deadline !== undefined
                ? `Deadline: ${p.deadline}`
                : `Prio: ${p.priority}`;
            li.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                    <span>
                        <span style="display:inline-block; width:12px; height:12px; background-color:${color}; border-radius:3px; margin-right:8px; vertical-align: middle;"></span>
                        PID: ${p.pid} | Chegada: ${p.arrivalTime} | Tempo: ${p.burstTime} | ${extra}
                    </span>
                    <button class="delete-btn" data-index="${index}" style="background: none; border: none; color: #ef4444; cursor: pointer; font-weight: bold; font-size: 16px;">✕</button>
                </div>
            `;
            processList.appendChild(li);
        });
    }

    function getNextPid() {
        const existingPids = new Set(processes.map((p) => p.pid));
        let nextPid = 1;
        while (existingPids.has(nextPid)) {
            nextPid += 1;
        }
        return nextPid;
    }

    // Adicionar Processo
    form?.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const pidInput = document.getElementById("pid");
        const pid = parseInt(pidInput.value);
        
        if (processes.some((p) => p.pid === pid)) {
            return alert(`PID ${pid} já existe. Escolha um PID diferente.`);
        }

        // Salva a cor escolhida
        processColors[pid] = colorInput ? colorInput.value.toUpperCase() : "#4F46E5";

        const deadlineValue = btnCheckDeadline.checked && inputDeadline.value !== ""
            ? Number(inputDeadline.value)
            : null;

        if (btnCheckDeadline.checked && (deadlineValue === null || Number.isNaN(deadlineValue))) {
            return alert('Por favor, informe um deadline válido.');
        }

        const newProcess = {
            pid: pid,
            arrivalTime: parseInt(document.getElementById("arrivalTime").value),
            burstTime: parseInt(document.getElementById("burstTime").value),
            priority: parseInt(priorityRange.value) || 0,
            deadline: deadlineValue
        };
        
        processes.push(newProcess);
        renderProcesses();
        
        const keepDeadlineChecked = btnCheckDeadline.checked;
        const keepDeadlineValue = inputDeadline.value;

        pidInput.value = getNextPid();
        form.reset();

        if (keepDeadlineChecked) {
            btnCheckDeadline.checked = true;
            inputDeadline.disabled = false;
            inputDeadline.classList.remove("disabled-input");
            inputDeadline.value = keepDeadlineValue;
        }

        if (priorityValDisplay) priorityValDisplay.textContent = "10";
        if (colorInput) colorInput.value = "#4F46E5"; // Reseta cor
        
        // Auto-recalcula se já houver um gráfico desenhado
        if (timelineInstance) calculateSimulation();
    });

    // Deletar Processo Individual
    processList?.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete-btn")) {
            const index = parseInt(e.target.getAttribute("data-index"));
            processes.splice(index, 1);
            renderProcesses();
            if (timelineInstance) calculateSimulation(); // Recalcula sem o processo
        }
    });

    // Limpar Todos
    clearBtn?.addEventListener("click", () => {
        processes = [];
        processColors = {};
        renderProcesses();
        document.getElementById("pid").value = 1;
        pauseSimulation();
        fullItemsArray = [];
        if (timelineInstance) {
            timelineInstance.setItems(new vis.DataSet([]));
            timelineInstance.setGroups(new vis.DataSet([]));
        }
        if (statistics) statistics.innerHTML = "Aguardando execução...";
    });

    // =========================================================================
    // 6. CÁLCULO DA SIMULAÇÃO (WASM) E CRIAÇÃO DO GRÁFICO
    // =========================================================================
    function calculateSimulation() {
        if (!Module || processes.length === 0) return;

        pauseSimulation();
        
        const transformedProcesses = new Module.VectorProcess();
        processes.forEach(p => {
                    const process = {
                    id: p.pid,
                    arrivalTime: p.arrivalTime,
                    executionTime: p.burstTime,
                    priority: p.priority,
                    deadline: p.deadline !== null && p.deadline !== undefined
                        ? p.deadline
                        : (p.arrivalTime + p.burstTime),
                    pageCount: null
                };
            console.log(process)
            transformedProcesses.push_back(process);
        });

        const switchingTime = switchingToggle && switchingToggle.checked && switchingTimeInput && switchingTimeInput.value
            ? parseFloat(switchingTimeInput.value)
            : 0;
        const decayValue = decayInput && decayInput.value ? parseFloat(decayInput.value) : 0;
        const temperatureValue = temperatureInput && temperatureInput.value ? Number(temperatureInput.value) : null;
        const seedValue = seedInput && seedInput.value ? parseInt(seedInput.value) : 0;

        const config = {
            quantum: decayValue,
            switchingTime: switchingTime,
            seed: seedValue,
            schedulingAlgorithm: Module.SchedulingAlgorithm[algorithmSelect.value],
            diskCost: null,
            temperature: temperatureValue !== null ? temperatureValue : null,
            processes: transformedProcesses
        };

        try {
            const result = Module.schedule(config);

            console.log("result=", result)

            // Montar Grupos
            const groupsArray = processes.map(p => ({ id: p.pid, content: `PID: ${p.pid}` }));
            groupsArray.push({ id: "system-idle", content: "Ocioso" });
            const groups = new vis.DataSet(groupsArray);

            fullItemsArray = [];
            maxSimTime = 0;

            for (let i = 0; i < result.execution.size(); ++i) {
                const block = result.execution.get(i);
                console.log(block)
                if (block.idleTime > 0) {
                    const idleStart = (block.startTime - block.idleTime) * SCALE;
                    fullItemsArray.push({
                        id: `idle-${i}`, group: 'system-idle', content: 'Idle',
                        start: idleStart, originalEnd: block.startTime * SCALE, type: 'range',
                        style: 'background-color: #e2e8f0; color: #64748b; border-color: #cbd5e1;'
                    });
                }

                let style = '';
                let contentLabel = `P${block.id}`;

                if (block.type === Module.ExecutionType.Executing) {
                    const bgColor = processColors[block.id] || '#4F46E5';
                    style = `background-color: ${bgColor}; color: white; border-color: ${bgColor}; font-weight: bold;`;
                } else if (block.type === Module.ExecutionType.Switching) {
                    style = 'background-color: #f59e0b; color: white; border-color: #d97706;';
                    contentLabel = 'Troca';
                } else if (block.type === Module.ExecutionType.Tardy) {
                    style = 'background-color: #ef4444; color: white; border-color: #b91c1c;';
                    contentLabel = 'Atraso';
                }

                const end = (block.startTime + block.duration) * SCALE;
                if (end > maxSimTime) maxSimTime = end;

                fullItemsArray.push({
                    id: `exec-${i}`, group: block.id, content: contentLabel,
                    start: block.startTime * SCALE, originalEnd: end, type: 'range', style: style
                });
            }

            const options = {
                stack: false, showCurrentTime: false, orientation: 'top', selectable: false,
                margin: { item: 5, axis: 5 },
                moment: function (date) { return vis.moment(date).utc(); },
                format: {
                    minorLabels: function (date) { return date.valueOf() / SCALE; },
                    majorLabels: function () { return ''; }
                },
                start: 0, end: Math.max(25 * SCALE, maxSimTime + 5 * SCALE)
            };

            if (!timelineInstance) {
                timelineInstance = new vis.Timeline(ganttContainer, new vis.DataSet([]), groups, options);
            } else {
                timelineInstance.setOptions(options);
                timelineInstance.setGroups(groups);
            }

            if (statistics) {
                const isPetScheduler = petAlgorithms.includes(algorithmSelect.value);
                let statsHtml = `
                    <p><strong>Idle time:</strong> ${result.idleTime}</p>`;

                if (!isPetScheduler) {
                    statsHtml = `
                    <p><strong>Turnaround time:</strong> ${result.turnaroundTime.toFixed(2)}</p>
                    <p><strong>Idle time:</strong> ${result.idleTime}</p>
                    <p><strong>Context switches:</strong> ${result.contextSwitches}</p>`;
                }

                if (result.tardyCnt !== undefined && result.tardyCnt !== null) {
                    statsHtml += `\n                    <p><strong>Late count:</strong> ${result.tardyCnt}</p>`;
                }
                if (result.earliness !== undefined && result.earliness !== null) {
                    statsHtml += `\n                    <p><strong>Earliness:</strong> ${result.earliness.toFixed(2)}</p>`;
                }
                if (result.tardiness !== undefined && result.tardiness !== null) {
                    statsHtml += `\n                    <p><strong>Tardiness:</strong> ${result.tardiness.toFixed(2)}</p>`;
                }

                statistics.innerHTML = statsHtml;
            }

            // Inicia o player automaticamente do zero
            currentSimTime = 0;
            playSimulation();

        } catch (error) {
            console.error('Erro ao executar simulação:', error);
        }
    }

    // =========================================================================
    // 7. MOTOR DO PLAYER (Animação frame a frame)
    // =========================================================================
    function renderSimulationFrame() {
        if (!timelineInstance) return;

        const visibleItems = fullItemsArray.map(item => {
            if (item.start >= currentSimTime) return null; // Ainda não começou
            const currentEnd = Math.min(item.originalEnd, currentSimTime);
            if (currentEnd <= item.start) return null;
            
            return { ...item, end: currentEnd };
        }).filter(i => i !== null);
        
        timelineInstance.setItems(new vis.DataSet(visibleItems));
    }

    function playSimulation() {
        if (isPlaying || fullItemsArray.length === 0) return;
        isPlaying = true;

        playInterval = setInterval(() => {
            const speedVal = speedRange ? parseInt(speedRange.value) : 5;
            let step = (speedVal / 5) * 0.2 * SCALE;
            if (step <= 0) step = 0.05 * SCALE;

            currentSimTime += step;
            if (currentSimTime >= maxSimTime) {
                currentSimTime = maxSimTime;
                pauseSimulation();
            }
            renderSimulationFrame();
        }, 50);
    }

    function pauseSimulation() {
        isPlaying = false;
        clearInterval(playInterval);
    }

    // Botões do Player
    document.getElementById('btn-pause')?.addEventListener('click', pauseSimulation);
    
    document.getElementById('btn-forward')?.addEventListener('click', () => {
        pauseSimulation();
        currentSimTime = Math.min(maxSimTime, Math.ceil(currentSimTime) + 1);
        renderSimulationFrame();
    });

    document.getElementById('btn-rewind')?.addEventListener('click', () => {
        pauseSimulation();
        currentSimTime = Math.max(0, Math.floor(currentSimTime) - 1);
        renderSimulationFrame();
    });

    runBtn?.addEventListener('click', () => {
        if (processes.length === 0) return alert('Adicione processos primeiro!');
        // Se estiver no meio do gráfico e não estiver tocando, retoma (despausa).
        if (currentSimTime > 0 && currentSimTime < maxSimTime && fullItemsArray.length > 0 && !isPlaying) {
            playSimulation();    
        } else {
            // Caso contrário, calcula tudo do zero
            calculateSimulation();
        }
    });
});