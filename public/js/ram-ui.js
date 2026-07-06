/**
 * RAM UI Module
 * Handles the rendering of the RAM simulator visualization.
 * Communicates with the RAM logic module (ram.js).
 * Reads simulation results exposed via window.__lastSimResult set by ui.js.
 */

import {
    simulateFIFO, simulateLRU, simulateOPT, simulateClock, simulateNRU,
    firstFit, bestFit, worstFit, nextFit,
    initMemory, freeMemory
} from './ram.js';

document.addEventListener('DOMContentLoaded', () => {

    // =========================================================================
    // DOM References
    // =========================================================================
    const viewTabs = document.getElementById('view-tabs');
    const viewScheduler = document.getElementById('view-scheduler');
    const viewRam = document.getElementById('view-ram');
    const ramContent = document.getElementById('ram-content');
    const tabSchedulerBtn = document.getElementById('tab-scheduler');
    const tabRamBtn = document.getElementById('tab-ram');

    const ramTotalMemoryInput = document.getElementById('ram-total-memory');
    const ramFrameCountInput = document.getElementById('ram-frame-count');
    const ramPageAlgoSelect = document.getElementById('ram-page-algo');
    const ramAllocStrategySelect = document.getElementById('ram-alloc-strategy');

    // =========================================================================
    // Tab Switching
    // =========================================================================
    viewTabs?.addEventListener('click', (e) => {
        const btn = e.target.closest('.ram-tab-btn');
        if (!btn) return;

        const view = btn.dataset.view;
        document.querySelectorAll('.ram-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (view === 'scheduler') {
            if (viewScheduler) viewScheduler.style.display = '';
            if (viewRam) viewRam.classList.remove('active');
        } else if (view === 'ram') {
            if (viewScheduler) viewScheduler.style.display = 'none';
            if (viewRam) viewRam.classList.add('active');
            renderRAMView();
        }
    });

    // =========================================================================
    // Build reference string with locality of reference
    // =========================================================================
    function buildReferenceString(pageCount, length, seed = 0) {
        // Seeded pseudo-random for reproducibility
        let s = seed + 1;
        const rand = () => {
            s ^= s << 13; s ^= s >> 17; s ^= s << 5;
            return Math.abs(s) / 2147483647;
        };

        const refs = [];
        let current = Math.floor(rand() * pageCount);
        for (let i = 0; i < length; i++) {
            const r = rand();
            if (r < 0.6) {
                // Stay in current locality
                current = Math.abs(Math.floor(current + rand() * 3 - 1)) % pageCount;
            } else {
                // Jump
                current = Math.floor(rand() * pageCount);
            }
            refs.push(current);
        }
        return refs;
    }

    // =========================================================================
    // Main Render Function
    // =========================================================================
    function renderRAMView() {
        if (!ramContent) return;

        const simData = window.__lastSimResult;
        if (!simData || !simData.processes || simData.processes.length === 0) {
            ramContent.innerHTML = `
                <div class="ram-empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="2" y="3" width="20" height="14" rx="2"/>
                        <line x1="8" y1="21" x2="16" y2="21"/>
                        <line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                    <p>Execute a simulação do escalonador primeiro,<br>depois acesse a aba <strong>RAM</strong> para visualizar a gestão de memória.</p>
                </div>`;
            return;
        }

        const { processes, executionBlocks, processColors } = simData;
        const totalMemory = parseInt(ramTotalMemoryInput?.value) || 256;
        const frameCount = parseInt(ramFrameCountInput?.value) || 4;
        const pageAlgo = ramPageAlgoSelect?.value || 'LRU';
        const allocStrategy = ramAllocStrategySelect?.value || 'firstFit';

        // Run simulations
        const processResults = runAllSimulations(processes, executionBlocks, processColors, {
            totalMemory, frameCount, pageAlgo, allocStrategy
        });

        ramContent.innerHTML = renderRAMHTML(processResults, processes, processColors, totalMemory, pageAlgo, allocStrategy, frameCount);

        // Attach tooltip hover for memory segments
        setupMemoryMapInteractions();
    }

    // =========================================================================
    // Run all simulations
    // =========================================================================
    function runAllSimulations(processes, executionBlocks, processColors, config) {
        const { totalMemory, frameCount, pageAlgo, allocStrategy } = config;

        // ---- Memory Allocation Simulation ----
        let memBlocks = initMemory(totalMemory);
        let nextFitIdx = 0;
        const allocEvents = [];
        const processMemSizes = {};

        // Sort events by time
        const events = [];
        for (const block of executionBlocks) {
            if (block.type === 'Executing') {
                events.push({ time: block.startTime, type: 'start', pid: block.id });
                events.push({ time: block.startTime + block.duration, type: 'end', pid: block.id });
            }
        }
        events.sort((a, b) => a.time - b.time || (a.type === 'start' ? -1 : 1));

        const active = new Set();
        const finalAllocBlocks = {}; // pid -> block info

        for (const event of events) {
            const proc = processes.find(p => p.pid === event.pid);
            if (!proc) continue;

            if (event.type === 'start' && !active.has(event.pid)) {
                active.add(event.pid);
                const memSize = proc.memorySize || 32;
                processMemSizes[event.pid] = memSize;

                let result;
                if (allocStrategy === 'firstFit') result = firstFit(memBlocks, event.pid, memSize);
                else if (allocStrategy === 'bestFit') result = bestFit(memBlocks, event.pid, memSize);
                else if (allocStrategy === 'worstFit') result = worstFit(memBlocks, event.pid, memSize);
                else if (allocStrategy === 'nextFit') {
                    result = nextFit(memBlocks, event.pid, memSize, nextFitIdx);
                    nextFitIdx = result.lastSearchIdx ?? nextFitIdx;
                }

                if (result?.success) {
                    memBlocks = result.blocks;
                    finalAllocBlocks[event.pid] = { start: result.allocatedAt, size: memSize };
                    allocEvents.push({
                        time: event.time, type: 'alloc', pid: event.pid,
                        size: memSize, success: true,
                        memSnapshot: memBlocks.map(b => ({ ...b }))
                    });
                } else {
                    allocEvents.push({
                        time: event.time, type: 'alloc', pid: event.pid,
                        size: memSize, success: false,
                        memSnapshot: memBlocks.map(b => ({ ...b }))
                    });
                }
            } else if (event.type === 'end') {
                // Only free on last execution
                const hasMore = executionBlocks.some(b => b.id === event.pid && b.startTime > event.time);
                if (!hasMore && active.has(event.pid)) {
                    active.delete(event.pid);
                    memBlocks = freeMemory(memBlocks, event.pid);
                    allocEvents.push({
                        time: event.time, type: 'free', pid: event.pid,
                        memSnapshot: memBlocks.map(b => ({ ...b }))
                    });
                }
            }
        }

        // ---- Page Replacement Per Process ----
        const pageResults = {};
        const refStrings = {};
        for (const proc of processes) {
            const pageCount = proc.pageCount || 8;
            const refLen = Math.min(30, Math.max(15, pageCount * 3));
            const refString = buildReferenceString(pageCount, refLen, proc.pid);
            refStrings[proc.pid] = refString;

            let result;
            if (pageAlgo === 'FIFO') result = simulateFIFO(refString, frameCount);
            else if (pageAlgo === 'LRU') result = simulateLRU(refString, frameCount);
            else if (pageAlgo === 'OPT') result = simulateOPT(refString, frameCount);
            else if (pageAlgo === 'Clock') result = simulateClock(refString, frameCount);
            else if (pageAlgo === 'NRU') result = simulateNRU(refString, frameCount);

            pageResults[proc.pid] = { result, refString };
        }

        return { allocEvents, pageResults, refStrings, finalMemBlocks: memBlocks, processMemSizes };
    }

    // =========================================================================
    // HTML Rendering
    // =========================================================================
    function renderRAMHTML(simResults, processes, processColors, totalMemory, pageAlgo, allocStrategy, frameCount) {
        const { allocEvents, pageResults, finalMemBlocks } = simResults;
        const lastAllocEvent = [...allocEvents].reverse().find(e => e.memSnapshot);
        const memBlocksToShow = lastAllocEvent?.memSnapshot || finalMemBlocks;

        return `
        <div style="padding: 20px; display: flex; flex-direction: column; gap: 20px;">
            <!-- Memory Map -->
            <div class="memory-map-panel">
                <div class="panel-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                    Mapa de Memória &mdash; ${allocStrategy.charAt(0).toUpperCase() + allocStrategy.slice(1).replace(/([A-Z])/g, ' $1')}
                    <span style="margin-left: auto; font-size: 11px; color: var(--text-muted); font-weight: 500;">Total: ${totalMemory} KB</span>
                </div>
                ${renderMemoryMap(memBlocksToShow, totalMemory, processes, processColors)}
                <div class="memory-map-legend" style="margin-top: 12px;">
                    ${processes.map(p => `
                        <div class="legend-item">
                            <div class="legend-dot" style="background:${processColors[p.pid] || '#6d28d9'};"></div>
                            PID ${p.pid} (${p.memorySize || 32} KB)
                        </div>`).join('')}
                    <div class="legend-item">
                        <div class="legend-dot" style="background: repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9 3px,#e2e8f0 3px,#e2e8f0 6px);"></div>
                        Livre
                    </div>
                </div>
            </div>

            <!-- Allocation Events Timeline -->
            <div class="memory-map-panel">
                <div class="panel-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                    Timeline de Alocação &mdash; ${getAllocStrategyName(allocStrategy)}
                </div>
                ${renderAllocTimeline(allocEvents, processes, processColors)}
            </div>

            <!-- Page Replacement Section -->
            <div class="panel-title" style="font-size: 16px; font-weight: 700; color: var(--text-dark); margin-bottom: -8px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                Substituição de Páginas &mdash; ${pageAlgo} &nbsp;
                <span style="font-size: 11px; color: var(--text-muted); font-weight: 500;">(${frameCount} quadros por processo)</span>
            </div>

            ${processes.map(proc => renderProcessPageCard(proc, pageResults[proc.pid], processColors[proc.pid] || '#6d28d9', frameCount)).join('')}
        </div>`;
    }

    function getAllocStrategyName(strategy) {
        const names = { firstFit: 'First Fit', bestFit: 'Best Fit', worstFit: 'Worst Fit', nextFit: 'Next Fit' };
        return names[strategy] || strategy;
    }

    // ---- Memory Map Bar ----
    function renderMemoryMap(memBlocks, totalMemory, processes, processColors) {
        const segments = memBlocks.map(block => {
            const pct = (block.size / totalMemory) * 100;
            const color = block.free ? null : (processColors[block.pid] || '#6d28d9');
            const label = block.free ? 'Livre' : `P${block.pid}`;
            return `
                <div class="memory-segment ${block.free ? 'free' : ''}"
                     style="width: ${pct}%; ${color ? `background: ${color};` : ''}"
                     title="${block.free ? `Livre: ${block.size} KB @ ${block.start} KB` : `PID ${block.pid}: ${block.size} KB @ ${block.start} KB`}">
                    <span class="memory-segment-label" style="${!color ? 'color:#94a3b8' : ''}">${pct > 5 ? label : ''}</span>
                </div>`;
        }).join('');

        return `<div class="memory-map-bar">${segments}</div>
                <div style="display: flex; justify-content: space-between; font-size: 10px; color: var(--text-muted); margin-top: 4px;">
                    <span>0 KB</span>
                    <span>${totalMemory / 2} KB</span>
                    <span>${totalMemory} KB</span>
                </div>`;
    }

    // ---- Allocation Timeline ----
    function renderAllocTimeline(allocEvents, processes, processColors) {
        if (!allocEvents.length) {
            return `<p style="font-size: 12px; color: var(--text-muted);">Nenhum evento de alocação.</p>`;
        }

        const items = allocEvents.map(ev => {
            const proc = processes.find(p => p.pid === ev.pid);
            const color = processColors[ev.pid] || '#6d28d9';
            const isAlloc = ev.type === 'alloc';
            const icon = isAlloc
                ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`
                : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>`;

            return `
                <div class="alloc-event">
                    <div class="alloc-event-dot ${isAlloc ? 'alloc' : 'free'}" style="${isAlloc ? `background:${color}` : ''}"></div>
                    <div class="alloc-event-info">
                        <div class="alloc-event-title" style="${isAlloc ? `color:${color}` : ''}">
                            ${icon} ${isAlloc ? `Alocação: PID ${ev.pid}` : `Liberação: PID ${ev.pid}`}
                            ${isAlloc && !ev.success ? '<span style="color:#ef4444; font-size:10px;"> (FALHOU)</span>' : ''}
                        </div>
                        <div class="alloc-event-desc">
                            ${isAlloc ? `${ev.size} KB solicitados` : 'Memória liberada e mesclada'}
                        </div>
                    </div>
                    <div class="alloc-event-time">t = ${ev.time.toFixed(1)}</div>
                </div>`;
        }).join('');

        return `<div class="alloc-timeline">${items}</div>`;
    }

    // ---- Per-Process Page Replacement Card ----
    function renderProcessPageCard(proc, pageData, color, frameCount) {
        if (!pageData) return '';
        const { result, refString } = pageData;
        const hitRate = result.pageHits / (result.pageFaults + result.pageHits) * 100;

        return `
        <div class="process-page-card" style="border-left: 3px solid ${color};">
            <div class="process-page-header">
                <div class="process-page-title">
                    <div class="process-color-dot" style="background:${color};"></div>
                    PID ${proc.pid} &mdash; ${proc.pageCount || 8} páginas
                </div>
                <div class="page-stats">
                    <span class="page-stat stat-fault"><strong>${result.pageFaults}</strong> faltas</span>
                    <span class="page-stat stat-hit"><strong>${result.pageHits}</strong> acertos</span>
                    <span class="page-stat"><strong>${hitRate.toFixed(0)}%</strong> hit rate</span>
                </div>
            </div>

            <div class="algo-stats-row" style="margin-bottom: 12px;">
                <span style="color: var(--text-muted); font-size: 11px;">Algoritmo:</span>
                <span class="stat-badge ratio">${result.algorithm}</span>
                <span class="stat-badge faults">&#128683; ${result.pageFaults} Page Faults</span>
                <span class="stat-badge hits">&#10003; ${result.pageHits} Hits</span>
                <span style="color: var(--text-muted); font-size: 11px; margin-left: auto;">${frameCount} frames</span>
            </div>

            ${renderPageReplacementTable(result, frameCount, color)}
        </div>`;
    }

    // ---- Page Replacement Table ----
    function renderPageReplacementTable(result, frameCount, color) {
        const steps = result.steps;

        // Header row: page reference string
        const headerCells = steps.map((step, i) => `
            <div class="pr-cell ${step.fault ? 'fault-cell' : 'new-cell'}" style="${!step.fault ? `background:${hexAlpha(color, 0.12)}; border-color:${hexAlpha(color, 0.3)}; color:${color}` : ''}">
                ${step.page}
            </div>`).join('');

        // Frame rows
        const frameRows = Array.from({ length: frameCount }, (_, fi) => {
            const cells = steps.map(step => {
                const page = step.frames[fi];
                if (page === undefined || page === null) {
                    return `<div class="pr-cell empty-cell"></div>`;
                }
                const isNew = step.fault && step.frames[step.frames.length - 1] === page && step.frames.indexOf(page) === fi;
                const isVictim = false; // Already replaced
                return `<div class="pr-cell page-cell ${isNew ? 'new-cell' : ''}" 
                              style="${isNew ? `background:${hexAlpha(color, 0.15)}; border-color:${hexAlpha(color, 0.4)}; color:${color}` : ''}">
                    ${page}
                </div>`;
            }).join('');
            return `
                <div class="pr-row">
                    <div class="pr-frame-label">F${fi + 1}</div>
                    ${cells}
                </div>`;
        }).join('');

        // Fault/Hit indicator row
        const faultRow = steps.map(step => `
            <div class="pr-fault-marker ${!step.fault ? 'hit-marker' : ''}">
                ${step.fault ? 'F' : '•'}
            </div>`).join('');

        return `
        <div class="page-replacement-timeline">
            <!-- Reference string -->
            <div class="pr-row" style="margin-bottom: 2px;">
                <div class="pr-frame-label" style="font-size: 9px; color: var(--text-muted);">Ref</div>
                ${headerCells}
            </div>
            <!-- Frame rows -->
            ${frameRows}
            <!-- Fault/hit row -->
            <div class="pr-fault-row" style="margin-top: 2px;">
                <div class="pr-frame-label"></div>
                ${faultRow}
            </div>
        </div>
        <div style="margin-top: 8px; font-size: 10px; color: var(--text-muted); display: flex; gap: 12px;">
            <span><span style="color: #ef4444; font-weight: 700;">F</span> = Page Fault (substituição)</span>
            <span><span style="font-weight: 700;">•</span> = Hit (sem falta)</span>
            <span style="background:${hexAlpha(color, 0.12)}; padding: 1px 6px; border-radius: 3px; border: 1px solid ${hexAlpha(color, 0.3)}; color:${color}; font-weight: 700;">n</span> = Página carregada
        </div>`;
    }

    function hexAlpha(hex, alpha) {
        // Convert hex + alpha to rgba
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    // =========================================================================
    // Memory Map Tooltip Interactions
    // =========================================================================
    function setupMemoryMapInteractions() {
        const segments = ramContent?.querySelectorAll('.memory-segment');
        segments?.forEach(seg => {
            seg.style.cursor = 'pointer';
            seg.addEventListener('mouseenter', (e) => {
                seg.style.filter = 'brightness(1.1)';
            });
            seg.addEventListener('mouseleave', () => {
                seg.style.filter = '';
            });
        });
    }

    // =========================================================================
    // Listen for simulation updates from ui.js
    // =========================================================================
    window.addEventListener('ram-simulation-ready', () => {
        // If RAM tab is active, re-render
        if (tabRamBtn?.classList.contains('active')) {
            renderRAMView();
        }
    });

    // Listen for RAM config changes
    [ramTotalMemoryInput, ramFrameCountInput, ramPageAlgoSelect, ramAllocStrategySelect].forEach(el => {
        el?.addEventListener('change', () => {
            if (tabRamBtn?.classList.contains('active')) {
                renderRAMView();
            }
        });
    });
});
