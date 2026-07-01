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
    const priorityRange = document.getElementById("priority");
    const priorityValDisplay = document.getElementById("priority-val");
    const speedRange = document.getElementById("speed-input");
    const speedValDisplay = document.getElementById("speed-val");
    const colorInput = document.getElementById("process-color");
    
    // Deadline Toggle
    const btnCheckDeadline = document.getElementById("check-deadline");
    const inputDeadline = document.getElementById("input_deadline");

    // =========================================================================
    // 4. EVENTOS DE UI (Sincronização Visual)
    // =========================================================================
    priorityRange?.addEventListener("input", (e) => priorityValDisplay.textContent = e.target.value);
    speedRange?.addEventListener("input", (e) => speedValDisplay.textContent = e.target.value);

    btnCheckDeadline?.addEventListener("change", (e) => {
        if (e.target.checked) {
            inputDeadline.disabled = false;
            inputDeadline.classList.remove("disabled-input");
        } else {
            inputDeadline.disabled = true;
            inputDeadline.classList.add("disabled-input");
            inputDeadline.value = "";
        }
    });

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
            
            li.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                    <span>
                        <span style="display:inline-block; width:12px; height:12px; background-color:${color}; border-radius:3px; margin-right:8px; vertical-align: middle;"></span>
                        PID: ${p.pid} | Chegada: ${p.arrivalTime} | Tempo: ${p.burstTime} | Prio: ${p.priority}
                    </span>
                    <button class="delete-btn" data-index="${index}" style="background: none; border: none; color: #ef4444; cursor: pointer; font-weight: bold; font-size: 16px;">✕</button>
                </div>
            `;
            processList.appendChild(li);
        });
    }

    // Adicionar Processo
    form?.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const pidInput = document.getElementById("pid");
        const pid = parseInt(pidInput.value);
        
        // Salva a cor escolhida
        processColors[pid] = colorInput ? colorInput.value.toUpperCase() : "#4F46E5";

        const newProcess = {
            pid: pid,
            arrivalTime: parseInt(document.getElementById("arrivalTime").value),
            burstTime: parseInt(document.getElementById("burstTime").value),
            priority: parseInt(priorityRange.value) || 0,
            deadline: btnCheckDeadline.checked ? parseInt(inputDeadline.value) : null
        };
        
        processes.push(newProcess);
        renderProcesses();
        
        pidInput.value = pid + 1; // Incrementa PID
        form.reset();
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
                deadline: p.deadline !== null ? p.deadline : (p.arrivalTime + p.burstTime),
                pageCount: null
            };
            transformedProcesses.push_back(process);
        });

        const contextCheckbox = document.querySelector('.context-section .switch input[type="checkbox"]');
        const quantumInput = document.querySelector('.quantum-input');
        
        const config = {
            quantum: quantumInput && quantumInput.value ? parseInt(quantumInput.value) : 0,
            switchingTime: contextCheckbox && contextCheckbox.checked ? 1 : 0,
            seed: 0,
            schedulingAlgorithm: Module.SchedulingAlgorithm[algorithmSelect.value],
            diskCost: null,
            temperature: null,
            processes: transformedProcesses
        };

        try {
            const result = Module.schedule(config);

            // Montar Grupos
            const groupsArray = processes.map(p => ({ id: p.pid, content: `PID: ${p.pid}` }));
            groupsArray.push({ id: "system-idle", content: "Ocioso" });
            const groups = new vis.DataSet(groupsArray);

            fullItemsArray = [];
            maxSimTime = 0;

            for (let i = 0; i < result.execution.size(); ++i) {
                const block = result.execution.get(i);
                
                if (block.idleTime > 0) {
                    const idleStart = block.startTime - block.idleTime;
                    fullItemsArray.push({
                        id: `idle-${i}`, group: 'system-idle', content: 'Idle',
                        start: idleStart, originalEnd: block.startTime, type: 'range',
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

                const end = block.startTime + block.duration;
                if (end > maxSimTime) maxSimTime = end;

                fullItemsArray.push({
                    id: `exec-${i}`, group: block.id, content: contentLabel,
                    start: block.startTime, originalEnd: end, type: 'range', style: style
                });
            }

            const options = {
                stack: false, showCurrentTime: false, orientation: 'top', selectable: false,
                margin: { item: 5, axis: 5 },
                moment: function (date) { return vis.moment(date).utc(); },
                format: {
                    minorLabels: function (date) { return date.valueOf(); },
                    majorLabels: function () { return ''; }
                },
                start: 0, end: Math.max(25, maxSimTime + 5)
            };

            if (!timelineInstance) {
                timelineInstance = new vis.Timeline(ganttContainer, new vis.DataSet([]), groups, options);
            } else {
                timelineInstance.setOptions(options);
                timelineInstance.setGroups(groups);
            }

            if (statistics) {
                statistics.innerHTML = `
                    <p><strong>Turnaround time:</strong> ${result.turnaroundTime.toFixed(2)}</p>
                    <p><strong>Idle time:</strong> ${result.idleTime}</p>
                    <p><strong>Context switches:</strong> ${result.contextSwitches}</p>`;
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
            let step = (speedVal / 5) * 0.2;
            if (step <= 0) step = 0.05;

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