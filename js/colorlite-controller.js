/**
 * Colorlite Test Controller
 * 
 * Manages the overall test flow, UI updates, result storage and export.
 * Works with ColorliteMosaic for the visual test rendering.
 */

const ColorliteTestController = (function() {
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
            btnDontSee: document.getElementById('btn-dont-see'),
            btnExit: document.getElementById('btn-exit'),
            btnExportJSON: document.getElementById('btn-export-json'),
            btnExportCSV: document.getElementById('btn-export-csv'),
            
            // Score displays
            scoreRedGreen: document.getElementById('score-red-green'),
            scorePurpleBlue: document.getElementById('score-purple-blue'),
            scorePurpleGreen: document.getElementById('score-purple-green'),
            
            // Instruction and diagnosis
            instruction: document.getElementById('instruction-text'),
            diagnosisContainer: document.getElementById('diagnosis-container'),
            diagnosisType: document.getElementById('diagnosis-type'),
            diagnosisSeverity: document.getElementById('diagnosis-severity'),
            diagnosisDescription: document.getElementById('diagnosis-description'),
            
            // Containers
            testContainer: document.getElementById('test-container'),
            resultsContainer: document.getElementById('results-container'),
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
        
        if (elements.btnDontSee) {
            elements.btnDontSee.addEventListener('click', handleDontSee);
        }
        
        if (elements.btnExit) {
            elements.btnExit.addEventListener('click', exitTest);
        }
        
        if (elements.btnExportJSON) {
            elements.btnExportJSON.addEventListener('click', exportJSON);
        }
        
        if (elements.btnExportCSV) {
            elements.btnExportCSV.addEventListener('click', exportCSV);
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
            results: null,
            diagnosis: null
        };
        
        // Update UI
        showElement(elements.testContainer);
        hideElement(elements.startScreen);
        hideElement(elements.resultsContainer);
        hideElement(elements.diagnosisContainer);
        
        if (elements.btnDontSee) {
            elements.btnDontSee.disabled = false;
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
            results: null,
            diagnosis: null
        };
        
        hideElement(elements.diagnosisContainer);
        
        if (elements.btnDontSee) {
            elements.btnDontSee.disabled = false;
        }
    }

    function handleDontSee() {
        if (mosaicTest && isTestActive) {
            mosaicTest.skipLevel();
        }
    }

    function exitTest() {
        if (mosaicTest) {
            mosaicTest.stop();
        }
        isTestActive = false;
        
        // Go to Colorlite contact page
        window.location.href = 'https://www.colorlitelens.com/contact.html';
    }

    // ============================================
    // Mosaic Initialization
    // ============================================
    function initializeMosaic() {
        mosaicTest = ColorliteMosaic.create('#mosaic-canvas', {
            onLevelComplete: handleLevelComplete,
            onCategoryComplete: handleCategoryComplete,
            onTestComplete: handleTestComplete,
            onProgress: handleProgress,
            getInstructionElement: () => elements.instruction,
            getResultElements: () => ({
                p1: elements.scoreRedGreen,
                p2: elements.scorePurpleBlue,
                p3: elements.scorePurpleGreen
            })
        });
    }

    // ============================================
    // Callbacks
    // ============================================
    function handleLevelComplete(categoryIndex, level) {
        console.log(`Category ${categoryIndex}, Level ${level} complete`);
    }

    function handleCategoryComplete(categoryIndex, results) {
        console.log(`Category ${categoryIndex} complete:`, results);
    }

    function handleProgress(results) {
        // Results are updated automatically via getResultElements
    }

    function handleTestComplete(results, diagnosis) {
        isTestActive = false;
        
        testSession.endTime = new Date().toISOString();
        testSession.results = results;
        testSession.diagnosis = diagnosis;
        
        // Save to storage
        saveSession(testSession);
        
        // Update UI
        showDiagnosis(diagnosis);
        showElement(elements.resultsContainer);
        
        if (elements.btnDontSee) {
            elements.btnDontSee.disabled = true;
        }
    }

    // ============================================
    // Diagnosis Display
    // ============================================
    function showDiagnosis(diagnosis) {
        showElement(elements.diagnosisContainer);
        
        // Type
        if (elements.diagnosisType) {
            let typeLabel = '';
            switch (diagnosis.type) {
                case 'normal':
                    typeLabel = 'NORMAL COLOR VISION';
                    break;
                case 'deutan':
                    typeLabel = 'DEUTAN TYPE COLOR VISION DEFICIENCY';
                    break;
                case 'protan':
                    typeLabel = 'PROTAN TYPE COLOR VISION DEFICIENCY';
                    break;
                default:
                    typeLabel = diagnosis.type.toUpperCase();
            }
            elements.diagnosisType.textContent = typeLabel;
        }
        
        // Severity
        if (elements.diagnosisSeverity) {
            if (diagnosis.severity !== 'none') {
                elements.diagnosisSeverity.textContent = diagnosis.severity.toUpperCase();
                showElement(elements.diagnosisSeverity);
            } else {
                hideElement(elements.diagnosisSeverity);
            }
        }
        
        // Description
        if (elements.diagnosisDescription) {
            elements.diagnosisDescription.innerHTML = diagnosis.description + 
                '<br><br>To get your personalized color blindness correction glasses: ' +
                '<a class="cta-button" href="https://www.colorlitelens.com/contact.html">CLICK HERE</a>';
        }
    }

    // ============================================
    // Storage
    // ============================================
    const STORAGE_KEY = 'colorlite_sessions';

    function saveSession(session) {
        try {
            const sessions = getSessions();
            sessions.push(session);
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
    // Export Functions
    // ============================================
    function exportJSON() {
        const sessions = getSessions();
        const lastSession = testSession || (sessions.length > 0 ? sessions[sessions.length - 1] : null);
        
        if (!lastSession) {
            alert('No test results to export. Please complete a test first.');
            return;
        }
        
        const exportData = {
            testDate: lastSession.startTime,
            duration: calculateDuration(lastSession.startTime, lastSession.endTime),
            scores: {
                redGreen: lastSession.results[0],
                purpleBlue: lastSession.results[1],
                purpleGreen: lastSession.results[2]
            },
            diagnosis: lastSession.diagnosis,
            metadata: {
                version: '1.0',
                testType: 'Colorlite Mosaic Test',
                exportedAt: new Date().toISOString()
            }
        };
        
        downloadFile(
            JSON.stringify(exportData, null, 2),
            `colorlite-results-${formatDate(new Date())}.json`,
            'application/json'
        );
    }

    function exportCSV() {
        const sessions = getSessions();
        const lastSession = testSession || (sessions.length > 0 ? sessions[sessions.length - 1] : null);
        
        if (!lastSession) {
            alert('No test results to export. Please complete a test first.');
            return;
        }
        
        const headers = ['Test Date', 'Duration (s)', 'Red-Green %', 'Purple-Blue %', 'Purple-Green %', 'Type', 'Severity'];
        const row = [
            lastSession.startTime,
            calculateDuration(lastSession.startTime, lastSession.endTime),
            lastSession.results[0],
            lastSession.results[1],
            lastSession.results[2],
            lastSession.diagnosis.type,
            lastSession.diagnosis.severity
        ];
        
        const csvContent = headers.join(',') + '\n' + row.join(',');
        
        downloadFile(
            csvContent,
            `colorlite-results-${formatDate(new Date())}.csv`,
            'text/csv'
        );
    }

    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ============================================
    // Utility Functions
    // ============================================
    function showElement(el) {
        if (el) el.style.display = '';
    }

    function hideElement(el) {
        if (el) el.style.display = 'none';
    }

    function calculateDuration(startTime, endTime) {
        if (!startTime || !endTime) return 0;
        const start = new Date(startTime);
        const end = new Date(endTime);
        return Math.round((end - start) / 1000);
    }

    function formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    // ============================================
    // Initialization
    // ============================================
    function init() {
        cacheElements();
        bindEvents();
        
        console.log('Colorlite Test Controller initialized');
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
        clearSessions,
        exportJSON,
        exportCSV
    };
})();
