/**
 * N-Queens Interactive Constraint Optimization & Visualization System
 * Main Application Orchestrator
 */

import { NQueensEngine, STEP_TYPES } from './nqueensEngine.js';
import { BoardRenderer } from './boardRenderer.js';
import { audio } from './audioManager.js';
import { createQueenSVG } from './queenPiece.js';

class NQueensApp {
    constructor() {
        // State
        this.n = 8;
        this.algorithm = 'standard';
        this.theme = 'monochrome';
        this.stopAtFirst = false;
        this.speedMs = 250;
        this.isPlaying = false;
        this.timer = null;
        this.currentStepIdx = 0;
        this.steps = [];
        this.solutions = [];
        this.manualQueens = []; // [{row, col}] in sandbox mode
        this.sandboxActive = false;

        // Initialize submodules after DOM is ready
        this.initDOM();
        this.initModules();
        this.bindEvents();
        this.generateSimulation();
    }

    initDOM() {
        // Core Board Elements
        this.boardContainer = document.getElementById('chessboard-container');
        this.svgOverlay = document.getElementById('attack-overlay-svg');

        // High-level controls
        this.nInput = document.getElementById('input-n');
        this.nValDisplay = document.getElementById('val-n-display');
        this.algoSelect = document.getElementById('algorithm-select');
        this.themeSelect = document.getElementById('theme-select');
        this.stopFirstCheck = document.getElementById('stop-first-checkbox');
        this.raysToggle = document.getElementById('toggle-rays');
        this.heatmapToggle = document.getElementById('toggle-heatmap');
        this.soundToggle = document.getElementById('toggle-sound');
        this.sandboxToggle = document.getElementById('toggle-sandbox');

        // Playback buttons
        this.btnPlay = document.getElementById('btn-play');
        this.btnPause = document.getElementById('btn-pause');
        this.btnPrev = document.getElementById('btn-prev');
        this.btnNext = document.getElementById('btn-next');
        this.btnReset = document.getElementById('btn-reset');
        this.btnJumpSolution = document.getElementById('btn-jump-solution');
        this.speedSlider = document.getElementById('speed-slider');
        this.speedValDisplay = document.getElementById('speed-val-display');

        // Sandbox toolbar
        this.sandboxToolbar = document.getElementById('sandbox-toolbar');
        this.btnClearManual = document.getElementById('btn-clear-manual');
        this.btnSolveFromHere = document.getElementById('btn-solve-manual');
        this.btnManualHint = document.getElementById('btn-manual-hint');

        // Metric Counters
        this.metricSteps = document.getElementById('metric-steps');
        this.metricCalls = document.getElementById('metric-calls');
        this.metricBacktracks = document.getElementById('metric-backtracks');
        this.metricConflicts = document.getElementById('metric-conflicts');
        this.metricSolutions = document.getElementById('metric-solutions');
        this.metricDepth = document.getElementById('metric-depth');
        this.metricDepthBar = document.getElementById('depth-progress-bar');
        this.metricPruning = document.getElementById('metric-pruning');
        this.metricTime = document.getElementById('metric-time');

        // Complexities
        this.theoryNn = document.getElementById('theory-nn');
        this.theoryNfact = document.getElementById('theory-nfact');

        // Log Console & Gallery
        this.logContainer = document.getElementById('log-stream');
        this.btnClearLogs = document.getElementById('btn-clear-logs');
        this.solutionsGallery = document.getElementById('solutions-gallery');
        this.stepDescription = document.getElementById('step-description-text');
    }

    initModules() {
        this.renderer = new BoardRenderer(this.boardContainer, this.svgOverlay);
        this.renderer.init(this.n, this.theme);
    }

