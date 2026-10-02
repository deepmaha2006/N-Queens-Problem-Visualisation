/**
 * N-Queens Backtracking & Constraint Optimization Engine
 * Supports Standard Backtracking, Branch & Bound Lookup Arrays, and Ultra-Fast Bitwise Solver.
 * Generates an event stream of recorded steps for bidirectional interactive playback.
 */

export const STEP_TYPES = {
    START: 'START',
    INSPECT_CELL: 'INSPECT_CELL',
    CONSTRAINT_CHECK: 'CONSTRAINT_CHECK',
    CONFLICT_DETECTED: 'CONFLICT_DETECTED',
    PLACE_QUEEN: 'PLACE_QUEEN',
    RECURSE: 'RECURSE',
    SOLUTION_FOUND: 'SOLUTION_FOUND',
    BACKTRACK: 'BACKTRACK',
    COMPLETE: 'COMPLETE'
};

export class NQueensEngine {
    constructor(n = 8, algorithm = 'standard') {
        this.n = n;
        this.algorithm = algorithm;
        this.steps = [];
        this.solutions = [];
        this.metrics = {
            totalSteps: 0,
            recursiveCalls: 0,
            backtracks: 0,
            conflictChecks: 0,
            conflictsFound: 0,
            solutionsFound: 0,
            startTime: 0,
            endTime: 0,
            executionTimeMs: 0
        };
    }

    /**
     * Solves and records every step for interactive visualization
     */
    generateTrace(stopAtFirstSolution = false, initialQueens = []) {
        this.steps = [];
        this.solutions = [];
        this.metrics = {
            totalSteps: 0,
            recursiveCalls: 0,
            backtracks: 0,
            conflictChecks: 0,
            conflictsFound: 0,
            solutionsFound: 0,
            startTime: performance.now(),
            endTime: 0,
            executionTimeMs: 0
        };

        const board = new Array(this.n).fill(-1); // board[row] = col
        this.recordStep({
            type: STEP_TYPES.START,
            board: [...board],
            row: 0,
            col: -1,
            description: `Initialized ${this.n}x${this.n} board. Starting backtracking search.`,
            codeLine: 1
        });

        // If manual initial queens are given, place them
        let startRow = 0;
        if (initialQueens && initialQueens.length > 0) {
            for (const q of initialQueens) {
                if (q.row >= 0 && q.row < this.n && q.col >= 0 && q.col < this.n) {
                    board[q.row] = q.col;
                    startRow = Math.max(startRow, q.row + 1);
                }
            }
        }

        if (this.algorithm === 'optimized') {
            this._solveOptimized(board, startRow, stopAtFirstSolution);
        } else {
            this._solveStandard(board, startRow, stopAtFirstSolution);
        }

        this.metrics.endTime = performance.now();
        this.metrics.executionTimeMs = (this.metrics.endTime - this.metrics.startTime).toFixed(2);

        this.recordStep({
            type: STEP_TYPES.COMPLETE,
            board: [...board],
            row: -1,
            col: -1,
            description: `Search completed. Found ${this.solutions.length} solution(s) in ${this.metrics.executionTimeMs}ms.`,
            codeLine: 20
        });

        return {
            steps: this.steps,
            solutions: this.solutions,
            metrics: this.metrics
        };
    }

    recordStep(stepData) {
        this.metrics.totalSteps++;
        this.steps.push({
            stepIndex: this.steps.length,
            ...stepData,
            timestamp: performance.now()
        });
    }

