/**
 * RAM Simulator Module
 * Implements page replacement algorithms and memory allocation strategies.
 */

// ============================================================
// PAGE REPLACEMENT ALGORITHMS
// ============================================================

/**
 * Simulates FIFO page replacement.
 * @param {number[]} referenceString - sequence of page numbers
 * @param {number} frameCount - number of physical frames
 * @returns {object} simulation result
 */
export function simulateFIFO(referenceString, frameCount) {
    const frames = [];
    const fifoQueue = [];
    const steps = [];
    let pageFaults = 0;
    let pageHits = 0;

    for (const page of referenceString) {
        const snapshot = [...frames];
        let fault = false;
        let replaced = null;
        let victim = null;

        if (!frames.includes(page)) {
            fault = true;
            pageFaults++;
            if (frames.length >= frameCount) {
                victim = fifoQueue.shift();
                const idx = frames.indexOf(victim);
                frames.splice(idx, 1);
            }
            frames.push(page);
            fifoQueue.push(page);
        } else {
            pageHits++;
        }

        steps.push({
            page,
            frames: [...frames],
            fault,
            victim,
            hit: !fault,
        });
    }

    return { steps, pageFaults, pageHits, algorithm: 'FIFO' };
}

/**
 * Simulates LRU page replacement.
 */
export function simulateLRU(referenceString, frameCount) {
    const frames = [];
    const lastUsed = new Map();
    const steps = [];
    let pageFaults = 0;
    let pageHits = 0;

    for (let i = 0; i < referenceString.length; i++) {
        const page = referenceString[i];
        let fault = false;
        let victim = null;

        if (!frames.includes(page)) {
            fault = true;
            pageFaults++;
            if (frames.length >= frameCount) {
                // Find LRU page
                let lruTime = Infinity;
                let lruPage = null;
                for (const f of frames) {
                    const t = lastUsed.get(f) ?? -1;
                    if (t < lruTime) {
                        lruTime = t;
                        lruPage = f;
                    }
                }
                victim = lruPage;
                const idx = frames.indexOf(victim);
                frames.splice(idx, 1);
            }
            frames.push(page);
        } else {
            pageHits++;
        }

        lastUsed.set(page, i);

        steps.push({
            page,
            frames: [...frames],
            fault,
            victim,
            hit: !fault,
        });
    }

    return { steps, pageFaults, pageHits, algorithm: 'LRU' };
}

/**
 * Simulates OPT (Optimal) page replacement.
 */
export function simulateOPT(referenceString, frameCount) {
    const frames = [];
    const steps = [];
    let pageFaults = 0;
    let pageHits = 0;

    for (let i = 0; i < referenceString.length; i++) {
        const page = referenceString[i];
        let fault = false;
        let victim = null;

        if (!frames.includes(page)) {
            fault = true;
            pageFaults++;
            if (frames.length >= frameCount) {
                // Find the page used farthest in the future
                let farthest = -1;
                let evict = frames[0];
                for (const f of frames) {
                    const nextUse = referenceString.indexOf(f, i + 1);
                    if (nextUse === -1) {
                        evict = f;
                        break;
                    }
                    if (nextUse > farthest) {
                        farthest = nextUse;
                        evict = f;
                    }
                }
                victim = evict;
                const idx = frames.indexOf(victim);
                frames.splice(idx, 1);
            }
            frames.push(page);
        } else {
            pageHits++;
        }

        steps.push({
            page,
            frames: [...frames],
            fault,
            victim,
            hit: !fault,
        });
    }

    return { steps, pageFaults, pageHits, algorithm: 'OPT' };
}

/**
 * Simulates Clock (Second Chance) page replacement.
 */
export function simulateClock(referenceString, frameCount) {
    const frames = new Array(frameCount).fill(null);
    const referenceBit = new Array(frameCount).fill(0);
    let clockHand = 0;
    const steps = [];
    let pageFaults = 0;
    let pageHits = 0;

    for (const page of referenceString) {
        let fault = false;
        let victim = null;

        const idx = frames.indexOf(page);
        if (idx !== -1) {
            // Page hit — set reference bit
            referenceBit[idx] = 1;
            pageHits++;
        } else {
            fault = true;
            pageFaults++;

            // Find a frame to replace using clock algorithm
            while (true) {
                if (referenceBit[clockHand] === 0) {
                    victim = frames[clockHand];
                    frames[clockHand] = page;
                    referenceBit[clockHand] = 0;
                    clockHand = (clockHand + 1) % frameCount;
                    break;
                } else {
                    referenceBit[clockHand] = 0;
                    clockHand = (clockHand + 1) % frameCount;
                }
            }
        }

        steps.push({
            page,
            frames: [...frames],
            referenceBits: [...referenceBit],
            clockHand: clockHand === 0 ? frameCount - 1 : clockHand - 1,
            fault,
            victim,
            hit: !fault,
        });
    }

    return { steps, pageFaults, pageHits, algorithm: 'Clock' };
}

