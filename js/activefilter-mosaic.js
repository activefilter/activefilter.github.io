/**
 * Active Filter Mosaic Test Engine
 * 
 * Adapted from Colorlite for deuteranomaly detection using JLTTCK Active Filter colors.
 * Tests specifically for red-green confusion typical of deuteranomaly.
 * 
 * Features:
 * - 18x18 animated particle grid with sine-wave luminance modulation
 * - Progressive difficulty levels targeting deuteranomaly confusion axis
 * - 3x3 target detection area
 * - Real-time HSL color animation
 * - Responsive canvas sizing
 */

const ActiveFilterMosaic = (function() {
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
        totalLevels: 16,  // 16 difficulty levels
        targetSize: 3,     // 3x3 tile target area
        
        // UI text
        messages: {
            instruction: 'Tap the square that looks different',
            tryAgain: 'Try again!',
            cantTell: 'Moving to next level...',
            complete: 'Test Complete!'
        }
    };

    // ============================================
    // Color Palettes - Deuteranomaly Confusion Axis
    // 
    // Based on JLTTCK research:
    // - Background: Greenish-yellow that appears gray to deutans
    // - Target: Progresses from obvious magenta to subtle confusion
    // - Designed to test the deuteranomaly confusion line
    // ============================================
    const PALETTES = {
        // Background color that appears neutral to deutans
        background: [65, 25, 50],  // Greenish-yellow that looks gray to deutans
        
        // 16 progressive difficulty levels
        // Hue transitions from magenta (300°) toward the confusion point (~65°)
        levels: [
            // Easy levels (1-4): Obvious magenta/purple
            [300, 80, 45],   // Level 1: Strong magenta
            [305, 75, 47],   // Level 2: 
            [310, 70, 48],   // Level 3:
            [315, 65, 49],   // Level 4:
            
            // Medium levels (5-8): Moving toward confusion
            [320, 60, 50],   // Level 5:
            [330, 55, 50],   // Level 6:
            [340, 50, 50],   // Level 7:
            [350, 45, 50],   // Level 8:
            
            // Hard levels (9-12): Near confusion line
            [0, 40, 50],     // Level 9: Red region
            [10, 38, 50],    // Level 10:
            [20, 35, 50],    // Level 11:
            [30, 33, 50],    // Level 12:
            
            // Very hard levels (13-16): At confusion boundary
            [40, 30, 50],    // Level 13:
            [45, 28, 50],    // Level 14:
            [50, 27, 50],    // Level 15:
            [55, 25, 50]     // Level 16: Very close to background hue
        ]
    };

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
            if (!this.ctx) {
                console.error('Failed to get 2D context from canvas');
                throw new Error('Canvas 2D context not available');
            }
            console.log('Canvas context initialized successfully');
            
            // Options with defaults
            this.options = {
                onLevelComplete: options.onLevelComplete || (() => {}),
                onTestComplete: options.onTestComplete || (() => {}),
                onProgress: options.onProgress || (() => {}),
                getInstructionElement: options.getInstructionElement || (() => null),
                getScoreElement: options.getScoreElement || (() => null)
            };

            // Test state
            this.particles = [];
            this.targetPositions = [];
            this.currentLevel = 0;
            this.correctAnswers = 0;
            this.isRunning = false;
            this.hasMissed = false;
            this.animationTimer = null;
            
            // Sizing
            this.setupDimensions();
            
            // Bind methods
            this.handleClick = this.handleClick.bind(this);
            this.handleTouch = this.handleTouch.bind(this);
            this.renderFrame = this.renderFrame.bind(this);
            
            // Initialize
            this.canvas.addEventListener('click', this.handleClick);
            this.canvas.addEventListener('touchstart', this.handleTouch, { passive: false });
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
            
            for (let level = 0; level < CONFIG.totalLevels; level++) {
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
            
            this.processInput(x, y);
        }

        /**
         * Handle touch events
         */
        handleTouch(event) {
            if (!this.isRunning) return;
            
            event.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touch = event.touches[0];
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            this.processInput(x, y);
        }

        /**
         * Process user input (click or touch)
         */
        processInput(x, y) {
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
            this.correctAnswers++;
            this.currentLevel++;
            
            // Update UI
            this.updateInstruction(CONFIG.messages.instruction);
            this.updateProgress();
            
            this.options.onLevelComplete(this.currentLevel - 1, true);
            
            // Check if test complete
            if (this.currentLevel >= CONFIG.totalLevels) {
                this.completeTest();
            } else {
                this.nextLevel();
            }
        }

        /**
         * Handle incorrect click
         */
        onIncorrectResponse() {
            if (this.hasMissed) {
                // Second miss - move to next level
                this.updateInstruction(CONFIG.messages.cantTell);
                this.currentLevel++;
                
                this.options.onLevelComplete(this.currentLevel - 1, false);
                
                if (this.currentLevel >= CONFIG.totalLevels) {
                    this.completeTest();
                } else {
                    this.nextLevel();
                }
            } else {
                // First miss - give another chance
                this.hasMissed = true;
                this.updateInstruction(CONFIG.messages.tryAgain);
            }
        }

        /**
         * Called when "I Can't Tell" button is pressed
         */
        skipLevel() {
            if (!this.isRunning) return;
            
            this.currentLevel++;
            this.options.onLevelComplete(this.currentLevel - 1, false);
            
            if (this.currentLevel >= CONFIG.totalLevels) {
                this.completeTest();
            } else {
                this.nextLevel();
            }
        }

        /**
         * Move to next difficulty level
         */
        nextLevel() {
            this.hasMissed = false;
            
            // Reset grid to background
            this.initGrid(PALETTES.background);
            
            // Set new target color
            this.setTargetColor(PALETTES.levels[this.currentLevel]);
            
            // Update instruction
            this.updateInstruction(CONFIG.messages.instruction);
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
            const percentage = Math.round((this.correctAnswers / CONFIG.totalLevels) * 100);
            const el = this.options.getScoreElement();
            if (el) el.textContent = `${this.correctAnswers} of ${CONFIG.totalLevels}`;
            
            this.options.onProgress(this.correctAnswers, CONFIG.totalLevels, percentage);
        }

        /**
         * Animation loop - renders frames using requestAnimationFrame for Safari compatibility
         */
        startAnimation() {
            const animate = () => {
                if (!this.isRunning) return;
                
                // Render frame
                this.renderFrame();
                
                // Schedule next frame
                this.animationTimer = requestAnimationFrame(animate);
            };
            
            // Start animation
            this.animationTimer = requestAnimationFrame(animate);
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
            console.log('Starting mosaic test...');
            this.isRunning = true;
            this.currentLevel = 0;
            this.correctAnswers = 0;
            this.hasMissed = false;
            
            // Initialize grid and targets
            this.initGrid(PALETTES.background);
            this.generateTargetPositions();
            this.setTargetColor(PALETTES.levels[0]);
            
            this.updateInstruction(CONFIG.messages.instruction);
            this.updateProgress();
            
            // Initial render before starting animation (Safari fix)
            this.renderFrame();
            
            this.startAnimation();
            console.log('Mosaic test started successfully');
        }

        /**
         * Restart the test
         */
        restart() {
            this.stop();
            this.start();
        }

        /**
         * Stop the test
         */
        stop() {
            this.isRunning = false;
            if (this.animationTimer) {
                cancelAnimationFrame(this.animationTimer);
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
            
            const percentage = Math.round((this.correctAnswers / CONFIG.totalLevels) * 100);
            const severity = this.calculateSeverity(percentage);
            
            this.options.onTestComplete({
                correct: this.correctAnswers,
                total: CONFIG.totalLevels,
                percentage: percentage,
                severity: severity
            });
        }

        /**
         * Calculate severity based on score
         */
        calculateSeverity(percentage) {
            if (percentage >= 90) {
                return 'normal';
            } else if (percentage >= 70) {
                return 'mild';
            } else if (percentage >= 50) {
                return 'moderate';
            } else {
                return 'severe';
            }
        }

        /**
         * Display completion graphic on canvas
         */
        showCompletionGraphic() {
            // Grid positions for "END" pattern
            const endPattern = [
                128, 129, 130, 132, 136, 138, 139, 140,
                146, 150, 151, 154, 156, 159,
                164, 165, 168, 170, 172, 174, 177,
                182, 186, 189, 190, 192, 195,
                200, 201, 202, 204, 208, 210, 211, 212
            ];
            
            // Reset to background
            this.initGrid(PALETTES.background);
            
            // Highlight END pattern in bright color
            for (const idx of endPattern) {
                if (this.particles[idx]) {
                    this.particles[idx].setColor(180, 100, 60);
                }
            }
            
            this.renderFrame();
        }

        /**
         * Get current results
         */
        getResults() {
            const percentage = Math.round((this.correctAnswers / CONFIG.totalLevels) * 100);
            return {
                correct: this.correctAnswers,
                total: CONFIG.totalLevels,
                percentage: percentage,
                severity: this.calculateSeverity(percentage)
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
        PALETTES
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = ActiveFilterMosaic;
}
