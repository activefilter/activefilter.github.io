/**
 * ColorVision Pro - Test Engine
 * Manages test flow, timing, and result calculation
 */

const TestEngine = {
    /**
     * Test state
     */
    state: {
        isRunning: false,
        currentPlateIndex: 0,
        plates: [],
        responses: [],
        startTime: null,
        plateStartTime: null,
        filterParams: null,
        mode: 'baseline' // 'baseline', 'tuning', 'validation'
    },

    /**
     * Test configuration
     */
    config: {
        baselinePlateCount: 12,
        validationPlateCount: 8,
        tuningPlateCount: 5,
        maxResponseTime: 30000, // 30 seconds max per plate
        difficulty: 'medium'
    },

    /**
     * Callbacks
     */
    callbacks: {
        onPlateReady: null,
        onPlateComplete: null,
        onTestComplete: null,
        onTimeUpdate: null
    },

    /**
     * Initialize a new test
     */
    init(options = {}) {
        const {
            mode = 'baseline',
            plateCount = null,
            filterParams = null,
            callbacks = {}
        } = options;

        // Set callbacks
        this.callbacks = { ...this.callbacks, ...callbacks };

        // Determine plate count based on mode
        let count;
        if (plateCount) {
            count = plateCount;
        } else {
            switch (mode) {
                case 'baseline':
                    count = this.config.baselinePlateCount;
                    break;
                case 'validation':
                    count = this.config.validationPlateCount;
                    break;
                case 'tuning':
                    count = this.config.tuningPlateCount;
                    break;
                default:
                    count = this.config.baselinePlateCount;
            }
        }

        // Generate plates
        const seed = Utils.generateSeed();
        const generateFn = mode === 'tuning' 
            ? MosaicGenerator.generateTuningSequence.bind(MosaicGenerator)
            : MosaicGenerator.generateTestSequence.bind(MosaicGenerator);

        this.state = {
            isRunning: false,
            currentPlateIndex: 0,
            plates: generateFn({
                plateCount: count,
                difficulty: this.config.difficulty,
                filterParams,
                seed
            }),
            responses: [],
            startTime: null,
            plateStartTime: null,
            filterParams,
            mode,
            seed
        };

        return this;
    },

    /**
     * Start the test
     */
    start() {
        if (this.state.isRunning) return;

        this.state.isRunning = true;
        this.state.startTime = Date.now();
        this.state.currentPlateIndex = 0;
        this.state.responses = [];

        this.showCurrentPlate();
        this.startTimer();
    },

    /**
     * Show current plate
     */
    showCurrentPlate() {
        const plate = this.getCurrentPlate();
        if (!plate) {
            this.complete();
            return;
        }

        this.state.plateStartTime = Date.now();
        
        if (this.callbacks.onPlateReady) {
            this.callbacks.onPlateReady(plate, this.state.currentPlateIndex, this.state.plates.length);
        }
    },

    /**
     * Get current plate
     */
    getCurrentPlate() {
        return this.state.plates[this.state.currentPlateIndex] || null;
    },

    /**
     * Record response and move to next plate
     */
    recordResponse(response) {
        const plate = this.getCurrentPlate();
        if (!plate) return;

        const responseTime = Date.now() - this.state.plateStartTime;
        const isCorrect = this.checkAnswer(response, plate);

        const responseData = {
            plateIndex: this.state.currentPlateIndex,
            plateType: plate.type,
            targetType: plate.target.type,
            targetValue: plate.target.value,
            userResponse: response,
            isCorrect,
            responseTime,
            difficulty: plate.difficulty,
            seed: plate.seed
        };

        this.state.responses.push(responseData);

        if (this.callbacks.onPlateComplete) {
            this.callbacks.onPlateComplete(responseData);
        }

        // Move to next plate
        this.state.currentPlateIndex++;
        
        if (this.state.currentPlateIndex >= this.state.plates.length) {
            this.complete();
        } else {
            this.showCurrentPlate();
        }
    },

    /**
     * Skip current plate (can't see)
     */
    skipPlate() {
        this.recordResponse('none');
    },

    /**
     * Check if answer is correct
     */
    checkAnswer(response, plate) {
        if (response === 'none' || response === null || response === undefined) {
            return false;
        }

        const correctAnswer = plate.target.value;
        
        // Normalize both for comparison
        const normalizedResponse = String(response).toLowerCase().trim();
        const normalizedCorrect = String(correctAnswer).toLowerCase().trim();

        return normalizedResponse === normalizedCorrect;
    },

    /**
     * Complete the test
     */
    complete() {
        this.state.isRunning = false;
        this.stopTimer();

        const results = this.calculateResults();

        if (this.callbacks.onTestComplete) {
            this.callbacks.onTestComplete(results);
        }

        return results;
    },

    /**
     * Calculate test results
     */
    calculateResults() {
        const { responses, mode, filterParams, startTime, plates } = this.state;
        const endTime = Date.now();

        // Separate by plate type
        const deutanResponses = responses.filter(r => r.plateType === 'deutanConfusion');
        const controlResponses = responses.filter(r => r.plateType === 'control');

        // Calculate scores
        const deutanCorrect = deutanResponses.filter(r => r.isCorrect).length;
        const controlCorrect = controlResponses.filter(r => r.isCorrect).length;

        const deutanTotal = deutanResponses.length;
        const controlTotal = controlResponses.length;

        const overallCorrect = responses.filter(r => r.isCorrect).length;
        const overallTotal = responses.length;

        // Calculate percentages
        const deutanScore = Utils.percentage(deutanCorrect, deutanTotal);
        const controlScore = Utils.percentage(controlCorrect, controlTotal);
        const overallScore = Utils.percentage(overallCorrect, overallTotal);

        // Calculate response times
        const responseTimes = responses.map(r => r.responseTime);
        const avgResponseTime = Utils.average(responseTimes);
        const totalTime = (endTime - startTime) / 1000;

        // Estimate severity
        const severity = this.estimateSeverity(deutanScore, controlScore);

        return {
            mode,
            timestamp: new Date().toISOString(),
            filterParams,
            
            // Scores
            overall: {
                correct: overallCorrect,
                total: overallTotal,
                score: overallScore
            },
            deutan: {
                correct: deutanCorrect,
                total: deutanTotal,
                score: deutanScore
            },
            control: {
                correct: controlCorrect,
                total: controlTotal,
                score: controlScore
            },
            
            // Timing
            timing: {
                totalTime: Math.round(totalTime * 10) / 10,
                avgResponseTime: Math.round(avgResponseTime),
                responseTimes
            },
            
            // Severity
            severity,
            
            // Raw data
            responses,
            
            // Metadata
            plateCount: plates.length,
            seed: this.state.seed
        };
    },

    /**
     * Estimate severity of color vision deficiency
     */
    estimateSeverity(deutanScore, controlScore) {
        // If control score is low, user may have other issues (attention, etc.)
        // We compare deutan performance relative to control
        
        let adjustedScore = deutanScore;
        
        // If control score is perfect, use raw deutan score
        // If control score is imperfect, adjust expectations
        if (controlScore < 100 && controlScore > 0) {
            // Scale deutan score relative to control performance
            adjustedScore = (deutanScore / controlScore) * 100;
            adjustedScore = Math.min(adjustedScore, 100);
        }

        // Calculate severity value (0-100, higher = more severe)
        const severityValue = 100 - adjustedScore;

        // Determine bucket
        let bucket;
        if (severityValue <= 15) {
            bucket = 'none';
        } else if (severityValue <= 35) {
            bucket = 'mild';
        } else if (severityValue <= 60) {
            bucket = 'moderate';
        } else {
            bucket = 'strong';
        }

        return {
            value: Math.round(severityValue),
            bucket,
            deutanScore,
            controlScore,
            description: this.getSeverityDescription(bucket)
        };
    },

    /**
     * Get human-readable severity description
     */
    getSeverityDescription(bucket) {
        const descriptions = {
            none: 'No significant red-green color confusion detected. Your color vision appears normal for the tested range.',
            mild: 'Mild red-green color confusion detected. You may have subtle difficulty distinguishing some shades of red and green.',
            moderate: 'Moderate red-green color confusion detected. You likely have deuteranomaly, a common form of color vision deficiency.',
            strong: 'Strong red-green color confusion detected. You may have deuteranopia or strong deuteranomaly, significantly affecting red-green color perception.'
        };
        return descriptions[bucket] || descriptions.none;
    },

    /**
     * Timer management
     */
    timerInterval: null,

    startTimer() {
        this.stopTimer();
        this.timerInterval = setInterval(() => {
            if (this.state.isRunning && this.callbacks.onTimeUpdate) {
                const elapsed = (Date.now() - this.state.startTime) / 1000;
                this.callbacks.onTimeUpdate(elapsed);
            }
        }, 100);
    },

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    },

    /**
     * Stop test early
     */
    abort() {
        this.state.isRunning = false;
        this.stopTimer();
    },

    /**
     * Get progress info
     */
    getProgress() {
        return {
            current: this.state.currentPlateIndex + 1,
            total: this.state.plates.length,
            percentage: Utils.percentage(this.state.currentPlateIndex, this.state.plates.length)
        };
    },

    /**
     * Check if test is running
     */
    isRunning() {
        return this.state.isRunning;
    }
};

// Export for use in other modules
window.TestEngine = TestEngine;
