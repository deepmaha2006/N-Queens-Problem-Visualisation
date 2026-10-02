/**
 * Dynamic Chessboard & Threat Visualization Renderer
 * Handles rendering the physical board, realistic 3D SVG queens,
 * animated constraint attack rays, collision indicator beams, and threat heatmaps.
 */

import { createQueenSVG } from './queenPiece.js';

export class BoardRenderer {
    constructor(boardContainer, svgOverlay) {
        this.boardContainer = boardContainer;
        this.svgOverlay = svgOverlay;
        this.n = 8;
        this.theme = 'monochrome'; // 'monochrome', 'obsidian', 'classic'
        this.showCoordinates = true;
        this.showHeatmap = false;
        this.showAttackRays = true;
        this.sandboxMode = false;
        this.onCellClick = null;

        // Internal state
        this.queenPositions = []; // array of col indices per row, -1 if none
        this.activeCandidate = null; // { row, col }
        this.activeConflict = null; // { from: {row, col}, to: {row, col} }
        this.activeRays = null;
    }

    /**
     * Initializes a new board of size N x N
     */
    init(n, theme = this.theme) {
        this.n = n;
        this.theme = theme;
        this.queenPositions = new Array(n).fill(-1);
        this.activeCandidate = null;
        this.activeConflict = null;
        this.activeRays = null;

        this.renderBoardSkeleton();
        this.clearOverlay();
    }

    setTheme(theme) {
        this.theme = theme;
        if (this.boardContainer) {
            this.boardContainer.className = `chessboard theme-${theme}`;
        }
        // Re-render queens to apply new metal shader
        this.syncQueens(this.queenPositions);
    }

    setHeatmap(enabled) {
        this.showHeatmap = enabled;
        this.updateHeatmap();
    }

    setAttackRaysVisible(visible) {
        this.showAttackRays = visible;
        if (!visible) {
            this.clearOverlay();
        }
    }

    setSandboxMode(enabled, clickCallback) {
        this.sandboxMode = enabled;
        this.onCellClick = clickCallback;
        if (this.boardContainer) {
            this.boardContainer.classList.toggle('sandbox-active', enabled);
        }
    }

    /**
     * Constructs the grid and coordinate labels
     */
    renderBoardSkeleton() {
        if (!this.boardContainer) return;

        this.boardContainer.innerHTML = '';
        this.boardContainer.className = `chessboard theme-${this.theme}`;
        this.boardContainer.style.setProperty('--grid-size', this.n);

        // Build grid cells
        for (let r = 0; r < this.n; r++) {
            for (let c = 0; c < this.n; c++) {
                const cell = document.createElement('div');
                const isLight = (r + c) % 2 === 0;
                cell.className = `board-cell ${isLight ? 'light-cell' : 'dark-cell'}`;
                cell.id = `cell-${r}-${c}`;
                cell.dataset.row = r;
                cell.dataset.col = c;

                // Rank and file labels
                if (this.showCoordinates) {
                    if (c === 0) {
                        const rankLabel = document.createElement('span');
                        rankLabel.className = 'coord-label rank-label';
                        rankLabel.textContent = this.n - r;
                        cell.appendChild(rankLabel);
                    }
                    if (r === this.n - 1) {
                        const fileLabel = document.createElement('span');
                        fileLabel.className = 'coord-label file-label';
                        fileLabel.textContent = String.fromCharCode(65 + c);
                        cell.appendChild(fileLabel);
                    }
                }

                // Heatmap threat counter badge placeholder
                const threatBadge = document.createElement('div');
                threatBadge.className = 'threat-badge';
                cell.appendChild(threatBadge);

                // Container for piece
                const pieceSlot = document.createElement('div');
                pieceSlot.className = 'piece-slot';
                cell.appendChild(pieceSlot);

                // Click event for interactive sandbox
                cell.addEventListener('click', () => {
                    if (this.onCellClick) {
                        this.onCellClick(r, c);
                    }
                });

                this.boardContainer.appendChild(cell);
            }
        }
    }

