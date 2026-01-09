/**
 * ColorVision Pro - Outlier Test Engine
 * Manages the outlier detection test flow, timing, and result calculation
 * Works with AnimatedMosaic for the visual rendering
 */

const OutlierTestEngine = {
    /**
     * Test state
     */
    state: {
        isRunning: false,
        currentPlateIndex: 0,
        plates: [],
        responses: [],
        testStartTime: null,
        mode: 'baseline', // 'baseline', 'tuning', 'validation'
        filterParams: null,
        seed: null
    },

    /**
     * Configuration
     */
    config: {
        baselinePlateCount: 16,
        tuningPlateCount: 8,
        validationPlateCount: 12,
        feedbackDelay: 1200,
        plateTransitionDelay: 0
    },

    /**
     * Callbacks
     */
    callbacks: {
        onPlateStart: null,
        onPlateComplete: null,
        onTestComplete: null,
        onProgress: null,
        onTimeout: null
    },

    /**
     * Reference to AnimatedMosaic
     */
    mosaic: null,

    /**
     * Initialize the test engine
     */
    init(options = {}) {
        const {
            mosaic = AnimatedMosaic,
            mode = 'baseline',
            filterParams = null,
            callbacks = {}
        } = options;

        this.mosaic = mosaic;
        this.callbacks = { ...this.callbacks, ...callbacks };
        this.state.mode = mode;
        this.state.filterParams = filterParams;
        this.state.seed = Utils.generateSeed();

        return this;
    },

    /**
     * Generate test plates based on mode
     */
    generatePlates() {
        const { mode, seed } = this.state;
        
        let plateCount;
        let deutanRatio;
        
        switch (mode) {
            case 'baseline':
                plateCount = this.config.baselinePlateCount;
                deutanRatio = 0.625; // 10 deutan, 6 control
                break;
            case 'tuning':
                plateCount = this.config.tuningPlateCount;
                deutanRatio = 0.875; // 7 deutan, 1 control (focus on problem area)
                break;
            case 'validation':
                plateCount = this.config.validationPlateCount;
                deutanRatio = 0.667; // 8 deutan, 4 control
                break;
            default:
                plateCount = this.config.baselinePlateCount;
                deutanRatio = 0.625;
        }

        return this.mosaic.generateTestSequence({
            totalPlates: plateCount,
            deutanRatio,
            baseSeed: seed,
            progressiveDifficulty: mode === 'baseline'
        });
    },

    /**
     * Start the test
     */
    start() {
        if (this.state.isRunning) return;

        // Generate plates
        this.state.plates = this.generatePlates();
        this.state.responses = [];
        this.state.currentPlateIndex = 0;
        this.state.testStartTime = Date.now();
        this.state.isRunning = true;

        // Start first plate
        this.showCurrentPlate();
    },

    /**
     * Show the current plate
     */
    showCurrentPlate() {
        if (!this.state.isRunning) return;

        const plate = this.getCurrentPlate();
        if (!plate) {
            this.complete();
            return;
        }

        // Notify progress
        if (this.callbacks.onProgress) {
            this.callbacks.onProgress(
                this.state.currentPlateIndex,
                this.state.plates.length
            );
        }

        // Start plate callback
        if (this.callbacks.onPlateStart) {
            this.callbacks.onPlateStart(plate, this.state.currentPlateIndex);
        }

        // Start the animated plate
        this.mosaic.startPlate(plate, () => this.handleTimeout());
    },

    /**
     * Get the current plate
     */
    getCurrentPlate() {
        return this.state.plates[this.state.currentPlateIndex] || null;
    },

    /**
     * Handle user response (click on a square)
     */
    handleResponse(clientX, clientY) {
        if (!this.state.isRunning) return null;

        // Get click result from mosaic
        const result = this.mosaic.handleClick(clientX, clientY);
        if (!result) return null;

        // Record the response
        this.recordResponse(result);

        return result;
    },

    /**
     * Handle "I can't tell" button
     */
    handleCantTell() {
        if (!this.state.isRunning) return;

        const plate = this.getCurrentPlate();
        if (!plate) return;

        this.mosaic.pause();

        const result = {
            selectedIndex: null,
            correctIndex: plate.outlierIndex,
            isCorrect: false,
            responseTime: performance.now() - plate.startTime,
            plateType: plate.type,
            difficulty: plate.difficulty,
            skipped: true
        };

        this.recordResponse(result);
    },

    /**
     * Handle timeout
     */
    handleTimeout() {
        if (!this.state.isRunning) return;

        const plate = this.getCurrentPlate();
        if (!plate) return;

        const result = {
            selectedIndex: null,
            correctIndex: plate.outlierIndex,
            isCorrect: false,
            responseTime: AnimatedMosaic.config.maxResponseTime,
            plateType: plate.type,
            difficulty: plate.difficulty,
            timeout: true
        };

        if (this.callbacks.onTimeout) {
            this.callbacks.onTimeout(plate, this.state.currentPlateIndex);
        }

        this.recordResponse(result);
    },

    /**
     * Record a response and proceed
     */
    recordResponse(result) {
        const plate = this.getCurrentPlate();
        
        const responseData = {
            plateIndex: this.state.currentPlateIndex,
            plateType: result.plateType,
            difficulty: result.difficulty,
            selectedIndex: result.selectedIndex,
            correctIndex: result.correctIndex,
            isCorrect: result.isCorrect,
            responseTime: result.responseTime,
            skipped: result.skipped || false,
            timeout: result.timeout || false,
            plateSeed: plate ? plate.seed : null,
            paletteUsed: plate ? plate.palette.name : null
        };

        this.state.responses.push(responseData);

        // Notify
        if (this.callbacks.onPlateComplete) {
            this.callbacks.onPlateComplete(responseData, result);
        }

        // Show feedback then proceed
        this.mosaic.showFeedback(result, () => {
            setTimeout(() => {
                this.nextPlate();
            }, this.config.plateTransitionDelay);
        });
    },

    /**
     * Move to next plate
     */
    nextPlate() {
        this.state.currentPlateIndex++;

        if (this.state.currentPlateIndex >= this.state.plates.length) {
            this.complete();
        } else {
            this.showCurrentPlate();
        }
    },

    /**
     * Complete the test
     */
    complete() {
        this.state.isRunning = false;
        this.mosaic.stop();

        const results = this.calculateResults();

        if (this.callbacks.onTestComplete) {
            this.callbacks.onTestComplete(results);
        }

        return results;
    },

    /**
     * Calculate comprehensive test results
     */
    calculateResults() {
        const { responses, testStartTime, mode, seed } = this.state;
        const testEndTime = Date.now();

        // Separate by plate type
        const deutanResponses = responses.filter(r => r.plateType === 'deutan');
        const controlResponses = responses.filter(r => r.plateType === 'control');

        // Calculate scores
        const calcScore = (responseList) => {
            const total = responseList.length;
            if (total === 0) return { correct: 0, total: 0, score: 0 };
            const correct = responseList.filter(r => r.isCorrect).length;
            return {
                correct,
                total,
                score: Math.round((correct / total) * 100)
            };
        };

        const deutanStats = calcScore(deutanResponses);
        const controlStats = calcScore(controlResponses);
        const overallStats = calcScore(responses);

        // Response time analysis
        const validResponseTimes = responses
            .filter(r => !r.timeout && !r.skipped)
            .map(r => r.responseTime);

        const avgResponseTime = validResponseTimes.length > 0
            ? validResponseTimes.reduce((a, b) => a + b, 0) / validResponseTimes.length
            : 0;

        const totalTestTime = (testEndTime - testStartTime) / 1000;

        // Calculate severity
        const severity = this.calculateSeverity(deutanStats, controlStats);

        // Difficulty breakdown
        const difficultyBreakdown = this.calculateDifficultyBreakdown(responses);

        return {
            mode,
            seed,
            timestamp: new Date().toISOString(),
            
            overall: {
                ...overallStats,
                percentage: overallStats.score
            },
            
            deutan: {
                ...deutanStats,
                responses: deutanResponses
            },
            
            control: {
                ...controlStats,
                responses: controlResponses
            },
            
            timing: {
                avgResponseTime: Math.round(avgResponseTime),
                avgResponseTimeSeconds: (avgResponseTime / 1000).toFixed(2),
                totalTestTime: Math.round(totalTestTime),
                responses: responses.map(r => ({
                    plateIndex: r.plateIndex,
                    time: r.responseTime
                }))
            },
            
            severity,
            
            difficultyBreakdown,
            
            summary: {
                skipped: responses.filter(r => r.skipped).length,
                timedOut: responses.filter(r => r.timeout).length,
                answered: responses.filter(r => !r.skipped && !r.timeout).length
            },

            rawResponses: responses
        };
    },

    /**
     * Calculate severity based on performance difference
     */
    calculateSeverity(deutanStats, controlStats) {
        // If control score is poor, test may be invalid
        if (controlStats.score < 50) {
            return {
                value: 0,
                bucket: 'inconclusive',
                description: 'Control plate performance was too low for reliable assessment',
                confidence: 'low'
            };
        }

        // Calculate the performance gap
        const gap = controlStats.score - deutanStats.score;
        
        // Determine severity bucket
        let bucket, value, description;
        
        if (gap <= 10 && deutanStats.score >= 70) {
            bucket = 'none';
            value = 0;
            description = 'No significant indicators of red-green color vision deficiency detected';
        } else if (gap <= 25 || deutanStats.score >= 60) {
            bucket = 'mild';
            value = 25;
            description = 'Mild indicators of red-green color confusion detected';
        } else if (gap <= 45 || deutanStats.score >= 40) {
            bucket = 'moderate';
            value = 55;
            description = 'Moderate indicators of red-green color vision deficiency detected';
        } else {
            bucket = 'strong';
            value = 85;
            description = 'Strong indicators of red-green color vision deficiency detected';
        }

        // Confidence based on sample size and control performance
        let confidence = 'medium';
        if (controlStats.total >= 5 && controlStats.score >= 80) {
            confidence = 'high';
        } else if (controlStats.total < 3 || controlStats.score < 60) {
            confidence = 'low';
        }

        return {
            value,
            bucket,
            description,
            confidence,
            performanceGap: gap,
            deutanScore: deutanStats.score,
            controlScore: controlStats.score
        };
    },

    /**
     * Calculate breakdown by difficulty level
     */
    calculateDifficultyBreakdown(responses) {
        const levels = ['easy', 'medium', 'hard'];
        const breakdown = {};

        levels.forEach(level => {
            const levelResponses = responses.filter(r => r.difficulty === level);
            if (levelResponses.length > 0) {
                const correct = levelResponses.filter(r => r.isCorrect).length;
                breakdown[level] = {
                    total: levelResponses.length,
                    correct,
                    score: Math.round((correct / levelResponses.length) * 100)
                };
            }
        });

        return breakdown;
    },

    /**
     * Stop the test
     */
    stop() {
        this.state.isRunning = false;
        this.mosaic.stop();
    },

    /**
     * Reset for a new test
     */
    reset() {
        this.stop();
        this.state = {
            isRunning: false,
            currentPlateIndex: 0,
            plates: [],
            responses: [],
            testStartTime: null,
            mode: 'baseline',
            filterParams: null,
            seed: null
        };
    }
};

// Export
window.OutlierTestEngine = OutlierTestEngine;