    /**
     * Standard Classical Backtracking with Iterative Ray Constraint Checks
     */
    _solveStandard(board, row, stopAtFirstSolution) {
        this.metrics.recursiveCalls++;

        // Base case: All N queens successfully placed!
        if (row === this.n) {
            this.metrics.solutionsFound++;
            const sol = [...board];
            this.solutions.push(sol);

            this.recordStep({
                type: STEP_TYPES.SOLUTION_FOUND,
                board: sol,
                row: row - 1,
                col: board[row - 1],
                solutionIndex: this.solutions.length,
                description: `Solution #${this.solutions.length} found! All ${this.n} queens placed with zero conflicts.`,
                codeLine: 3
            });

            return stopAtFirstSolution;
        }

        // Try placing queen on each column of current row
        for (let col = 0; col < this.n; col++) {
            this.recordStep({
                type: STEP_TYPES.INSPECT_CELL,
                board: [...board],
                row,
                col,
                description: `Testing placement at Row ${row + 1}, Col ${col + 1} (${String.fromCharCode(65 + col)}${this.n - row}).`,
                codeLine: 6
            });

            // Constraint checking
            const check = this._checkConstraintsDetailed(board, row, col);
            this.metrics.conflictChecks += check.checksCount;

            this.recordStep({
                type: STEP_TYPES.CONSTRAINT_CHECK,
                board: [...board],
                row,
                col,
                rays: check.rays,
                safe: check.isSafe,
                description: `Checking attack lines: vertical column, left diagonal, and right diagonal.`,
                codeLine: 7
            });

            if (!check.isSafe) {
                this.metrics.conflictsFound++;
                this.recordStep({
                    type: STEP_TYPES.CONFLICT_DETECTED,
                    board: [...board],
                    row,
                    col,
                    conflictWith: check.conflictWith,
                    axis: check.axis,
                    description: `Constraint conflict! Attacked by Queen at (${check.conflictWith.row + 1}, ${check.conflictWith.col + 1}) along ${check.axis}.`,
                    codeLine: 8
                });
                continue; // Pruned by constraint violation!
            }

            // Valid placement!
            board[row] = col;
            this.recordStep({
                type: STEP_TYPES.PLACE_QUEEN,
                board: [...board],
                row,
                col,
                description: `Position safe! Placed Queen at (${row + 1}, ${col + 1}). Recursing to Row ${row + 2}.`,
                codeLine: 10
            });

            const foundStop = this._solveStandard(board, row + 1, stopAtFirstSolution);
            if (foundStop) return true;

            // Backtrack: Remove queen and explore next column
            this.metrics.backtracks++;
            board[row] = -1;
            this.recordStep({
                type: STEP_TYPES.BACKTRACK,
                board: [...board],
                row,
                col,
                description: `Backtracking from (${row + 1}, ${col + 1}). Removing queen and testing subsequent columns.`,
                codeLine: 14
            });
        }

        return false;
    }

    /**
     * Optimized Backtracking using Lookup Arrays (O(1) Branch & Bound check)
     */
    _solveOptimized(board, row, stopAtFirstSolution) {
        // Initialize lookup masks
        const cols = new Array(this.n).fill(false);
        const diag1 = new Array(2 * this.n).fill(false); // row - col + n - 1
        const diag2 = new Array(2 * this.n).fill(false); // row + col

        // Pre-fill existing placements
        for (let r = 0; r < row; r++) {
            const c = board[r];
            if (c !== -1) {
                cols[c] = true;
                diag1[r - c + this.n - 1] = true;
                diag2[r + c] = true;
            }
        }

        const helper = (r) => {
            this.metrics.recursiveCalls++;
            if (r === this.n) {
                this.metrics.solutionsFound++;
                const sol = [...board];
                this.solutions.push(sol);

                this.recordStep({
                    type: STEP_TYPES.SOLUTION_FOUND,
                    board: sol,
                    row: r - 1,
                    col: board[r - 1],
                    solutionIndex: this.solutions.length,
                    description: `Solution #${this.solutions.length} found with O(1) branch-and-bound lookup masks!`,
                    codeLine: 3
                });

                return stopAtFirstSolution;
            }

            for (let c = 0; c < this.n; c++) {
                this.recordStep({
                    type: STEP_TYPES.INSPECT_CELL,
                    board: [...board],
                    row: r,
                    col: c,
                    description: `O(1) Mask lookup for cell (${r + 1}, ${c + 1}).`,
                    codeLine: 6
                });

                this.metrics.conflictChecks++;
                const d1 = r - c + this.n - 1;
                const d2 = r + c;

                const isConflicted = cols[c] || diag1[d1] || diag2[d2];

                if (isConflicted) {
                    this.metrics.conflictsFound++;
                    let conflictReason = cols[c] ? 'Column Mask' : (diag1[d1] ? 'Main Diagonal Mask' : 'Anti-Diagonal Mask');
                    this.recordStep({
                        type: STEP_TYPES.CONFLICT_DETECTED,
                        board: [...board],
                        row: r,
                        col: c,
                        axis: conflictReason,
                        description: `Instant constraint rejection via ${conflictReason}.`,
                        codeLine: 8
                    });
                    continue;
                }

                // Place
                board[r] = c;
                cols[c] = true;
                diag1[d1] = true;
                diag2[d2] = true;

                this.recordStep({
                    type: STEP_TYPES.PLACE_QUEEN,
                    board: [...board],
                    row: r,
                    col: c,
                    description: `Masks clear. Placed Queen at (${r + 1}, ${c + 1}). Proceeding to row ${r + 2}.`,
                    codeLine: 10
                });

                const stop = helper(r + 1);
                if (stop) return true;

                // Backtrack
                this.metrics.backtracks++;
                board[r] = -1;
                cols[c] = false;
                diag1[d1] = false;
                diag2[d2] = false;

                this.recordStep({
                    type: STEP_TYPES.BACKTRACK,
                    board: [...board],
                    row: r,
                    col: c,
                    description: `Backtracking: Unmarked masks for (${r + 1}, ${c + 1}).`,
                    codeLine: 14
                });
            }
            return false;
        };

        helper(row);
    }