/**
 * Simulates NRU (Not Recently Used) page replacement.
 * Each page has two bits: referenced (R) and modified (M).
 * Classes: 0=(R=0,M=0), 1=(R=0,M=1), 2=(R=1,M=0), 3=(R=1,M=1)
 */
export function simulateNRU(referenceString, frameCount) {
    const frames = [];
    // Each frame entry: { page, R, M }
    const frameData = [];
    const steps = [];
    let pageFaults = 0;
    let pageHits = 0;
    let tick = 0;

    for (const page of referenceString) {
        // Periodically clear R bits (every 4 steps)
        if (tick > 0 && tick % 4 === 0) {
            for (const fd of frameData) fd.R = 0;
        }

        let fault = false;
        let victim = null;

        const idx = frames.indexOf(page);
        if (idx !== -1) {
            frameData[idx].R = 1;
            // Randomly set M bit ~50% of time to simulate writes
            if (Math.random() < 0.5) frameData[idx].M = 1;
            pageHits++;
        } else {
            fault = true;
            pageFaults++;

            if (frames.length >= frameCount) {
                // Pick lowest class victim
                let bestClass = 4;
                let bestIdx = 0;
                for (let i = 0; i < frameData.length; i++) {
                    const cls = (frameData[i].R << 1) | frameData[i].M;
                    if (cls < bestClass) {
                        bestClass = cls;
                        bestIdx = i;
                    }
                }
                victim = frames[bestIdx];
                frames.splice(bestIdx, 1);
                frameData.splice(bestIdx, 1);
            }

            frames.push(page);
            frameData.push({ page, R: 1, M: Math.random() < 0.3 ? 1 : 0 });
        }

        steps.push({
            page,
            frames: [...frames],
            frameData: frameData.map(fd => ({ ...fd })),
            fault,
            victim,
            hit: !fault,
        });

        tick++;
    }

    return { steps, pageFaults, pageHits, algorithm: 'NRU' };
}

// ============================================================
// MEMORY ALLOCATION STRATEGIES
// ============================================================

/**
 * Memory block: { id, start, size, pid: null | processId, free: bool }
 */

/**
 * Initializes memory with a given total size.
 * Returns a single free block.
 */
export function initMemory(totalSize) {
    return [{ id: 0, start: 0, size: totalSize, pid: null, free: true }];
}

/**
 * Allocates memory for a process using First Fit.
 * Returns { success, blocks, allocatedAt }
 */
export function firstFit(blocks, pid, size) {
    for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].free && blocks[i].size >= size) {
            return _allocate(blocks, i, pid, size);
        }
    }
    return { success: false, blocks: [...blocks], allocatedAt: null };
}

/**
 * Allocates memory using Best Fit.
 */
export function bestFit(blocks, pid, size) {
    let bestIdx = -1;
    let bestSize = Infinity;
    for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].free && blocks[i].size >= size && blocks[i].size < bestSize) {
            bestSize = blocks[i].size;
            bestIdx = i;
        }
    }
    if (bestIdx === -1) return { success: false, blocks: [...blocks], allocatedAt: null };
    return _allocate(blocks, bestIdx, pid, size);
}

/**
 * Allocates memory using Worst Fit.
 */
export function worstFit(blocks, pid, size) {
    let worstIdx = -1;
    let worstSize = -1;
    for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].free && blocks[i].size >= size && blocks[i].size > worstSize) {
            worstSize = blocks[i].size;
            worstIdx = i;
        }
    }
    if (worstIdx === -1) return { success: false, blocks: [...blocks], allocatedAt: null };
    return _allocate(blocks, worstIdx, pid, size);
}

/**
 * Allocates memory using Next Fit.
 * lastSearchIdx: index to resume search from
 */
export function nextFit(blocks, pid, size, lastSearchIdx = 0) {
    const n = blocks.length;
    for (let offset = 0; offset < n; offset++) {
        const i = (lastSearchIdx + offset) % n;
        if (blocks[i].free && blocks[i].size >= size) {
            return { ..._allocate(blocks, i, pid, size), lastSearchIdx: i };
        }
    }
    return { success: false, blocks: [...blocks], allocatedAt: null, lastSearchIdx };
}

/**
 * Internal: performs the allocation at index i.
 */
function _allocate(blocks, i, pid, size) {
    const newBlocks = blocks.map(b => ({ ...b }));
    const block = newBlocks[i];
    const allocatedAt = block.start;

    if (block.size === size) {
        block.pid = pid;
        block.free = false;
    } else {
        // Split block
        const remainder = {
            id: Date.now() + Math.random(),
            start: block.start + size,
            size: block.size - size,
            pid: null,
            free: true,
        };
        block.size = size;
        block.pid = pid;
        block.free = false;
        newBlocks.splice(i + 1, 0, remainder);
    }

    return { success: true, blocks: newBlocks, allocatedAt };
}

/**
 * Frees memory allocated to a given process and merges adjacent free blocks.
 */
export function freeMemory(blocks, pid) {
    let newBlocks = blocks.map(b => ({ ...b }));
    for (const b of newBlocks) {
        if (b.pid === pid) {
            b.pid = null;
            b.free = true;
        }
    }
    return mergeBlocks(newBlocks);
}

