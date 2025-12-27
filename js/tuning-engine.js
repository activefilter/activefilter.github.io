/**
 * ColorVision Pro - Tuning Engine
 * Automatically tunes correction filter parameters through iterative testing
 */

const TuningEngine = {
    /**
     * Tuning state
     */
    state: {
        isRunning: false,
        currentRound: 0,
        maxRounds: 5,
        currentParams: null,
        bestParams: null,
        bestScore: 0,
        history: [],
        plateIndex: 0,
        currentPlates: [],
        plateResponses: []
    },

    /**
     * Configuration
     */
    config: {
        maxRounds: 5,
        platesPerRound: 5,
        improvementThreshold: 5, // Stop if improvement < 5%
        maxNoImprovement: 2      // Stop after 2 rounds without improvement
    },

    /**
     * Callbacks
     */
    callbacks: {
        onRoundStart: null,
        onPlateReady: null,
        onPlateComplete: null,
        onRoundComplete: null,
        onTuningComplete: null,
        onParamsUpdate: null
    },

    /**
     * Initialize tuning
     */
    init(options = {}) {
        const {
            baselineSeverity = 'moderate',
            baselineScore = 50,
            callbacks = {}
        } = options;

        this.callbacks = { ...this.callbacks, ...callbacks };

        // Get initial parameters based on baseline severity
        const initialParams = ColorFilter.getInitialParams(baselineSeverity);

        this.state = {
            isRunning: false,
            currentRound: 0,
            maxRounds: this.config.maxRounds,
            currentParams: initialParams,
            bestParams: { ...initialParams },
            bestScore: baselineScore,
            baselineScore,
            history: [],
            noImprovementCount: 0,
            plateIndex: 0,
            currentPlates: [],
            plateResponses: []
        };

        return this;
    },

    /**
     * Start tuning process
     */
    start() {
        if (this.state.isRunning) return;

        this.state.isRunning = true;
        this.startRound();
    },

    /**
     * Start a new tuning round
     */
    startRound() {
        this.state.currentRound++;
        this.state.plateIndex = 0;
        this.state.plateResponses = [];

        // Generate plates for this round with current filter
        this.state.currentPlates = MosaicGenerator.generateTuningSequence({
            plateCount: this.config.platesPerRound,
            filterParams: this.state.currentParams,
            seed: Utils.generateSeed(`round-${this.state.currentRound}`)
        });

        if (this.callbacks.onRoundStart) {
            this.callbacks.onRoundStart(
                this.state.currentRound,
                this.state.maxRounds,
                this.state.currentParams
            );
        }

        if (this.callbacks.onParamsUpdate) {
            this.callbacks.onParamsUpdate(this.state.currentParams);
        }

        this.showCurrentPlate();
    },

    /**
     * Show current plate
     */
    showCurrentPlate() {
        const plate = this.state.currentPlates[this.state.plateIndex];
        
        if (!plate) {
            this.completeRound();
            return;
        }

        this.state.plateStartTime = Date.now();

        if (this.callbacks.onPlateReady) {
            this.callbacks.onPlateReady(
                plate,
                this.state.plateIndex,
                this.state.currentPlates.length
            );
        }
    },

    /**
     * Get current plate
     */
    getCurrentPlate() {
        return this.state.currentPlates[this.state.plateIndex] || null;
    },

    /**
     * Record response
     */
    recordResponse(response) {
        const plate = this.getCurrentPlate();
        if (!plate) return;

        const responseTime = Date.now() - this.state.plateStartTime;
        const isCorrect = response === plate.target.value;

        const responseData = {
            plateIndex: this.state.plateIndex,
            plateType: plate.type,
            targetValue: plate.target.value,
            userResponse: response,
            isCorrect,
            responseTime
        };

        this.state.plateResponses.push(responseData);

        if (this.callbacks.onPlateComplete) {
            this.callbacks.onPlateComplete(responseData);
        }

        // Move to next plate
        this.state.plateIndex++;
        
        if (this.state.plateIndex >= this.state.currentPlates.length) {
            this.completeRound();
        } else {
            this.showCurrentPlate();
        }
    },

    /**
     * Skip plate
     */
    skipPlate() {
        this.recordResponse('none');
    },

    /**
     * Complete current round
     */
    completeRound() {
        // Calculate round score
        const correct = this.state.plateResponses.filter(r => r.isCorrect).length;
        const total = this.state.plateResponses.length;
        const score = Utils.percentage(correct, total);

        const roundResult = {
            round: this.state.currentRound,
            params: { ...this.state.currentParams },
            score,
            correct,
            total,
            responses: [...this.state.plateResponses]
        };

        this.state.history.push(roundResult);

        // Check if this is the best score
        if (score > this.state.bestScore) {
            this.state.bestScore = score;
            this.state.bestParams = { ...this.state.currentParams };
            this.state.noImprovementCount = 0;
        } else {
            this.state.noImprovementCount++;
        }

        if (this.callbacks.onRoundComplete) {
            this.callbacks.onRoundComplete(roundResult, this.state.bestScore);
        }

        // Decide whether to continue
        if (this.shouldContinue()) {
            this.adjustParameters();
            this.startRound();
        } else {
            this.complete();
        }
    },

    /**
     * Check if tuning should continue
     */
    shouldContinue() {
        // Max rounds reached
        if (this.state.currentRound >= this.state.maxRounds) {
            return false;
        }

        // Perfect score achieved
        if (this.state.bestScore >= 100) {
            return false;
        }

        // No improvement for too long
        if (this.state.noImprovementCount >= this.config.maxNoImprovement) {
            return false;
        }

        return true;
    },

    /**
     * Adjust parameters for next round
     */
    adjustParameters() {
        const { currentParams, history, bestParams, bestScore } = this.state;
        const lastRound = history[history.length - 1];

        // If last round was worse than best, try a neighbor of best params
        if (lastRound.score < bestScore) {
            const neighbors = ColorFilter.generateNeighbors(bestParams, 1);
            
            // Pick a random unexplored neighbor
            const unexplored = neighbors.filter(n => 
                !history.some(h => ColorFilter.similarity(h.params, n) > 0.95)
            );

            if (unexplored.length > 0) {
                this.state.currentParams = Utils.randomPick(unexplored);
            } else {
                // Explore with smaller steps
                const fineNeighbors = ColorFilter.generateNeighbors(bestParams, 0.5);
                this.state.currentParams = Utils.randomPick(fineNeighbors);
            }
        } else {
            // Last round was good, try to improve further
            const neighbors = ColorFilter.generateNeighbors(currentParams, 1);
            
            // Prefer unexplored neighbors
            const unexplored = neighbors.filter(n => 
                !history.some(h => ColorFilter.similarity(h.params, n) > 0.9)
            );

            if (unexplored.length > 0) {
                this.state.currentParams = Utils.randomPick(unexplored);
            } else {
                // Try interpolation towards even stronger settings
                this.state.currentParams = this.exploreNewDirection(currentParams);
            }
        }

        // Ensure params are valid
        this.state.currentParams = ColorFilter.normalizeParams(this.state.currentParams);
    },

    /**
     * Explore a new direction in parameter space
     */
    exploreNewDirection(baseParams) {
        const rng = Math.random;
        const ranges = ColorFilter.paramRanges;
        
        // Randomly perturb parameters
        const newParams = { ...baseParams };
        
        Object.keys(ranges).forEach(param => {
            const range = ranges[param];
            const perturbation = (rng() - 0.5) * range.step * 2;
            newParams[param] = Utils.clamp(
                newParams[param] + perturbation,
                range.min,
                range.max
            );
        });

        return newParams;
    },

    /**
     * Complete tuning
     */
    complete() {
        this.state.isRunning = false;

        const result = {
            success: true,
            rounds: this.state.currentRound,
            bestParams: this.state.bestParams,
            bestScore: this.state.bestScore,
            baselineScore: this.state.baselineScore,
            improvement: this.state.bestScore - this.state.baselineScore,
            history: this.state.history
        };

        if (this.callbacks.onTuningComplete) {
            this.callbacks.onTuningComplete(result);
        }

        return result;
    },

    /**
     * Abort tuning
     */
    abort() {
        this.state.isRunning = false;
        return {
            aborted: true,
            bestParams: this.state.bestParams,
            bestScore: this.state.bestScore
        };
    },

    /**
     * Get current status
     */
    getStatus() {
        return {
            isRunning: this.state.isRunning,
            round: this.state.currentRound,
            maxRounds: this.state.maxRounds,
            plateIndex: this.state.plateIndex,
            platesPerRound: this.config.platesPerRound,
            currentParams: this.state.currentParams,
            bestParams: this.state.bestParams,
            bestScore: this.state.bestScore
        };
    },

    /**
     * Check if tuning is active
     */
    isRunning() {
        return this.state.isRunning;
    }
};

// Export for use in other modules
window.TuningEngine = TuningEngine;
