/**
 * Active Filter Test Controller
 * 
 * Manages the overall test flow, UI updates, and result storage
 * for the deuteranomaly mosaic test.
 */

const ActiveFilterController = (function() {
    'use strict';

    // ============================================
    // State
    // ============================================
    let mosaicTest = null;
    let elements = {};
    let testSession = null;
    let isTestActive = false;

    // ============================================
    // DOM Elements Cache
    // ============================================
    function cacheElements() {
        elements = {
            // Canvas
            canvas: document.getElementById('mosaic-canvas'),
            
            // Buttons
            btnStart: document.getElementById('btn-start'),
            btnRestart: document.getElementById('btn-restart'),
            btnCantTell: document.getElementById('btn-cant-tell'),
            
            // Score display
            scoreDisplay: document.getElementById('score-display'),
            levelDisplay: document.getElementById('level-display'),
            
            // Instruction and results
            instruction: document.getElementById('instruction-text'),
            resultsContainer: document.getElementById('results-container'),
            resultScore: document.getElementById('result-score'),
            resultSeverity: document.getElementById('result-severity'),
            resultDescription: document.getElementById('result-description'),
            
            // Containers
            testContainer: document.getElementById('test-container'),
            startScreen: document.getElementById('start-screen')
        };
    }

    // ============================================
    // Event Handlers
    // ============================================
    function bindEvents() {
        if (elements.btnStart) {
            elements.btnStart.addEventListener('click', startTest);
        }
        
        if (elements.btnRestart) {
            elements.btnRestart.addEventListener('click', restartTest);
        }
        
        if (elements.btnCantTell) {
            elements.btnCantTell.addEventListener('click', handleCantTell);
        }
    }

    // ============================================
    // Test Flow
    // ============================================
    function startTest() {
        if (!mosaicTest) {
            initializeMosaic();
        }
        
        isTestActive = true;
        testSession = {
            startTime: new Date().toISOString(),
            endTime: null,
            results: null
        };
        
        // Update UI
        showElement(elements.testContainer);
        hideElement(elements.startScreen);
        hideElement(elements.resultsContainer);
        
        if (elements.btnCantTell) {
            elements.btnCantTell.disabled = false;
        }
        
        mosaicTest.start();
    }

    function restartTest() {
        if (mosaicTest) {
            mosaicTest.restart();
        }
        
        testSession = {
            startTime: new Date().toISOString(),
            endTime: null,
            results: null
        };
        
        hideElement(elements.resultsContainer);
        
        if (elements.btnCantTell) {
            elements.btnCantTell.disabled = false;
        }
    }

    function handleCantTell() {
        if (mosaicTest && isTestActive) {
            mosaicTest.skipLevel();
        }
    }

    // ============================================
    // Mosaic Initialization
    // ============================================
    function initializeMosaic() {
        try {
            console.log('Initializing mosaic test...');
            mosaicTest = ActiveFilterMosaic.create('#mosaic-canvas', {
                onLevelComplete: handleLevelComplete,
                onTestComplete: handleTestComplete,
                onProgress: handleProgress,
                getInstructionElement: () => elements.instruction,
                getScoreElement: () => elements.scoreDisplay
            });
            console.log('Mosaic test initialized successfully');
        } catch (error) {
            console.error('Failed to initialize mosaic test:', error);
            // Display error to user in a non-intrusive way
            if (elements.instruction) {
                elements.instruction.textContent = 'Error: Unable to initialize test. Please refresh the page.';
                elements.instruction.style.color = 'red';
            }
        }
    }

    // ============================================
    // Callbacks
    // ============================================
    function handleLevelComplete(level, wasCorrect) {
        console.log(`Level ${level + 1} complete: ${wasCorrect ? 'Correct' : 'Skipped'}`);
        
        if (elements.levelDisplay) {
            elements.levelDisplay.textContent = `Level ${level + 2} of 16`;
        }
    }

    function handleProgress(correct, total, percentage) {
        // Progress is updated via getScoreElement callback
    }

    function handleTestComplete(results) {
        isTestActive = false;
        
        testSession.endTime = new Date().toISOString();
        testSession.results = results;
        
        // Save to storage
        saveSession(testSession);
        
        // Update UI
        showResults(results);
        
        if (elements.btnCantTell) {
            elements.btnCantTell.disabled = true;
        }
    }

    // ============================================
    // Results Display
    // ============================================
    function showResults(results) {
        showElement(elements.resultsContainer);
        
        // Score
        if (elements.resultScore) {
            elements.resultScore.textContent = `${results.correct} out of ${results.total} (${results.percentage}%)`;
        }
        
        // Severity
        if (elements.resultSeverity) {
            let severityText = '';
            let severityClass = '';
            
            switch (results.severity) {
                case 'normal':
                    severityText = 'Normal Color Vision';
                    severityClass = 'severity-normal';
                    break;
                case 'mild':
                    severityText = 'Mild Deuteranomaly';
                    severityClass = 'severity-mild';
                    break;
                case 'moderate':
                    severityText = 'Moderate Deuteranomaly';
                    severityClass = 'severity-moderate';
                    break;
                case 'severe':
                    severityText = 'Severe Deuteranomaly';
                    severityClass = 'severity-severe';
                    break;
            }
            
            elements.resultSeverity.textContent = severityText;
            elements.resultSeverity.className = severityClass;
        }
        
        // Description
        if (elements.resultDescription) {
            let description = getResultDescription(results.severity);
            elements.resultDescription.innerHTML = description;
        }
    }

    function getResultDescription(severity) {
        switch (severity) {
            case 'normal':
                return `Your test results indicate normal red-green color perception. 
                        You successfully distinguished the target colors from the background 
                        in most test levels.`;
            
            case 'mild':
                return `Your test results suggest mild deuteranomaly (reduced green sensitivity). 
                        You may experience minor difficulties distinguishing certain shades of 
                        red and green, particularly in low light conditions. The JLTTCK Active 
                        Filter may help enhance color discrimination.`;
            
            case 'moderate':
                return `Your test results suggest moderate deuteranomaly (reduced green sensitivity). 
                        You likely experience noticeable difficulties distinguishing certain shades 
                        of red and green. The JLTTCK Active Filter is designed to help enhance 
                        color discrimination for your condition. Consider consulting with an eye care 
                        professional for a comprehensive color vision assessment.`;
            
            case 'severe':
                return `Your test results suggest severe deuteranomaly (significantly reduced green sensitivity). 
                        You may experience substantial difficulties distinguishing red and green colors. 
                        The JLTTCK Active Filter may provide some assistance. We recommend consulting 
                        with an eye care professional for a comprehensive color vision assessment and 
                        to discuss accommodation strategies.`;
            
            default:
                return '';
        }
    }

    // ============================================
    // Storage
    // ============================================
    const STORAGE_KEY = 'activefilter_sessions';

    function saveSession(session) {
        try {
            const sessions = getSessions();
            sessions.push(session);
            // Keep only last 10 sessions
            if (sessions.length > 10) {
                sessions.shift();
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
        } catch (e) {
            console.warn('Failed to save session:', e);
        }
    }

    function getSessions() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.warn('Failed to load sessions:', e);
            return [];
        }
    }

    function clearSessions() {
        localStorage.removeItem(STORAGE_KEY);
    }

    // ============================================
    // Utility Functions
    // ============================================
    function showElement(el) {
        if (el) el.classList.remove('hidden');
    }

    function hideElement(el) {
        if (el) el.classList.add('hidden');
    }

    // ============================================
    // Initialization
    // ============================================
    function init() {
        cacheElements();
        bindEvents();
        
        console.log('Active Filter Test Controller initialized');
    }

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ============================================
    // Public API
    // ============================================
    return {
        start: startTest,
        restart: restartTest,
        stop: () => mosaicTest && mosaicTest.stop(),
        getResults: () => mosaicTest && mosaicTest.getResults(),
        getSessions,
        clearSessions
    };
})();