    bindEvents() {
        // N slider change
        this.nInput.addEventListener('input', (e) => {
            const newN = parseInt(e.target.value, 10);
            if (newN !== this.n) {
                this.n = newN;
                this.nValDisplay.textContent = this.n;
                this.manualQueens = [];
                this.stopPlayback();
                this.renderer.init(this.n, this.theme);
                this.generateSimulation();
            }
        });

        // Quick N buttons
        document.querySelectorAll('.btn-quick-n').forEach(btn => {
            btn.addEventListener('click', () => {
                const val = parseInt(btn.dataset.n, 10);
                this.nInput.value = val;
                this.n = val;
                this.nValDisplay.textContent = val;
                this.manualQueens = [];
                this.stopPlayback();
                this.renderer.init(this.n, this.theme);
                this.generateSimulation();
            });
        });

        // Algorithm change
        this.algoSelect.addEventListener('change', (e) => {
            this.algorithm = e.target.value;
            if (this.algorithm === 'bitwise') {
                this.runBitwiseBenchmark();
            } else {
                this.stopPlayback();
                this.generateSimulation();
            }
        });

        // Theme change
        this.themeSelect.addEventListener('change', (e) => {
            this.theme = e.target.value;
            this.renderer.setTheme(this.theme);
        });

        // First solution only toggle
        this.stopFirstCheck.addEventListener('change', (e) => {
            this.stopAtFirst = e.target.checked;
            this.stopPlayback();
            this.generateSimulation();
        });

        // Playback buttons
        this.btnPlay.addEventListener('click', () => this.startPlayback());
        this.btnPause.addEventListener('click', () => this.stopPlayback());
        this.btnNext.addEventListener('click', () => {
            this.stopPlayback();
            this.stepForward();
        });
        this.btnPrev.addEventListener('click', () => {
            this.stopPlayback();
            this.stepBackward();
        });
        this.btnReset.addEventListener('click', () => {
            this.stopPlayback();
            this.goToStep(0);
        });
        this.btnClearLogs.addEventListener('click', () => this.clearLogs());
        this.btnJumpSolution.addEventListener('click', () => {
            this.stopPlayback();
            this.jumpToNextSolution();
        });

        // Speed slider
        this.speedSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            // Inverted scale: higher slider value = faster (lower ms)
            // Slider 1 (slow) -> 800ms, Slider 100 (fast) -> 10ms
            this.speedMs = Math.round(800 - (val - 1) * 7.9);
            this.speedValDisplay.textContent = `${val}x (${this.speedMs}ms)`;
            if (this.isPlaying) {
                this.stopPlayback();
                this.startPlayback();
            }
        });

        // Attack rays toggle
        this.raysToggle.addEventListener('change', (e) => {
            this.renderer.setAttackRaysVisible(e.target.checked);
            this.applyCurrentStepVisuals();
        });

        // Heatmap toggle
        this.heatmapToggle.addEventListener('change', (e) => {
            this.renderer.setHeatmap(e.target.checked);
        });

        // Sound toggle
        this.soundToggle.addEventListener('click', () => {
            const isMuted = !audio.isMuted();
            audio.setMuted(isMuted);
            this.soundToggle.classList.toggle('active', !isMuted);
            this.soundToggle.querySelector('.label').textContent = isMuted ? 'Muted' : 'Audio On';
        });

        // Sandbox Mode toggle
        this.sandboxToggle.addEventListener('change', (e) => {
            this.setSandboxActive(e.target.checked);
        });

        // Sandbox actions
        this.btnClearManual.addEventListener('click', () => {
            this.manualQueens = [];
            this.renderer.syncQueens(new Array(this.n).fill(-1));
            this.renderer.clearOverlay();
            this.updateManualThreats();
        });

        this.btnSolveFromHere.addEventListener('click', () => {
            this.stopPlayback();
            this.sandboxToggle.checked = false;
            this.setSandboxActive(false);
            this.generateSimulation(this.manualQueens);
            this.startPlayback();
        });

        this.btnManualHint.addEventListener('click', () => {
            this.provideManualHint();
        });
    }

    setSandboxActive(active) {
        this.sandboxActive = active;
        this.sandboxToolbar.style.display = active ? 'flex' : 'none';
        this.stopPlayback();

        if (active) {
            this.renderer.setSandboxMode(true, (row, col) => this.handleCellManualClick(row, col));
            this.renderer.syncQueens(this.manualQueensArray());
            this.stepDescription.textContent = 'Sandbox Mode Active: Click any square on the board to place or remove a Queen.';
            this.updateManualThreats();
        } else {
            this.renderer.setSandboxMode(false, null);
            this.goToStep(this.currentStepIdx);
        }
    }

    manualQueensArray() {
        const arr = new Array(this.n).fill(-1);
        for (const q of this.manualQueens) {
            arr[q.row] = q.col;
        }
        return arr;
    }

    handleCellManualClick(row, col) {
        const existingIdx = this.manualQueens.findIndex(q => q.row === row && q.col === col);
        if (existingIdx !== -1) {
            // Remove queen
            this.manualQueens.splice(existingIdx, 1);
            audio.playBacktrack();
        } else {
            // Check if there is already a queen in this row
            const sameRowIdx = this.manualQueens.findIndex(q => q.row === row);
            if (sameRowIdx !== -1) {
                this.manualQueens.splice(sameRowIdx, 1);
            }
            this.manualQueens.push({ row, col });
            audio.playPiecePlace();
        }

        this.renderer.syncQueens(this.manualQueensArray());
        this.updateManualThreats();
    }

    updateManualThreats() {
        const b = this.manualQueensArray();
        this.renderer.clearOverlay();

        // Check for conflicts between manual queens
        let hasConflict = false;
        for (let i = 0; i < this.manualQueens.length; i++) {
            for (let j = i + 1; j < this.manualQueens.length; j++) {
                const q1 = this.manualQueens[i];
                const q2 = this.manualQueens[j];
                const sameCol = q1.col === q2.col;
                const sameDiag = Math.abs(q1.row - q2.row) === Math.abs(q1.col - q2.col);
                if (sameCol || sameDiag) {
                    hasConflict = true;
                    this.renderer.drawConflictIndicator(q1.row, q1.col, q2.row, q2.col, sameCol ? 'Column' : 'Diagonal');
                    audio.playConflict();
                    break;
                }
            }
            if (hasConflict) break;
        }

        if (this.heatmapToggle.checked) {
            this.renderer.updateHeatmap();
        }

        this.stepDescription.textContent = hasConflict
            ? '⚠️ Conflict detected between placed Queens! Look at the red warning beam.'
            : `Placed ${this.manualQueens.length}/${this.n} Queens with zero mutual conflicts.`;
    }

    provideManualHint() {
        const board = this.manualQueensArray();
        // Find next empty row
        let targetRow = -1;
        for (let r = 0; r < this.n; r++) {
            if (board[r] === -1) {
                targetRow = r;
                break;
            }
        }

        if (targetRow === -1) {
            this.stepDescription.textContent = 'All rows already have a queen placed!';
            return;
        }

        // Test safe columns
        for (let c = 0; c < this.n; c++) {
            let safe = true;
            for (let r = 0; r < this.n; r++) {
                if (board[r] !== -1) {
                    if (board[r] === c || Math.abs(r - targetRow) === Math.abs(board[r] - c)) {
                        safe = false;
                        break;
                    }
                }
            }
            if (safe) {
                this.manualQueens.push({ row: targetRow, col: c });
                this.renderer.syncQueens(this.manualQueensArray());
                audio.playPiecePlace();
                this.updateManualThreats();
                this.stepDescription.textContent = `💡 Hint applied: Safe placement at Row ${targetRow + 1}, Col ${c + 1} (${String.fromCharCode(65 + c)}${this.n - targetRow}).`;
                return;
            }
        }

        this.stepDescription.textContent = `❌ No safe position exists for Row ${targetRow + 1} with current placement. You must backtrack!`;
        audio.playConflict();
    }

    /**
     * Generates the trace of steps from the Backtracking Engine
     */
    generateSimulation(initialQueens = []) {
        this.engine = new NQueensEngine(this.n, this.algorithm);
        const result = this.engine.generateTrace(this.stopAtFirst, initialQueens);

        this.steps = result.steps;
        this.solutions = result.solutions;
        this.metrics = result.metrics;
        this.currentStepIdx = 0;

        this.updateTheoreticalComplexities();
        this.renderSolutionsGallery();
        this.populateLogsStream();
        this.goToStep(0);
    }

    updateTheoreticalComplexities() {
        const N = this.n;
        const totalSearchSpace = Math.pow(N, N);
        const permutations = this.factorial(N);

        this.theoryNn.textContent = totalSearchSpace > 1e15 ? totalSearchSpace.toExponential(2) : totalSearchSpace.toLocaleString();
        this.theoryNfact.textContent = permutations > 1e15 ? permutations.toExponential(2) : permutations.toLocaleString();
    }

    factorial(num) {
        let res = 1;
        for (let i = 2; i <= num; i++) res *= i;
        return res;
    }

    runBitwiseBenchmark() {
        this.stopPlayback();
        const res = NQueensEngine.benchmarkBitwise(this.n);
        this.stepDescription.innerHTML = `
            ⚡ <strong>Bitwise Optimization Benchmark (N=${this.n}):</strong> 
            Found <strong>${res.solutionsCount}</strong> total solutions in <strong>${res.timeMs} ms</strong> 
            visiting <strong>${res.nodesVisited.toLocaleString()}</strong> states using CPU bitwise operators 
            <code>(cols | ld | rd)</code>.
        `;
        audio.playVictory();
    }

    /**
     * Stepper Navigation
     */
    startPlayback() {
        if (this.isPlaying) return;
        if (this.currentStepIdx >= this.steps.length - 1) {
            this.currentStepIdx = 0;
        }

        this.isPlaying = true;
        this.btnPlay.style.display = 'none';
        this.btnPause.style.display = 'inline-flex';

        this.timer = setInterval(() => {
            if (this.currentStepIdx < this.steps.length - 1) {
                this.stepForward(true);
            } else {
                this.stopPlayback();
            }
        }, this.speedMs);
    }

    stopPlayback() {
        this.isPlaying = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        if (this.btnPlay && this.btnPause) {
            this.btnPlay.style.display = 'inline-flex';
            this.btnPause.style.display = 'none';
        }
    }

    stepForward(fromAutoPlay = false) {
        if (this.currentStepIdx < this.steps.length - 1) {
            this.currentStepIdx++;
            this.applyCurrentStepVisuals();
            if (!fromAutoPlay) audio.playStep();
        }
    }

    stepBackward() {
        if (this.currentStepIdx > 0) {
            this.currentStepIdx--;
            this.applyCurrentStepVisuals();
            audio.playStep();
        }
    }

    goToStep(index) {
        this.currentStepIdx = Math.max(0, Math.min(index, this.steps.length - 1));
        this.applyCurrentStepVisuals();
    }

    jumpToNextSolution() {
        for (let i = this.currentStepIdx + 1; i < this.steps.length; i++) {
            if (this.steps[i].type === STEP_TYPES.SOLUTION_FOUND) {
                this.goToStep(i);
                return;
            }
        }
        // If none forward, look from beginning
        for (let i = 0; i < this.currentStepIdx; i++) {
            if (this.steps[i].type === STEP_TYPES.SOLUTION_FOUND) {
                this.goToStep(i);
                return;
            }
        }
    }

    /**
     * Applies the visual state of the current step
     */
    applyCurrentStepVisuals() {
        const step = this.steps[this.currentStepIdx];
        if (!step) return;

        // Sync board
        let candidate = null;
        let conflict = null;

        if (step.row >= 0 && step.col >= 0) {
            candidate = { row: step.row, col: step.col };
        }

        if (step.type === STEP_TYPES.CONFLICT_DETECTED && step.conflictWith) {
            conflict = {
                from: step.conflictWith,
                to: { row: step.row, col: step.col }
            };
        }

        this.renderer.syncQueens(step.board, candidate, conflict);

        // Overlay rays / conflict indicators
        this.renderer.clearOverlay();
        if (step.type === STEP_TYPES.CONSTRAINT_CHECK && this.raysToggle.checked) {
            this.renderer.drawAttackRays(step.row, step.col, step.rays, step.safe);
        } else if (step.type === STEP_TYPES.CONFLICT_DETECTED && step.conflictWith) {
            this.renderer.drawConflictIndicator(
                step.row, step.col,
                step.conflictWith.row, step.conflictWith.col,
                step.axis
            );
        }

        // Sound triggers based on step action
        if (step.type === STEP_TYPES.PLACE_QUEEN) {
            audio.playPiecePlace();
        } else if (step.type === STEP_TYPES.CONFLICT_DETECTED) {
            audio.playConflict();
        } else if (step.type === STEP_TYPES.BACKTRACK) {
            audio.playBacktrack();
        } else if (step.type === STEP_TYPES.SOLUTION_FOUND) {
            audio.playVictory();
            this.renderer.triggerVictoryAnimation();
        }

        // Update step description
        this.stepDescription.textContent = step.description || '';

        // Update live metrics
        this.updateLiveMetrics(step);

        // Highlight log item & reveal solutions discovered so far
        this.highlightActiveLog(step.stepIndex);
        this.syncSolutionsGallery(step.stepIndex);
    }

    updateLiveMetrics(currentStep) {
        this.metricSteps.textContent = `${this.currentStepIdx + 1} / ${this.steps.length}`;

        // Compute running stats up to current step
        let calls = 0;
        let backtracks = 0;
        let conflicts = 0;
        let solutions = 0;
        let maxRow = 0;

        for (let i = 0; i <= this.currentStepIdx; i++) {
            const s = this.steps[i];
            if (s.type === STEP_TYPES.INSPECT_CELL) calls++;
            if (s.type === STEP_TYPES.BACKTRACK) backtracks++;
            if (s.type === STEP_TYPES.CONFLICT_DETECTED) conflicts++;
            if (s.type === STEP_TYPES.SOLUTION_FOUND) solutions++;
            if (s.row >= 0 && s.row > maxRow) maxRow = s.row;
        }

        this.metricCalls.textContent = calls.toLocaleString();
        this.metricBacktracks.textContent = backtracks.toLocaleString();
        this.metricConflicts.textContent = conflicts.toLocaleString();
        this.metricSolutions.textContent = solutions.toLocaleString();

        const currentDepth = Math.max(0, currentStep.row + 1);
        this.metricDepth.textContent = `Depth: ${currentDepth} / ${this.n}`;
        const pct = (currentDepth / this.n) * 100;
        this.metricDepthBar.style.width = `${pct}%`;

        // Pruning calculation
        const theoretical = Math.pow(this.n, this.n);
        const prunedRatio = (1 - (calls / theoretical)) * 100;
        this.metricPruning.textContent = `${prunedRatio.toFixed(2)}%`;

        this.metricTime.textContent = `${this.metrics.executionTimeMs} ms`;
    }

    /**
     * Renders solution thumbnails in the Gallery drawer
     */
    /**
     * Solutions Gallery
     * Cards are built up front but only shown once playback reaches the step
     * where each solution is discovered, so every run starts with an empty gallery.
     */
    renderSolutionsGallery() {
        if (!this.solutionsGallery) return;
        this.solutionsGallery.innerHTML = '';

        // Step index at which each solution is found (sorted ascending)
        this.solutionStepIdx = this.steps
            .filter(s => s.type === STEP_TYPES.SOLUTION_FOUND)
            .map(s => s.stepIndex);
        this.solutionCards = this.solutions.map((sol, idx) => this.createSolutionCard(sol, idx));
        this.solutionsShown = -1;

        this.syncSolutionsGallery(0);
    }

    syncSolutionsGallery(stepIndex) {
        if (!this.solutionsGallery || !this.solutionCards) return;

        let count = 0;
        while (count < this.solutionStepIdx.length && this.solutionStepIdx[count] <= stepIndex) count++;
        const isComplete = stepIndex >= this.steps.length - 1;

        if (count === 0) {
            const msg = isComplete
                ? `No solutions for N=${this.n}`
                : 'Searching for solutions...';
            const empty = this.solutionsGallery.querySelector('.empty-gallery');
            if (this.solutionsShown !== 0 || !empty || empty.textContent !== msg) {
                this.solutionsGallery.innerHTML = `<div class="empty-gallery">${msg}</div>`;
            }
            this.solutionsShown = 0;
            return;
        }

        if (this.solutionsShown <= 0) {
            this.solutionsGallery.innerHTML = '';
            this.solutionsShown = 0;
        }

        if (count < this.solutionsShown) {
            for (let i = this.solutionsShown; i > count; i--) {
                this.solutionsGallery.lastElementChild?.remove();
            }
        } else if (count > this.solutionsShown) {
            const frag = document.createDocumentFragment();
            for (let i = this.solutionsShown; i < count; i++) {
                frag.appendChild(this.solutionCards[i]);
            }
            this.solutionsGallery.appendChild(frag);
        }
        this.solutionsShown = count;
    }

    createSolutionCard(sol, idx) {
        const card = document.createElement('div');
        card.className = 'solution-card';
        card.id = `sol-card-${idx}`;

        // Mini board representation
        const miniBoard = document.createElement('div');
        miniBoard.className = 'mini-chessboard';
        miniBoard.style.setProperty('--mini-n', this.n);

        for (let r = 0; r < this.n; r++) {
            for (let c = 0; c < this.n; c++) {
                const miniCell = document.createElement('div');
                const isLight = (r + c) % 2 === 0;
                miniCell.className = `mini-cell ${isLight ? 'light' : 'dark'}`;
                if (sol[r] === c) {
                    miniCell.classList.add('has-queen');
                    miniCell.innerHTML = '♛';
                }
                miniBoard.appendChild(miniCell);
            }
        }

        const label = document.createElement('div');
        label.className = 'sol-label';
        label.textContent = `Solution #${idx + 1}`;

        const notation = document.createElement('div');
        notation.className = 'sol-notation';
        // Notation: e.g. [A4, B2, C7, ...]
        const coords = sol.map((c, r) => `${String.fromCharCode(65 + c)}${this.n - r}`).join(' ');
        notation.textContent = coords;

        card.appendChild(miniBoard);
        card.appendChild(label);
        card.appendChild(notation);

        // Click to view solution directly
        card.addEventListener('click', () => {
            this.stopPlayback();
            // Find step where this solution was recorded
            const targetStepIdx = this.steps.findIndex(s => s.type === STEP_TYPES.SOLUTION_FOUND && s.solutionIndex === idx + 1);
            if (targetStepIdx !== -1) {
                this.goToStep(targetStepIdx);
            } else {
                this.renderer.syncQueens(sol);
            }
        });

        return card;
    }

    /**
     * Log Stream Management
     * Entries are rendered live: only milestones up to the current step are shown,
     * so each new run starts with an empty log.
     */
    populateLogsStream() {
        if (!this.logContainer) return;
        this.logContainer.innerHTML = '';

        // Filter meaningful milestone steps to avoid bloating DOM
        this.logMilestones = this.steps.filter((s, idx) =>
            idx === 0 ||
            s.type === STEP_TYPES.PLACE_QUEEN ||
            s.type === STEP_TYPES.CONFLICT_DETECTED ||
            s.type === STEP_TYPES.BACKTRACK ||
            s.type === STEP_TYPES.SOLUTION_FOUND ||
            s.type === STEP_TYPES.COMPLETE
        );

        // Rendered window is milestones [logStart, logEnd)
        this.logStart = 0;
        this.logEnd = 0;
    }

    createLogEntry(step) {
        const item = document.createElement('div');
        item.className = `log-entry log-${step.type.toLowerCase()}`;
        item.id = `log-item-${step.stepIndex}`;
        item.dataset.stepIndex = step.stepIndex;

        const tagMap = {
            [STEP_TYPES.START]: 'INIT',
            [STEP_TYPES.PLACE_QUEEN]: 'PLACE',
            [STEP_TYPES.CONFLICT_DETECTED]: 'CONFLICT',
            [STEP_TYPES.BACKTRACK]: 'BACKTRACK',
            [STEP_TYPES.SOLUTION_FOUND]: 'SOLUTION',
            [STEP_TYPES.COMPLETE]: 'COMPLETE'
        };

        item.innerHTML = `
            <span class="log-tag tag-${step.type.toLowerCase()}">${tagMap[step.type] || 'STEP'}</span>
            <span class="log-step-num">#${step.stepIndex}</span>
            <span class="log-text">${step.description}</span>
        `;

        item.addEventListener('click', () => {
            this.stopPlayback();
            this.goToStep(step.stepIndex);
        });

        return item;
    }

    clearLogs() {
        if (!this.logContainer) return;
        this.logContainer.innerHTML = '';
        this.logStart = this.logEnd;
    }

    highlightActiveLog(stepIndex) {
        if (!this.logContainer || !this.logMilestones) return;

        // Number of milestones with stepIndex <= current step (binary search)
        let lo = 0, hi = this.logMilestones.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (this.logMilestones[mid].stepIndex <= stepIndex) lo = mid + 1;
            else hi = mid;
        }
        const target = lo;

        // Returning to the start of a run always begins with a fresh log
        if (stepIndex === 0 || target < this.logStart) {
            this.logContainer.innerHTML = '';
            this.logStart = 0;
            this.logEnd = 0;
        }

        if (target < this.logEnd) {
            // Stepped backward: drop entries beyond the current step
            for (let i = this.logEnd; i > target; i--) {
                this.logContainer.lastElementChild?.remove();
            }
        } else if (target > this.logEnd) {
            const frag = document.createDocumentFragment();
            for (let i = this.logEnd; i < target; i++) {
                frag.appendChild(this.createLogEntry(this.logMilestones[i]));
            }
            this.logContainer.appendChild(frag);
        }
        this.logEnd = target;

        const prev = this.logContainer.querySelector('.log-entry.active');
        if (prev) prev.classList.remove('active');

        const activeEl = this.logContainer.lastElementChild;
        if (activeEl) {
            activeEl.classList.add('active');
            activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
    window.nqueensApp = new NQueensApp();
});