    /**
     * Synchronizes the displayed queens with the board array
     */
    syncQueens(boardArray, candidate = null, conflict = null) {
        this.queenPositions = [...boardArray];
        this.activeCandidate = candidate;
        this.activeConflict = conflict;

        for (let r = 0; r < this.n; r++) {
            for (let c = 0; c < this.n; c++) {
                const cell = document.getElementById(`cell-${r}-${c}`);
                if (!cell) continue;

                const pieceSlot = cell.querySelector('.piece-slot');
                if (!pieceSlot) continue;

                // Reset cell highlight classes
                cell.classList.remove('cell-candidate', 'cell-conflict', 'cell-safe', 'cell-placed');

                const hasPlacedQueen = boardArray[r] === c;
                const isCandidateCell = candidate && candidate.row === r && candidate.col === c;
                const isConflictSource = conflict && conflict.from && conflict.from.row === r && conflict.from.col === c;

                if (hasPlacedQueen) {
                    cell.classList.add('cell-placed');
                    if (isConflictSource) {
                        cell.classList.add('cell-conflict');
                        pieceSlot.innerHTML = createQueenSVG({ theme: this.theme, state: 'conflict' });
                    } else {
                        // Check if piece already there to prevent re-triggering animation unnecessarily
                        if (!pieceSlot.querySelector('.chess-queen-svg')) {
                            pieceSlot.innerHTML = createQueenSVG({ theme: this.theme, state: 'placed' });
                            pieceSlot.classList.add('piece-drop');
                        }
                    }
                } else if (isCandidateCell) {
                    if (conflict) {
                        cell.classList.add('cell-conflict');
                        pieceSlot.innerHTML = createQueenSVG({ theme: this.theme, state: 'conflict' });
                    } else {
                        cell.classList.add('cell-candidate');
                        pieceSlot.innerHTML = createQueenSVG({ theme: this.theme, state: 'testing' });
                    }
                } else {
                    pieceSlot.innerHTML = '';
                    pieceSlot.classList.remove('piece-drop');
                }
            }
        }

        if (this.showHeatmap) {
            this.updateHeatmap();
        }
    }

    /**
     * Highlights laser attack rays shooting from candidate cell
     */
    drawAttackRays(row, col, rays, isSafe) {
        if (!this.showAttackRays || !this.svgOverlay) return;

        this.clearOverlay();
        const boardRect = this.boardContainer.getBoundingClientRect();
        if (boardRect.width === 0) return;

        const cellWidth = boardRect.width / this.n;
        const cellHeight = boardRect.height / this.n;

        const startX = (col + 0.5) * cellWidth;
        const startY = (row + 0.5) * cellHeight;

        const rayPaths = [];
        const rayColor = isSafe ? '#00e676' : '#ff5252';

        // Helper to draw beam
        const addBeam = (r, c) => {
            const endX = (c + 0.5) * cellWidth;
            const endY = (r + 0.5) * cellHeight;
            rayPaths.push(`M ${startX} ${startY} L ${endX} ${endY}`);
        };

        if (rays) {
            if (rays.column && rays.column.length > 0) {
                const top = rays.column[rays.column.length - 1];
                addBeam(top.row, top.col);
            }
            if (rays.leftDiag && rays.leftDiag.length > 0) {
                const corner = rays.leftDiag[rays.leftDiag.length - 1];
                addBeam(corner.row, corner.col);
            }
            if (rays.rightDiag && rays.rightDiag.length > 0) {
                const corner = rays.rightDiag[rays.rightDiag.length - 1];
                addBeam(corner.row, corner.col);
            }
        }

        this.svgOverlay.innerHTML = `
            <defs>
                <filter id="laser-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            ${rayPaths.map(d => `
                <path d="${d}" stroke="${rayColor}" stroke-width="3" stroke-linecap="round" 
                      stroke-dasharray="8 4" class="laser-beam" filter="url(#laser-glow)" />
            `).join('')}
        `;
    }

