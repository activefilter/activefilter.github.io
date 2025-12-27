/**
 * ColorVision Pro - Animated Mosaic Test
 * Creates animated mosaic grids with outlier detection for the JLTTCK Active Filter
 */

const AnimatedMosaic = {
    /**
     * Configuration
     */
    config: {
        // Grid sizes for different difficulty levels
        gridSizes: {
            easy: 2,      // 2x2 grid
            medium: 3,    // 3x3 grid
            hard: 4       // 4x4 grid
        },
        // Tiles per square (internal grid)
        tilesPerSquare: {
            easy: 8,
            medium: 10,
            hard: 12
        },
        // Animation parameters
        animation: {
            baseSpeed: 0.0008,      // Base animation speed
            noiseScale: 0.015,      // Perlin noise scale
            colorCycleSpeed: 0.0003,
            flowSpeed: 0.0005
        },
        // Timing
        maxResponseTime: 3600000,     // 1 hour - effectively no limit
        // Reduced motion check
        reducedMotion: false
    },

    /**
     * State
     */
    state: {
        isRunning: false,
        isPaused: false,
        currentPlate: null,
        animationFrame: null,
        startTime: 0,
        lastFrameTime: 0
    },

    /**
     * Canvas and context
     */
    canvas: null,
    ctx: null,

    /**
     * Simplex noise implementation for smooth animation
     */
    noise: {
        // Permutation table
        perm: [],
        
        init(seed) {
            const rng = Utils.createRNG(seed);
            this.perm = [];
            for (let i = 0; i < 256; i++) {
                this.perm[i] = i;
            }
            // Shuffle
            for (let i = 255; i > 0; i--) {
                const j = Math.floor(rng() * (i + 1));
                [this.perm[i], this.perm[j]] = [this.perm[j], this.perm[i]];
            }
            // Duplicate for overflow
            for (let i = 0; i < 256; i++) {
                this.perm[256 + i] = this.perm[i];
            }
        },
        
        // 2D Simplex noise
        simplex2(x, y) {
            const F2 = 0.5 * (Math.sqrt(3) - 1);
            const G2 = (3 - Math.sqrt(3)) / 6;
            
            const s = (x + y) * F2;
            const i = Math.floor(x + s);
            const j = Math.floor(y + s);
            
            const t = (i + j) * G2;
            const X0 = i - t;
            const Y0 = j - t;
            const x0 = x - X0;
            const y0 = y - Y0;
            
            let i1, j1;
            if (x0 > y0) { i1 = 1; j1 = 0; }
            else { i1 = 0; j1 = 1; }
            
            const x1 = x0 - i1 + G2;
            const y1 = y0 - j1 + G2;
            const x2 = x0 - 1 + 2 * G2;
            const y2 = y0 - 1 + 2 * G2;
            
            const ii = i & 255;
            const jj = j & 255;
            
            const grad3 = [
                [1, 1], [-1, 1], [1, -1], [-1, -1],
                [1, 0], [-1, 0], [1, 0], [-1, 0],
                [0, 1], [0, -1], [0, 1], [0, -1]
            ];
            
            const gi0 = this.perm[ii + this.perm[jj]] % 12;
            const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
            const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;
            
            let n0, n1, n2;
            
            let t0 = 0.5 - x0 * x0 - y0 * y0;
            if (t0 < 0) n0 = 0;
            else {
                t0 *= t0;
                n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0);
            }
            
            let t1 = 0.5 - x1 * x1 - y1 * y1;
            if (t1 < 0) n1 = 0;
            else {
                t1 *= t1;
                n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1);
            }
            
            let t2 = 0.5 - x2 * x2 - y2 * y2;
            if (t2 < 0) n2 = 0;
            else {
                t2 *= t2;
                n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2);
            }
            
            // Return value in range [-1, 1]
            return 70 * (n0 + n1 + n2);
        }
    },

    /**
     * Color palettes for deuteranomaly detection
     * Background colors and outlier colors that are difficult to distinguish with red-green deficiency
     */
    palettes: {
        // Deuteranomaly-targeted palettes (red-green confusion axis)
        deutan: [
            {
                name: 'green-red',
                background: { h: 120, s: 45, l: 45 },  // Green base
                outlier: { h: 0, s: 50, l: 45 },       // Red outlier
                variance: { h: 15, s: 10, l: 8 }
            },
            {
                name: 'olive-lime',
                background: { h: 50, s: 40, l: 42 },   // Olive/brown base
                outlier: { h: 85, s: 45, l: 42 },      // Yellow-green outlier
                variance: { h: 12, s: 8, l: 6 }
            },
            {
                name: 'brown-green',
                background: { h: 20, s: 42, l: 44 },   // Brownish-red base
                outlier: { h: 140, s: 48, l: 42 },     // Green outlier
                variance: { h: 10, s: 8, l: 7 }
            },
            {
                name: 'teal-pink',
                background: { h: 165, s: 38, l: 46 },  // Teal base
                outlier: { h: 340, s: 45, l: 50 },     // Pink outlier
                variance: { h: 14, s: 10, l: 8 }
            },
            {
                name: 'cyan-orange',
                background: { h: 155, s: 42, l: 48 },  // Cyan-green base
                outlier: { h: 25, s: 55, l: 50 },      // Orange outlier
                variance: { h: 12, s: 10, l: 7 }
            },
            {
                name: 'sage-coral',
                background: { h: 100, s: 35, l: 50 },  // Sage green base
                outlier: { h: 10, s: 60, l: 52 },      // Coral outlier
                variance: { h: 15, s: 10, l: 8 }
            }
        ],
        
        // Control palettes (should be equally visible to all)
        control: [
            {
                name: 'blue-yellow',
                background: { h: 220, s: 55, l: 48 },  // Blue base
                outlier: { h: 55, s: 75, l: 55 },      // Yellow outlier
                variance: { h: 12, s: 10, l: 8 }
            },
            {
                name: 'purple-yellow',
                background: { h: 275, s: 50, l: 45 },  // Purple base
                outlier: { h: 50, s: 70, l: 55 },      // Yellow outlier
                variance: { h: 14, s: 10, l: 7 }
            },
            {
                name: 'navy-orange',
                background: { h: 235, s: 55, l: 35 },  // Dark blue base
                outlier: { h: 35, s: 80, l: 60 },      // Light orange outlier
                variance: { h: 10, s: 10, l: 8 }
            }
        ]
    },

    /**
     * Initialize the mosaic generator
     */
    init(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        
        // Check for reduced motion preference
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.config.reducedMotion = motionQuery.matches;

        // Listen for reduced motion changes (cross-browser safe)
        const handleMotionChange = (e) => {
            this.config.reducedMotion = e.matches;
        };

        if (typeof motionQuery.addEventListener === 'function') {
            motionQuery.addEventListener('change', handleMotionChange);
        } else if (typeof motionQuery.addListener === 'function') {
            // Safari <14 fallback
            motionQuery.addListener(handleMotionChange);
        }
        
        return this;
    },

    /**
     * Generate a new plate configuration
     */
    generatePlate(options = {}) {
        const {
            difficulty = 'medium',
            type = 'deutan',  // 'deutan' or 'control'
            seed = Utils.generateSeed(),
            subtlety = 1.0    // 1.0 = normal, higher = more subtle
        } = options;
        
        const rng = Utils.createRNG(seed);
        
        // Initialize noise with seed
        this.noise.init(seed);
        
        // Get grid configuration
        const gridSize = this.config.gridSizes[difficulty] || 3;
        const tilesPerSquare = this.config.tilesPerSquare[difficulty] || 10;
        
        // Select palette
        const paletteList = type === 'control' ? this.palettes.control : this.palettes.deutan;
        const palette = Utils.randomPick(paletteList, rng);
        
        // Determine outlier position
        const totalSquares = gridSize * gridSize;
        const outlierIndex = Math.floor(rng() * totalSquares);
        
        // Generate squares
        const squares = [];
        for (let i = 0; i < totalSquares; i++) {
            const isOutlier = i === outlierIndex;
            const row = Math.floor(i / gridSize);
            const col = i % gridSize;
            
            squares.push({
                index: i,
                row,
                col,
                isOutlier,
                baseColor: isOutlier ? palette.outlier : palette.background,
                variance: palette.variance,
                // Animation parameters - outlier may have slightly different params
                animPhase: rng() * Math.PI * 2,
                animSpeed: 1 + (isOutlier ? (rng() - 0.5) * 0.2 * subtlety : 0),
                flowDirection: rng() * Math.PI * 2
            });
        }
        
        const plate = {
            seed,
            difficulty,
            type,
            subtlety,
            gridSize,
            tilesPerSquare,
            palette,
            outlierIndex,
            squares,
            startTime: 0
        };
        
        return plate;
    },

    /**
     * Start rendering a plate
     */
    startPlate(plate, onTimeout = null) {
        this.state.currentPlate = plate;
        this.state.isRunning = true;
        this.state.isPaused = false;
        this.state.startTime = performance.now();
        this.state.lastFrameTime = this.state.startTime;
        plate.startTime = this.state.startTime;
        
        this.onTimeout = onTimeout;
        
        // Start animation loop
        this.animate();
    },

    /**
     * Main animation loop
     */
    animate() {
        if (!this.state.isRunning || this.state.isPaused) return;
        
        const currentTime = performance.now();
        const elapsed = currentTime - this.state.startTime;
        
        // Timeout disabled - no time limit
        // if (elapsed > this.config.maxResponseTime) {
        //     if (this.onTimeout) {
        //         this.onTimeout();
        //     }
        //     this.stop();
        //     return;
        // }
        
        // Render frame
        this.renderFrame(currentTime);
        
        // Continue animation
        this.state.animationFrame = requestAnimationFrame(() => this.animate());
    },

    /**
     * Render a single frame
     */
    renderFrame(time) {
        const plate = this.state.currentPlate;
        if (!plate) return;
        
        const { gridSize, tilesPerSquare, squares } = plate;
        const canvasSize = this.canvas.width;
        const squareSize = canvasSize / gridSize;
        const gap = 4; // Gap between squares
        const actualSquareSize = squareSize - gap;
        const tileSize = actualSquareSize / tilesPerSquare;
        
        // Clear canvas
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, canvasSize, canvasSize);
        
        // Render each square
        squares.forEach(square => {
            const squareX = square.col * squareSize + gap / 2;
            const squareY = square.row * squareSize + gap / 2;
            
            this.renderSquare(square, squareX, squareY, actualSquareSize, tilesPerSquare, tileSize, time);
        });
    },

    /**
     * Render a single large square with animated tiles
     */
    renderSquare(square, x, y, size, tileCount, tileSize, time) {
        const { baseColor, variance, animPhase, animSpeed, flowDirection } = square;
        
        // Time factor for animation
        const t = this.config.reducedMotion ? 0 : time * this.config.animation.baseSpeed * animSpeed;
        
        for (let row = 0; row < tileCount; row++) {
            for (let col = 0; col < tileCount; col++) {
                const tileX = x + col * tileSize;
                const tileY = y + row * tileSize;
                
                // Calculate noise-based variation
                const nx = col / tileCount;
                const ny = row / tileCount;
                
                // Flowing noise field
                const flowX = Math.cos(flowDirection) * t;
                const flowY = Math.sin(flowDirection) * t;
                
                const noiseVal = this.noise.simplex2(
                    nx * 3 + flowX + animPhase,
                    ny * 3 + flowY
                );
                
                const noiseVal2 = this.noise.simplex2(
                    nx * 5 + t * 0.7,
                    ny * 5 + animPhase
                );
                
                // Calculate color with variation
                const h = baseColor.h + noiseVal * variance.h;
                const s = Utils.clamp(baseColor.s + noiseVal2 * variance.s, 20, 80);
                const l = Utils.clamp(baseColor.l + noiseVal * variance.l, 30, 70);
                
                const rgb = Utils.hslToRgb(h, s, l);
                
                // Draw tile with slight padding
                const padding = 0.5;
                this.ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
                this.ctx.fillRect(
                    tileX + padding,
                    tileY + padding,
                    tileSize - padding * 2,
                    tileSize - padding * 2
                );
            }
        }
    },

    /**
     * Handle click/tap on the canvas
     */
    handleClick(clientX, clientY) {
        if (!this.state.isRunning || this.state.isPaused) return null;
        
        const plate = this.state.currentPlate;
        if (!plate) return null;
        
        // Get canvas-relative coordinates
        const rect = this.canvas.getBoundingClientRect();
        const x = (clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (clientY - rect.top) * (this.canvas.height / rect.height);
        
        // Determine which square was clicked
        const { gridSize } = plate;
        const squareSize = this.canvas.width / gridSize;
        
        const col = Math.floor(x / squareSize);
        const row = Math.floor(y / squareSize);
        
        if (col < 0 || col >= gridSize || row < 0 || row >= gridSize) {
            return null;
        }
        
        const clickedIndex = row * gridSize + col;
        const responseTime = performance.now() - this.state.startTime;
        
        // Stop animation
        this.pause();
        
        return {
            selectedIndex: clickedIndex,
            correctIndex: plate.outlierIndex,
            isCorrect: clickedIndex === plate.outlierIndex,
            responseTime,
            plateType: plate.type,
            difficulty: plate.difficulty
        };
    },

    /**
     * Pause animation (freezes current frame)
     */
    pause() {
        this.state.isPaused = true;
        if (this.state.animationFrame) {
            cancelAnimationFrame(this.state.animationFrame);
            this.state.animationFrame = null;
        }
    },

    /**
     * Resume animation
     */
    resume() {
        if (this.state.isRunning && this.state.isPaused) {
            this.state.isPaused = false;
            this.state.startTime = performance.now() - (this.state.lastFrameTime - this.state.startTime);
            this.animate();
        }
    },

    /**
     * Stop and clean up
     */
    stop() {
        this.state.isRunning = false;
        this.state.isPaused = false;
        this.state.currentPlate = null;
        
        if (this.state.animationFrame) {
            cancelAnimationFrame(this.state.animationFrame);
            this.state.animationFrame = null;
        }
    },

    /**
     * Show feedback on the canvas
     */
    showFeedback(result, callback) {
        const plate = this.state.currentPlate;
        if (!plate) {
            if (callback) callback();
            return;
        }
        
        const { gridSize } = plate;
        const squareSize = this.canvas.width / gridSize;
        const gap = 4;
        
        // Highlight correct answer
        const correctRow = Math.floor(plate.outlierIndex / gridSize);
        const correctCol = plate.outlierIndex % gridSize;
        const correctX = correctCol * squareSize + gap / 2;
        const correctY = correctRow * squareSize + gap / 2;
        
        // Draw highlight
        this.ctx.strokeStyle = result.isCorrect ? '#28a745' : '#dc3545';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(correctX, correctY, squareSize - gap, squareSize - gap);
        
        // If wrong, also show what was selected
        if (!result.isCorrect && result.selectedIndex !== null) {
            const selectedRow = Math.floor(result.selectedIndex / gridSize);
            const selectedCol = result.selectedIndex % gridSize;
            const selectedX = selectedCol * squareSize + gap / 2;
            const selectedY = selectedRow * squareSize + gap / 2;
            
            this.ctx.strokeStyle = 'rgba(255, 193, 7, 0.8)';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(selectedX, selectedY, squareSize - gap, squareSize - gap);
        }
        
        // Wait then callback
        setTimeout(() => {
            if (callback) callback();
        }, 1000);
    },

    /**
     * Generate a complete test sequence
     */
    generateTestSequence(options = {}) {
        const {
            totalPlates = 16,
            deutanRatio = 0.625,  // 10/16 deutan, 6/16 control
            baseSeed = Utils.generateSeed(),
            progressiveDifficulty = true
        } = options;
        
        const plates = [];
        const rng = Utils.createRNG(baseSeed);
        
        // Calculate plate distribution
        const deutanCount = Math.round(totalPlates * deutanRatio);
        const controlCount = totalPlates - deutanCount;
        
        // Create plate type sequence
        const types = [
            ...Array(deutanCount).fill('deutan'),
            ...Array(controlCount).fill('control')
        ];
        const shuffledTypes = Utils.shuffleArray(types, rng);
        
        // Difficulty progression
        const getDifficulty = (index) => {
            if (!progressiveDifficulty) return 'medium';
            const progress = index / totalPlates;
            if (progress < 0.25) return 'easy';
            if (progress < 0.6) return 'medium';
            return 'hard';
        };
        
        // Subtlety increases with difficulty
        const getSubtlety = (index) => {
            const progress = index / totalPlates;
            return 1 + progress * 0.5;  // 1.0 to 1.5
        };
        
        // Generate plates
        shuffledTypes.forEach((type, index) => {
            const plateSeed = Utils.generateSeed(`${baseSeed}-plate-${index}`);
            plates.push(this.generatePlate({
                type,
                seed: plateSeed,
                difficulty: getDifficulty(index),
                subtlety: getSubtlety(index)
            }));
        });
        
        return plates;
    },

    /**
     * Clear the canvas
     */
    clear() {
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
};

// Export
window.AnimatedMosaic = AnimatedMosaic;
