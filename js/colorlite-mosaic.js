/**
 * Colorlite Mosaic Test Engine
 * 
 * A refactored implementation of the Colorlite-style mosaic color vision test.
 * Tests for red-green (deutan/protan), purple-blue, and purple-green confusion.
 * 
 * Features:
 * - 18x18 animated particle grid with sine-wave luminance modulation
 * - 3 test categories with 20 progressive difficulty levels each
 * - 3x3 target detection area
 * - Real-time HSL color animation
 * - Responsive canvas sizing
 * - Clean modular architecture
 */

const ColorliteMosaic = (function() {
    'use strict';

    // ============================================
    // Configuration
    // ============================================
    const CONFIG = {
        // Grid settings
        gridSize: 18,
        tilePadding: 3,
        
        // Canvas sizes
        desktop: {
            tileSize: 30,
            width: 600,
            height: 600
        },
        mobile: {
            tileSize: 16,
            width: 320,
            height: 330
        },
        mobileBreakpoint: 760,
        
        // Animation settings
        animationFrames: 10,
        animationInterval: 50,
        animationCycleDuration: 510,
        
        // Test settings
        levelsPerCategory: 20,
        targetSize: 3,  // 3x3 tile target area
        
        // UI text
        messages: {
            instruction: 'Click on the different colored squares!',
            tryAgain: 'Try again!',
            missed: 'Moving to next test...',
            complete: 'Test Complete!'
        }
    };

    // ============================================
    // Color Palettes
    // Each array contains [h, s, l] triplets for 20 difficulty levels
    // ============================================
    const PALETTES = {
        // Gray calibration palette (single level)
        calibration: {
            background: [0, 0, 20],
            target: [0, 0, 60]
        },
        
        // Red-Green confusion axis (Deutan/Protan detection)
        // Progresses from obvious red to subtle brownish-red
        redGreen: {
            background: [111, 78, 20],
            levels: [
                [0, 100, 28], [6, 98, 28], [11, 95, 28], [15, 93, 28], [19, 90, 27],
                [27, 87, 26], [34, 84, 25], [40, 82, 26], [46, 80, 26], [59, 79, 26],
                [72, 77, 25], [72, 76, 24], [72, 75, 22], [78, 76, 23], [83, 76, 23],
                [89, 76, 23], [95, 76, 22], [99, 77, 21], [103, 77, 19], [106, 78, 20]
            ]
        },
        
        // Purple-Blue confusion axis
        purpleBlue: {
            background: [300, 100, 16],
            levels: [
                [240, 100, 29], [243, 100, 29], [246, 100, 28], [249, 100, 27], [252, 100, 26],
                [255, 100, 26], [258, 100, 25], [261, 100, 25], [264, 100, 24], [267, 100, 24],
                [270, 100, 23], [273, 100, 22], [276, 100, 21], [279, 100, 21], [282, 100, 20],
                [285, 100, 20], [288, 100, 19], [291, 100, 18], [294, 100, 17], [297, 100, 17]
            ]
        },
        
        // Purple-Green confusion axis (Protan indicator)
        purpleGreen: {
            background: [323, 87, 34],
            levels: [
                [173, 37, 25], [176, 29, 27], [178, 23, 28], [183, 16, 29], [191, 10, 31],
                [213, 7, 32], [260, 5, 32], [295, 8, 32], [311, 13, 33], [320, 18, 33],
                [324, 22, 34], [324, 25, 34], [324, 28, 35], [327, 35, 35], [327, 42, 36],
                [327, 45, 36], [327, 48, 36], [327, 50, 36], [325, 62, 35], [324, 74, 35]
            ]
        }
    };

    // Category order and labels
    const CATEGORIES = [
        { id: 'redGreen', label: 'Red-Green', resultKey: 'p1' },
        { id: 'purpleBlue', label: 'Purple-Blue', resultKey: 'p2' },
        { id: 'purpleGreen', label: 'Purple-Green', resultKey: 'p3' }
    ];

    // ============================================
    // Particle Class
    // Represents a single tile in the mosaic grid
    // ============================================
    class Particle {
        constructor(x, y, id, h, s, l) {
            this.id = id;
            this.x = x;
            this.y = y;
            this.baseH = h;
            this.baseS = s;
            this.baseL = l;
            this.h = h;
            this.s = s;
            this.l = l;
            
            // Animation parameters
            this.frequency = 0.1 + Math.random() * 0.1;
            this.phase = Math.random() * Math.PI * 2;
            this.sinValue = Math.random() * 10;
        }

        /**
         * Update color with sine-wave luminance animation
         */
        animate() {
            this.sinValue += this.frequency;
            // Modulate luminance by ±3 units
            this.l = this.baseL + Math.sin(this.sinValue * Math.PI / 2) * 3;
        }

        /**
         * Set new base color values
         */
        setColor(h, s, l) {
            this.baseH = h;
            this.baseS = s;
            this.baseL = l;
            this.h = h;
            this.s = s;
            this.l = l;
        }

        /**
         * Get HSL color string for rendering
         */
        getColorString() {
            return `hsl(${this.h}, ${this.s}%, ${this.l}%)`;
        }
    }

    // ============================================
    // Main Mosaic Test Class
    // ============================================
    class MosaicTest {
        constructor(canvasSelector, options = {}) {
            // Canvas setup
            this.canvas = document.querySelector(canvasSelector);
            if (!this.canvas) {
                throw new Error(`Canvas not found: ${canvasSelector}`);
            }
            this.ctx = this.canvas.getContext('2d');
            
            // Options with defaults
            this.options = {
                onLevelComplete: options.onLevelComplete || (() => {}),
                onCategoryComplete: options.onCategoryComplete || (() => {}),
                onTestComplete: options.onTestComplete || (() => {}),
                onProgress: options.onProgress || (() => {}),
                getInstructionElement: options.getInstructionElement || (() => null),
                getResultElements: options.getResultElements || (() => ({}))
            };

            // Test state
            this.particles = [];
            this.targetPositions = [];
            this.currentCategory = -1;  // -1 = calibration, 0-2 = main tests
            this.currentLevel = 0;
            this.results = [0, 0, 0];
            this.isRunning = false;
            this.hasMissed = false;
            this.animationTimer = null;
            
            // Sizing
            this.setupDimensions();
            
            // Bind methods
            this.handleClick = this.handleClick.bind(this);
            this.renderFrame = this.renderFrame.bind(this);
            
            // Initialize
            this.canvas.addEventListener('click', this.handleClick);
            window.addEventListener('resize', () => this.setupDimensions());
        }

        /**
         * Setup canvas dimensions based on viewport
         */
        setupDimensions() {
            const isMobile = window.innerWidth < CONFIG.mobileBreakpoint;
            const dims = isMobile ? CONFIG.mobile : CONFIG.desktop;
            
            this.tileSize = dims.tileSize;
            this.canvas.width = dims.width;
            this.canvas.height = dims.height;
            
            // Calculate offsets to center the grid
            const totalWidth = CONFIG.gridSize * this.tileSize;
            const totalHeight = CONFIG.gridSize * this.tileSize;
            this.offsetX = (this.canvas.width - totalWidth) / 2;
            this.offsetY = (this.canvas.height - totalHeight) / 2;
        }

        /**
         * Initialize particle grid with background color
         */
        initGrid(backgroundHSL) {
            this.particles = [];
            const [h, s, l] = backgroundHSL;
            
            for (let i = 0; i < CONFIG.gridSize * CONFIG.gridSize; i++) {
                const row = Math.floor(i / CONFIG.gridSize);
                const col = i % CONFIG.gridSize;
                const x = col * this.tileSize + this.offsetX;
                const y = row * this.tileSize + this.offsetY;
                
                this.particles.push(new Particle(x, y, i, h, s, l));
            }
        }

        /**
         * Generate random target positions for each level
         */
        generateTargetPositions() {
            this.targetPositions = [];
            
            for (let level = 0; level < CONFIG.levelsPerCategory; level++) {
                // Random position within grid bounds (allowing for 3x3 area)
                const maxPos = CONFIG.gridSize - CONFIG.targetSize;
                const row = Math.floor(Math.random() * maxPos) + 1;
                const col = Math.floor(Math.random() * maxPos) + 1;
                
                // Calculate center tile index
                const centerIndex = row * CONFIG.gridSize + col;
                this.targetPositions.push(centerIndex);
            }
        }

        /**
         * Set target area to a different color
         */
        setTargetColor(targetHSL) {
            const [h, s, l] = targetHSL;
            const centerIdx = this.targetPositions[this.currentLevel];
            
            // 3x3 grid around center (offset by -1 row and col)
            for (let dRow = -1; dRow <= 1; dRow++) {
                for (let dCol = 0; dCol < CONFIG.targetSize; dCol++) {
                    const idx = centerIdx + (dRow * CONFIG.gridSize) + dCol;
                    if (idx >= 0 && idx < this.particles.length) {
                        this.particles[idx].setColor(h, s, l);
                    }
                }
            }
        }

        /**
         * Check if click is within target area
         */
        isClickOnTarget(clickX, clickY) {
            const centerIdx = this.targetPositions[this.currentLevel];
            const targetParticle = this.particles[centerIdx];
            
            // Calculate target bounds (3x3 area)
            const left = targetParticle.x - this.tileSize;
            const right = targetParticle.x + this.tileSize * 2;
            const top = targetParticle.y - this.tileSize;
            const bottom = targetParticle.y + this.tileSize * 2;
            
            return clickX >= left && clickX <= right && 
                   clickY >= top && clickY <= bottom;
        }

        /**
         * Handle canvas click events
         */
        handleClick(event) {
            if (!this.isRunning) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            if (this.isClickOnTarget(x, y)) {
                this.onCorrectResponse();
            } else {
                this.onIncorrectResponse();
            }
        }

        /**
         * Handle correct target click
         */
        onCorrectResponse() {
            this.hasMissed = false;
            
            // Calibration phase (gray test) - just move to first category
            if (this.currentCategory === -1) {
                this.onCategoryComplete();
                return;
            }
            
            this.currentLevel++;
            
            // Update UI
            this.updateInstruction(CONFIG.messages.instruction);
            this.updateProgress();
            
            // Check if category complete
            if (this.currentLevel >= CONFIG.levelsPerCategory) {
                this.onCategoryComplete();
            } else {
                this.nextLevel();
            }
        }

        /**
         * Handle incorrect click
         */
        onIncorrectResponse() {
            if (this.hasMissed) {
                // Second miss - move to next category
                this.updateInstruction(CONFIG.messages.missed);
                this.onCategoryComplete();
            } else {
                // First miss - give another chance
                this.hasMissed = true;
                this.updateInstruction(CONFIG.messages.tryAgain);
            }
        }

        /**
         * Called when "I don't see" button is pressed
         */
        skipLevel() {
            if (!this.isRunning) return;
            
            // If good performance, mark complete
            if (this.results[0] > 80) {
                this.completeTest();
            } else {
                this.onCategoryComplete();
            }
        }

        /**
         * Handle category completion
         */
        onCategoryComplete() {
            // Store result for current category (skip calibration which is -1)
            if (this.currentCategory >= 0 && this.currentCategory < 3) {
                const percentage = Math.round((this.currentLevel / CONFIG.levelsPerCategory) * 100);
                this.results[this.currentCategory] = percentage;
                this.updateProgress();
                
                this.options.onCategoryComplete(this.currentCategory, this.results);
                
                // Check for early termination (normal vision detected)
                if (this.currentCategory === 0 && this.results[0] === 100) {
                    this.completeTest();
                    return;
                }
            }
            
            // Move to next category
            this.currentCategory++;
            this.currentLevel = 0;
            this.hasMissed = false;
            
            if (this.currentCategory >= CATEGORIES.length) {
                this.completeTest();
            } else {
                this.startCategory();
            }
        }

        /**
         * Start a new test category
         */
        startCategory() {
            const category = CATEGORIES[this.currentCategory];
            const palette = PALETTES[category.id];
            
            // Initialize grid with new background
            this.initGrid(palette.background);
            this.generateTargetPositions();
            
            // Set first target
            this.setTargetColor(palette.levels[0]);
            
            // Animate a few frames to stabilize
            for (let j = 0; j < 6; j++) {
                for (let particle of this.particles) {
                    particle.animate();
                }
            }
        }

        /**
         * Move to next difficulty level within category
         */
        nextLevel() {
            const category = CATEGORIES[this.currentCategory];
            const palette = PALETTES[category.id];
            
            // Reset grid to background
            this.initGrid(palette.background);
            
            // Set new target color
            this.setTargetColor(palette.levels[this.currentLevel]);
            
            this.options.onLevelComplete(this.currentCategory, this.currentLevel);
        }

        /**
         * Update instruction text
         */
        updateInstruction(message) {
            const el = this.options.getInstructionElement();
            if (el) el.textContent = message;
        }

        /**
         * Update progress display
         */
        updateProgress() {
            const elements = this.options.getResultElements();
            
            CATEGORIES.forEach((cat, idx) => {
                const el = elements[cat.resultKey];
                if (el) el.textContent = `${this.results[idx]}%`;
            });
            
            this.options.onProgress(this.results);
        }

        /**
         * Animation loop - renders frames at set intervals
         */
        startAnimation() {
            let frameCount = 0;
            
            const animate = () => {
                if (!this.isRunning) return;
                
                frameCount++;
                
                // Render multiple frames per cycle
                for (let f = 1; f < CONFIG.animationFrames; f++) {
                    setTimeout(() => this.renderFrame(), CONFIG.animationInterval * f);
                }
                
                // Schedule next cycle
                this.animationTimer = setTimeout(animate, CONFIG.animationCycleDuration);
            };
            
            animate();
        }

        /**
         * Render a single animation frame
         */
        renderFrame() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            for (const particle of this.particles) {
                particle.animate();
                
                this.ctx.fillStyle = particle.getColorString();
                this.ctx.fillRect(
                    particle.x,
                    particle.y,
                    this.tileSize - CONFIG.tilePadding,
                    this.tileSize - CONFIG.tilePadding
                );
            }
        }

        /**
         * Start the test sequence
         */
        start() {
            this.isRunning = true;
            this.currentCategory = -1;
            this.currentLevel = 0;
            this.results = [0, 0, 0];
            this.hasMissed = false;
            
            // Start with calibration (gray)
            this.initGrid(PALETTES.calibration.background);
            this.generateTargetPositions();
            this.setTargetColor(PALETTES.calibration.target);
            
            this.updateInstruction(CONFIG.messages.instruction);
            this.startAnimation();
        }

        /**
         * Restart the test
         */
        restart() {
            this.stop();
            this.results = [0, 0, 0];
            this.updateProgress();
            this.start();
        }

        /**
         * Stop the test
         */
        stop() {
            this.isRunning = false;
            if (this.animationTimer) {
                clearTimeout(this.animationTimer);
                this.animationTimer = null;
            }
        }

        /**
         * Complete the test and show results
         */
        completeTest() {
            this.stop();
            this.showCompletionGraphic();
            this.updateInstruction(CONFIG.messages.complete);
            this.options.onTestComplete(this.results, this.getDiagnosis());
        }

        /**
         * Display "END" graphic on canvas
         */
        showCompletionGraphic() {
            // Grid positions for "END" letters
            const endPattern = [
                128, 129, 130, 132, 136, 138, 139, 140,
                146, 150, 151, 154, 156, 159,
                164, 165, 168, 170, 172, 174, 177,
                182, 186, 189, 190, 192, 195,
                200, 201, 202, 204, 208, 210, 211, 212
            ];
            
            // Reset to background
            const bgHSL = this.currentCategory >= 0 
                ? PALETTES[CATEGORIES[this.currentCategory].id].background 
                : PALETTES.calibration.background;
            this.initGrid(bgHSL);
            
            // Highlight END pattern in yellow
            for (const idx of endPattern) {
                if (this.particles[idx]) {
                    this.particles[idx].setColor(60, 99, 95);
                }
            }
            
            this.renderFrame();
        }

        /**
         * Generate diagnosis based on results
         */
        getDiagnosis() {
            const [redGreen, purpleBlue, purpleGreen] = this.results;
            
            let type = 'normal';
            let severity = 'none';
            let description = '';
            
            // Check for normal vision
            if (redGreen > 80 || (redGreen === 80 && purpleBlue > 75 && purpleGreen > 80)) {
                type = 'normal';
                severity = 'none';
                description = 'Normal color vision detected. No significant red-green deficiency found.';
            } else {
                // Determine type based on which axis is weaker
                if (purpleGreen < purpleBlue) {
                    type = 'deutan';
                    description = 'Deutan type color vision deficiency detected (difficulty with green perception).';
                } else {
                    type = 'protan';
                    description = 'Protan type color vision deficiency detected (difficulty with red perception).';
                }
                
                // Determine severity
                if (redGreen < 25 && (purpleBlue < 40 || purpleGreen < 40)) {
                    severity = 'severe';
                } else if (redGreen >= 25 && redGreen < 60) {
                    severity = 'moderate';
                } else if (redGreen >= 60 && redGreen < 80) {
                    severity = 'mild';
                } else {
                    severity = 'very mild';
                }
            }
            
            return {
                type,
                severity,
                description,
                scores: {
                    redGreen,
                    purpleBlue,
                    purpleGreen
                }
            };
        }

        /**
         * Get current results
         */
        getResults() {
            return {
                scores: [...this.results],
                categories: CATEGORIES.map((cat, idx) => ({
                    id: cat.id,
                    label: cat.label,
                    score: this.results[idx]
                })),
                diagnosis: this.getDiagnosis()
            };
        }
    }

    // ============================================
    // Public API
    // ============================================
    return {
        /**
         * Create a new mosaic test instance
         */
        create(canvasSelector, options) {
            return new MosaicTest(canvasSelector, options);
        },
        
        /**
         * Configuration access
         */
        CONFIG,
        PALETTES,
        CATEGORIES
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ColorliteMosaic;
}