    /**
     * Draws an intense red attack arc between the conflicting queen and the candidate square
     */
    drawConflictIndicator(candRow, candCol, confRow, confCol, axisName) {
        if (!this.svgOverlay) return;

        const boardRect = this.boardContainer.getBoundingClientRect();
        const cellWidth = boardRect.width / this.n;
        const cellHeight = boardRect.height / this.n;

        const x1 = (candCol + 0.5) * cellWidth;
        const y1 = (candRow + 0.5) * cellHeight;
        const x2 = (confCol + 0.5) * cellWidth;
        const y2 = (confRow + 0.5) * cellHeight;

        this.svgOverlay.innerHTML = `
            <defs>
                <filter id="conflict-glow">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#ff1744" />
                </marker>
            </defs>
            <!-- Heavy attack laser -->
            <line x1="${x2}" y1="${y2}" x2="${x1}" y2="${y1}" 
                  stroke="#ff1744" stroke-width="4" stroke-linecap="round" 
                  filter="url(#conflict-glow)" class="conflict-laser" />
            <!-- Pulse ripple on source queen -->
            <circle cx="${x2}" cy="${y2}" r="${cellWidth * 0.38}" fill="none" 
                    stroke="#ff1744" stroke-width="2.5" class="threat-ripple" />
            <!-- Impact mark on candidate -->
            <circle cx="${x1}" cy="${y1}" r="${cellWidth * 0.28}" fill="rgba(255, 23, 68, 0.35)" 
                    stroke="#ff5252" stroke-width="2" class="impact-ring" />
        `;
    }

    clearOverlay() {
        if (this.svgOverlay) {
            this.svgOverlay.innerHTML = '';
        }
    }

    /**
     * Computes real-time threat heat on every square from currently placed queens
     */
    updateHeatmap() {
        const threatCounts = Array.from({ length: this.n }, () => new Array(this.n).fill(0));

        // For each placed queen, mark its attack paths
        for (let r = 0; r < this.n; r++) {
            const c = this.queenPositions[r];
            if (c === -1) continue;

            for (let i = 0; i < this.n; i++) {
                for (let j = 0; j < this.n; j++) {
                    if (i === r && j === c) continue;
                    // Queen attacks same row, same col, or same diagonals
                    if (i === r || j === c || Math.abs(i - r) === Math.abs(j - c)) {
                        threatCounts[i][j]++;
                    }
                }
            }
        }

        // Apply heat styling to cells
        for (let r = 0; r < this.n; r++) {
            for (let c = 0; c < this.n; c++) {
                const cell = document.getElementById(`cell-${r}-${c}`);
                if (!cell) continue;

                const badge = cell.querySelector('.threat-badge');
                const threats = threatCounts[r][c];

                if (this.showHeatmap && threats > 0 && this.queenPositions[r] !== c) {
                    cell.style.setProperty('--threat-intensity', Math.min(threats / 3, 1));
                    cell.classList.add('has-threat');
                    if (badge) {
                        badge.textContent = `⚡${threats}`;
                        badge.style.display = 'block';
                    }
                } else {
                    cell.classList.remove('has-threat');
                    cell.style.removeProperty('--threat-intensity');
                    if (badge) {
                        badge.style.display = 'none';
                    }
                }
            }
        }
    }

    /**
     * Celebratory ripple across the board when a full solution is found
     */
    triggerVictoryAnimation() {
        for (let r = 0; r < this.n; r++) {
            const c = this.queenPositions[r];
            if (c !== -1) {
                const cell = document.getElementById(`cell-${r}-${c}`);
                if (cell) {
                    setTimeout(() => {
                        cell.classList.add('victory-pulse');
                        setTimeout(() => cell.classList.remove('victory-pulse'), 1200);
                    }, r * 80);
                }
            }
        }
    }
}