    /**
     * Performs detailed safety check returning ray trajectories and conflict source
     */
    _checkConstraintsDetailed(board, row, col) {
        let checksCount = 0;
        const rays = {
            column: [],
            leftDiag: [],
            rightDiag: []
        };

        // 1. Check vertically above (same column)
        for (let i = row - 1; i >= 0; i--) {
            checksCount++;
            rays.column.push({ row: i, col });
            if (board[i] === col) {
                return {
                    isSafe: false,
                    conflictWith: { row: i, col },
                    axis: 'Vertical Column',
                    rays,
                    checksCount
                };
            }
        }

        // 2. Check upper-left diagonal
        for (let i = row - 1, j = col - 1; i >= 0 && j >= 0; i--, j--) {
            checksCount++;
            rays.leftDiag.push({ row: i, col: j });
            if (board[i] === j) {
                return {
                    isSafe: false,
                    conflictWith: { row: i, col: j },
                    axis: 'Upper-Left Diagonal',
                    rays,
                    checksCount
                };
            }
        }

        // 3. Check upper-right diagonal
        for (let i = row - 1, j = col + 1; i >= 0 && j < this.n; i--, j++) {
            checksCount++;
            rays.rightDiag.push({ row: i, col: j });
            if (board[i] === j) {
                return {
                    isSafe: false,
                    conflictWith: { row: i, col: j },
                    axis: 'Upper-Right Diagonal',
                    rays,
                    checksCount
                };
            }
        }

        return {
            isSafe: true,
            conflictWith: null,
            axis: null,
            rays,
            checksCount
        };
    }

    /**
     * Static Bitwise Solver for instantaneous benchmark comparison
     * Solves N-Queens using low-bit extraction (cols | ld | rd) in microseconds.
     */
    static benchmarkBitwise(n) {
        const start = performance.now();
        let count = 0;
        let nodesVisited = 0;
        const allMask = (1 << n) - 1;

        function solve(cols, ld, rd) {
            nodesVisited++;
            if (cols === allMask) {
                count++;
                return;
            }
            // Candidate safe bits
            let safeBits = allMask & ~(cols | ld | rd);
            while (safeBits > 0) {
                const bit = safeBits & -safeBits; // isolate lowest set bit
                safeBits -= bit;
                solve(cols | bit, (ld | bit) << 1, (rd | bit) >> 1);
            }
        }

        solve(0, 0, 0);
        const end = performance.now();
        return {
            n,
            solutionsCount: count,
            nodesVisited,
            timeMs: (end - start).toFixed(3)
        };
    }
}