/**
 * Merges adjacent free blocks.
 */
function mergeBlocks(blocks) {
    const merged = [{ ...blocks[0] }];
    for (let i = 1; i < blocks.length; i++) {
        const last = merged[merged.length - 1];
        const curr = blocks[i];
        if (last.free && curr.free) {
            last.size += curr.size;
        } else {
            merged.push({ ...curr });
        }
    }
    return merged;
}

// ============================================================
// FULL SIMULATION: Combines scheduling + memory management
// ============================================================

/**
 * Runs a full memory simulation based on the execution schedule.
 * 
 * @param {object[]} processes - array of process objects { pid, burstTime, pageCount, memorySize }
 * @param {object[]} executionBlocks - from the scheduler result, array of { id, startTime, duration, type }
 * @param {object} config - { totalMemory, frameCount, pageReplacementAlgo, allocationStrategy }
 * @returns {object} full simulation state timeline
 */
export function runMemorySimulation(processes, executionBlocks, config) {
    const {
        totalMemory = 256,
        frameCount = 4,
        pageReplacementAlgo = 'LRU',
        allocationStrategy = 'firstFit',
    } = config;

    // Build time-ordered events from execution blocks
    const events = [];
    for (const block of executionBlocks) {
        if (block.type === 'Executing') {
            events.push({ time: block.startTime, type: 'start', pid: block.id, block });
            events.push({ time: block.startTime + block.duration, type: 'end', pid: block.id, block });
        }
    }
    events.sort((a, b) => a.time - b.time || (a.type === 'start' ? -1 : 1));

    // Initialize memory state
    let memBlocks = initMemory(totalMemory);
    let nextFitIdx = 0;
    const activeProcesses = new Set();
    const processPageData = {}; // pid -> { referenceString, frameCount, result }
    const timeline = []; // snapshots of memory state at each event

    for (const event of events) {
        const proc = processes.find(p => p.pid === event.pid);
        if (!proc) continue;

        if (event.type === 'start' && !activeProcesses.has(event.pid)) {
            activeProcesses.add(event.pid);

            // Allocate memory
            const memSize = proc.memorySize || 32;
            let result;
            if (allocationStrategy === 'firstFit') {
                result = firstFit(memBlocks, event.pid, memSize);
            } else if (allocationStrategy === 'bestFit') {
                result = bestFit(memBlocks, event.pid, memSize);
            } else if (allocationStrategy === 'worstFit') {
                result = worstFit(memBlocks, event.pid, memSize);
            } else if (allocationStrategy === 'nextFit') {
                result = nextFit(memBlocks, event.pid, memSize, nextFitIdx);
                nextFitIdx = result.lastSearchIdx ?? nextFitIdx;
            }

            if (result?.success) {
                memBlocks = result.blocks;
            }

            // Build page reference string for this process
            const pageCount = proc.pageCount || 8;
            const refString = buildReferenceString(pageCount, 20);
            let pageResult;
            if (pageReplacementAlgo === 'FIFO') {
                pageResult = simulateFIFO(refString, frameCount);
            } else if (pageReplacementAlgo === 'LRU') {
                pageResult = simulateLRU(refString, frameCount);
            } else if (pageReplacementAlgo === 'OPT') {
                pageResult = simulateOPT(refString, frameCount);
            } else if (pageReplacementAlgo === 'Clock') {
                pageResult = simulateClock(refString, frameCount);
            } else if (pageReplacementAlgo === 'NRU') {
                pageResult = simulateNRU(refString, frameCount);
            }
            processPageData[event.pid] = pageResult;

            timeline.push({
                time: event.time,
                eventType: 'alloc',
                pid: event.pid,
                memBlocks: memBlocks.map(b => ({ ...b })),
                pageData: { ...processPageData },
                memorySuccess: result?.success,
            });
        } else if (event.type === 'end') {
            // Don't free until the process truly finishes (last block)
            const hasMore = executionBlocks.some(
                b => b.pid === event.pid && b.startTime > event.time
            );
            if (!hasMore) {
                activeProcesses.delete(event.pid);
                memBlocks = freeMemory(memBlocks, event.pid);

                timeline.push({
                    time: event.time,
                    eventType: 'free',
                    pid: event.pid,
                    memBlocks: memBlocks.map(b => ({ ...b })),
                    pageData: { ...processPageData },
                });
            }
        }
    }

    return {
        timeline,
        processPageData,
        finalMemBlocks: memBlocks,
        config,
    };
}

/**
 * Builds a synthetic page reference string for a process.
 * Uses a locality of reference model.
 */
function buildReferenceString(pageCount, length) {
    const refs = [];
    let current = Math.floor(Math.random() * pageCount);
    for (let i = 0; i < length; i++) {
        const r = Math.random();
        if (r < 0.6) {
            // Stay in current locality
            current = (current + Math.floor(Math.random() * 3) - 1 + pageCount) % pageCount;
        } else {
            // Jump to a new locality
            current = Math.floor(Math.random() * pageCount);
        }
        refs.push(current);
    }
    return refs;
}
