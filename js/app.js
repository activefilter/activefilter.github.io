/**
 * ColorVision Pro - Main Application Controller
 * Orchestrates all modules and manages UI flow
 */

const App = {
    /**
     * Application state
     */
    state: {
        currentScreen: 'landing',
        session: null,
        baselineResults: null,
        tuningResults: null,
        validationResults: null,
        calibrationSteps: {
            brightness: false,
            lighting: false,
            distance: false
        },
        systemChecks: {
            canvas: false,
            storage: false,
            camera: null // null = not checked, true = available, false = unavailable
        }
    },

    /**
     * DOM element cache
     */
    elements: {},

    /**
     * Initialize application
     */
    init() {
        console.log('ColorVision Pro initializing...');
        
        this.cacheElements();
        this.bindEvents();
        this.showScreen('landing');
        
        // Check for existing session
        const existingSession = Storage.getCurrentSession();
        if (existingSession && !existingSession.completed) {
            // Could offer to resume, for now we start fresh
        }

        console.log('ColorVision Pro ready');
    },

    /**
     * Cache DOM elements
     */
    cacheElements() {
        // Screens
        this.elements.screens = {
            landing: document.getElementById('screen-landing'),
            calibration: document.getElementById('screen-calibration'),
            test: document.getElementById('screen-test'),
            results: document.getElementById('screen-results'),
            tuning: document.getElementById('screen-tuning'),
            validation: document.getElementById('screen-validation'),
            camera: document.getElementById('screen-camera'),
            export: document.getElementById('screen-export')
        };

        // Landing
        this.elements.consentCheckbox = document.getElementById('consent-checkbox');
        this.elements.btnStart = document.getElementById('btn-start');

        // Calibration
        this.elements.btnBackLanding = document.getElementById('btn-back-landing');
        this.elements.btnStartTest = document.getElementById('btn-start-test');
        this.elements.stepCards = document.querySelectorAll('.step-confirm');

        // Test
        this.elements.mosaicCanvas = document.getElementById('mosaic-canvas');
        this.elements.testProgressFill = document.getElementById('test-progress-fill');
        this.elements.testProgressText = document.getElementById('test-progress-text');
        this.elements.testTimer = document.getElementById('test-timer');
        this.elements.responseArea = document.getElementById('response-area');
        this.elements.btnSkipPlate = document.getElementById('btn-skip-plate');

        // Results
        this.elements.overallScore = document.getElementById('overall-score');
        this.elements.rgScoreBar = document.getElementById('rg-score-bar');
        this.elements.rgScoreText = document.getElementById('rg-score-text');
        this.elements.controlScoreBar = document.getElementById('control-score-bar');
        this.elements.controlScoreText = document.getElementById('control-score-text');
        this.elements.severityMeterFill = document.getElementById('severity-meter-fill');
        this.elements.severityLabel = document.getElementById('severity-label');
        this.elements.avgTime = document.getElementById('avg-time');
        this.elements.totalTime = document.getElementById('total-time');
        this.elements.btnSkipTuning = document.getElementById('btn-skip-tuning');
        this.elements.btnStartTuning = document.getElementById('btn-start-tuning');

        // Tuning
        this.elements.tuningCanvas = document.getElementById('tuning-canvas');
        this.elements.currentRound = document.getElementById('current-round');
        this.elements.totalRounds = document.getElementById('total-rounds');
        this.elements.tuningProgressFill = document.getElementById('tuning-progress-fill');
        this.elements.paramShift = document.getElementById('param-shift');
        this.elements.paramIntensity = document.getElementById('param-intensity');
        this.elements.paramSaturation = document.getElementById('param-saturation');
        this.elements.tuningResponseArea = document.getElementById('tuning-response-area');
        this.elements.tuningMessage = document.getElementById('tuning-message');

        // Validation
        this.elements.baselineCompareScore = document.getElementById('baseline-compare-score');
        this.elements.posttuneCompareScore = document.getElementById('posttune-compare-score');
        this.elements.improvementValue = document.getElementById('improvement-value');
        this.elements.severityBefore = document.getElementById('severity-before');
        this.elements.severityAfter = document.getElementById('severity-after');
        this.elements.finalFilterParams = document.getElementById('final-filter-params');
        this.elements.btnRetune = document.getElementById('btn-retune');
        this.elements.btnCameraMode = document.getElementById('btn-camera-mode');

        // Camera
        this.elements.cameraVideo = document.getElementById('camera-video');
        this.elements.cameraCanvas = document.getElementById('camera-canvas');
        this.elements.cameraPlaceholder = document.getElementById('camera-placeholder');
        this.elements.cameraError = document.getElementById('camera-error');
        this.elements.btnEnableCamera = document.getElementById('btn-enable-camera');
        this.elements.btnRetryCamera = document.getElementById('btn-retry-camera');
        this.elements.filterToggle = document.getElementById('filter-toggle');
        this.elements.filterIntensity = document.getElementById('filter-intensity');
        this.elements.intensityValue = document.getElementById('intensity-value');
        this.elements.btnSnapshot = document.getElementById('btn-snapshot');
        this.elements.btnBackValidation = document.getElementById('btn-back-validation');
        this.elements.btnGoExport = document.getElementById('btn-go-export');

        // Export
        this.elements.btnExportJSON = document.getElementById('btn-export-json');
        this.elements.btnExportCSV = document.getElementById('btn-export-csv');
        this.elements.sessionsList = document.getElementById('sessions-list');
        this.elements.btnClearData = document.getElementById('btn-clear-data');
        this.elements.btnBackCamera = document.getElementById('btn-back-camera');
        this.elements.btnNewSession = document.getElementById('btn-new-session');

        // Modal
        this.elements.confirmModal = document.getElementById('confirm-modal');
        this.elements.modalTitle = document.getElementById('modal-title');
        this.elements.modalMessage = document.getElementById('modal-message');
        this.elements.modalCancel = document.getElementById('modal-cancel');
        this.elements.modalConfirm = document.getElementById('modal-confirm');
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Landing
        this.elements.consentCheckbox.addEventListener('change', () => this.onConsentChange());
        this.elements.btnStart.addEventListener('click', () => this.onStartClick());

        // Calibration
        this.elements.btnBackLanding.addEventListener('click', () => this.showScreen('landing'));
        this.elements.btnStartTest.addEventListener('click', () => this.startBaselineTest());
        this.elements.stepCards.forEach(btn => {
            btn.addEventListener('click', (e) => this.onCalibrationStep(e));
        });

        // Test
        this.elements.btnSkipPlate.addEventListener('click', () => this.skipCurrentPlate());

        // Results
        this.elements.btnSkipTuning.addEventListener('click', () => this.skipToExport());
        this.elements.btnStartTuning.addEventListener('click', () => this.startTuning());

        // Validation
        this.elements.btnRetune.addEventListener('click', () => this.startTuning());
        this.elements.btnCameraMode.addEventListener('click', () => this.showCameraMode());

        // Camera
        this.elements.btnEnableCamera.addEventListener('click', () => this.enableCamera());
        this.elements.btnRetryCamera.addEventListener('click', () => this.enableCamera());
        this.elements.filterToggle.addEventListener('change', (e) => this.onFilterToggle(e));
        this.elements.filterIntensity.addEventListener('input', (e) => this.onIntensityChange(e));
        this.elements.btnSnapshot.addEventListener('click', () => this.takeSnapshot());
        this.elements.btnBackValidation.addEventListener('click', () => this.showScreen('validation'));
        this.elements.btnGoExport.addEventListener('click', () => this.showExportScreen());

        // Export
        this.elements.btnExportJSON.addEventListener('click', () => this.exportJSON());
        this.elements.btnExportCSV.addEventListener('click', () => this.exportCSV());
        this.elements.btnClearData.addEventListener('click', () => this.confirmClearData());
        this.elements.btnBackCamera.addEventListener('click', () => this.showScreen('camera'));
        this.elements.btnNewSession.addEventListener('click', () => this.startNewSession());

        // Modal
        this.elements.modalCancel.addEventListener('click', () => this.hideModal());
    },

    /**
     * Show a screen
     */
    showScreen(screenName) {
        // Hide all screens
        Object.values(this.elements.screens).forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        const screen = this.elements.screens[screenName];
        if (screen) {
            screen.classList.add('active');
            this.state.currentScreen = screenName;

            // Screen-specific initialization
            if (screenName === 'calibration') {
                this.runSystemChecks();
            } else if (screenName === 'export') {
                this.loadSessionsList();
            }
        }

        // Stop camera when leaving camera screen
        if (screenName !== 'camera' && CameraOverlay.isActive()) {
            CameraOverlay.stop();
        }

        // Scroll to top
        window.scrollTo(0, 0);
    },

    // ========== Landing Screen ==========

    onConsentChange() {
        this.elements.btnStart.disabled = !this.elements.consentCheckbox.checked;
    },

    onStartClick() {
        if (!this.elements.consentCheckbox.checked) return;
        this.showScreen('calibration');
    },

    // ========== Calibration Screen ==========

    onCalibrationStep(e) {
        const step = e.target.dataset.step;
        const stepCard = document.getElementById(`step-${step}`);
        
        this.state.calibrationSteps[step] = true;
        stepCard.classList.add('confirmed');
        e.target.textContent = '✓ Confirmed';
        e.target.disabled = true;

        this.checkCalibrationComplete();
    },

    checkCalibrationComplete() {
        const { brightness, lighting, distance } = this.state.calibrationSteps;
        const { canvas, storage } = this.state.systemChecks;
        
        const allStepsComplete = brightness && lighting && distance;
        const systemReady = canvas && storage;

        this.elements.btnStartTest.disabled = !(allStepsComplete && systemReady);
    },

    runSystemChecks() {
        // Canvas check
        const canvasCheck = document.getElementById('check-canvas');
        try {
            const testCanvas = document.createElement('canvas');
            const ctx = testCanvas.getContext('2d');
            if (ctx) {
                this.state.systemChecks.canvas = true;
                canvasCheck.classList.add('success');
                canvasCheck.querySelector('.check-status').textContent = '✓';
            } else {
                throw new Error('No context');
            }
        } catch (e) {
            this.state.systemChecks.canvas = false;
            canvasCheck.classList.add('error');
            canvasCheck.querySelector('.check-status').textContent = '✗';
        }

        // Storage check
        const storageCheck = document.getElementById('check-storage');
        if (Storage.isAvailable()) {
            this.state.systemChecks.storage = true;
            storageCheck.classList.add('success');
            storageCheck.querySelector('.check-status').textContent = '✓';
        } else {
            this.state.systemChecks.storage = false;
            storageCheck.classList.add('error');
            storageCheck.querySelector('.check-status').textContent = '✗';
        }

        // Camera check (optional)
        const cameraCheck = document.getElementById('check-camera');
        if (CameraOverlay.isSupported()) {
            this.state.systemChecks.camera = true;
            cameraCheck.classList.add('success');
            cameraCheck.querySelector('.check-status').textContent = '✓';
        } else {
            this.state.systemChecks.camera = false;
            cameraCheck.classList.add('warning');
            cameraCheck.querySelector('.check-status').textContent = '⚠';
        }

        this.checkCalibrationComplete();
    },

    // ========== Baseline Test ==========

    startBaselineTest() {
        // Create new session
        this.state.session = Storage.createSession();

        // Initialize test engine
        TestEngine.init({
            mode: 'baseline',
            callbacks: {
                onPlateReady: (plate, index, total) => this.onPlateReady(plate, index, total),
                onPlateComplete: (response) => this.onPlateComplete(response),
                onTestComplete: (results) => this.onBaselineComplete(results),
                onTimeUpdate: (elapsed) => this.updateTimer(elapsed)
            }
        });

        this.showScreen('test');
        TestEngine.start();
    },

    onPlateReady(plate, index, total) {
        // Update progress
        const progress = ((index) / total) * 100;
        this.elements.testProgressFill.style.width = `${progress}%`;
        this.elements.testProgressText.textContent = `Plate ${index + 1} of ${total}`;

        // Render plate
        MosaicGenerator.renderToCanvas(this.elements.mosaicCanvas, plate);

        // Set up response UI
        this.setupResponseUI(plate, this.elements.responseArea, (response) => {
            TestEngine.recordResponse(response);
        });
    },

    setupResponseUI(plate, container, onResponse) {
        const { target } = plate;
        const rng = Utils.createRNG(plate.seed + 100);
        const { options, correctAnswer } = MosaicGenerator.getAnswerOptions(plate, rng);

        let html = '<p class="response-question">';
        
        if (target.type === 'number') {
            html += 'What number do you see?';
        } else if (target.type === 'letter') {
            html += 'What letter do you see?';
        } else {
            html += 'What shape do you see?';
        }
        
        html += '</p><div class="response-options">';

        options.forEach(option => {
            const label = option === 'none' ? "Can't see" : option;
            const displayLabel = target.type === 'shape' && option !== 'none'
                ? this.getShapeEmoji(option)
                : label;
            html += `<button class="response-option" data-value="${option}">${displayLabel}</button>`;
        });

        html += '</div>';
        container.innerHTML = html;

        // Bind click handlers
        container.querySelectorAll('.response-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const value = e.target.dataset.value;
                onResponse(value);
            });
        });
    },

    getShapeEmoji(shape) {
        const emojis = {
            circle: '⭕',
            square: '⬜',
            triangle: '🔺',
            diamond: '🔷'
        };
        return emojis[shape] || shape;
    },

    onPlateComplete(response) {
        // Could show feedback here
    },

    skipCurrentPlate() {
        TestEngine.skipPlate();
    },

    updateTimer(elapsed) {
        this.elements.testTimer.textContent = Utils.formatTime(elapsed);
    },

    onBaselineComplete(results) {
        this.state.baselineResults = results;
        Storage.saveBaselineResults(results);
        this.showResultsScreen(results);
    },

    // ========== Results Screen ==========

    showResultsScreen(results) {
        this.showScreen('results');

        // Overall score
        const scoreValue = this.elements.overallScore.querySelector('.score-value');
        scoreValue.textContent = results.overall.score;

        // Red-green score
        this.elements.rgScoreBar.style.width = `${results.deutan.score}%`;
        this.elements.rgScoreText.textContent = `${results.deutan.correct}/${results.deutan.total}`;

        // Control score
        this.elements.controlScoreBar.style.width = `${results.control.score}%`;
        this.elements.controlScoreText.textContent = `${results.control.correct}/${results.control.total}`;

        // Severity meter
        const severityPercent = results.severity.value;
        this.elements.severityMeterFill.style.left = `${severityPercent}%`;
        this.elements.severityLabel.textContent = results.severity.bucket;
        this.elements.severityLabel.className = `severity-label ${results.severity.bucket}`;

        // Timing stats
        this.elements.avgTime.textContent = (results.timing.avgResponseTime / 1000).toFixed(1);
        this.elements.totalTime.textContent = results.timing.totalTime.toFixed(1);
    },

    // ========== Tuning ==========

    startTuning() {
        const baseline = this.state.baselineResults;
        if (!baseline) return;

        TuningEngine.init({
            baselineSeverity: baseline.severity.bucket,
            baselineScore: baseline.deutan.score,
            callbacks: {
                onRoundStart: (round, total, params) => this.onTuningRoundStart(round, total, params),
                onPlateReady: (plate, index, total) => this.onTuningPlateReady(plate, index, total),
                onPlateComplete: (response) => this.onTuningPlateComplete(response),
                onRoundComplete: (result, bestScore) => this.onTuningRoundComplete(result, bestScore),
                onTuningComplete: (result) => this.onTuningComplete(result),
                onParamsUpdate: (params) => this.updateFilterDisplay(params)
            }
        });

        this.showScreen('tuning');
        TuningEngine.start();
    },

    onTuningRoundStart(round, total, params) {
        this.elements.currentRound.textContent = round;
        this.elements.totalRounds.textContent = total;
        
        const progress = ((round - 1) / total) * 100;
        this.elements.tuningProgressFill.style.width = `${progress}%`;
        
        this.elements.tuningMessage.textContent = `Testing filter configuration ${round}...`;
    },

    onTuningPlateReady(plate, index, total) {
        // Render plate with filter applied
        MosaicGenerator.renderToCanvas(this.elements.tuningCanvas, plate);

        // Set up response UI
        this.setupResponseUI(plate, this.elements.tuningResponseArea, (response) => {
            TuningEngine.recordResponse(response);
        });
    },

    onTuningPlateComplete(response) {
        // Optional: show feedback
    },

    onTuningRoundComplete(result, bestScore) {
        this.elements.tuningMessage.textContent = 
            `Round ${result.round} complete. Score: ${result.score}% | Best: ${bestScore}%`;
    },

    updateFilterDisplay(params) {
        this.elements.paramShift.textContent = `${params.hueShift.toFixed(0)}°`;
        this.elements.paramIntensity.textContent = `${(params.intensity * 100).toFixed(0)}%`;
        this.elements.paramSaturation.textContent = 
            `${params.saturationBoost > 0 ? '+' : ''}${params.saturationBoost.toFixed(0)}%`;
    },

    onTuningComplete(result) {
        this.state.tuningResults = result;
        Storage.saveTuningResults(result);
        
        // Run validation test
        this.startValidation(result.bestParams);
    },

    // ========== Validation ==========

    startValidation(filterParams) {
        TestEngine.init({
            mode: 'validation',
            filterParams,
            callbacks: {
                onPlateReady: (plate, index, total) => this.onPlateReady(plate, index, total),
                onPlateComplete: (response) => this.onPlateComplete(response),
                onTestComplete: (results) => this.onValidationComplete(results),
                onTimeUpdate: (elapsed) => this.updateTimer(elapsed)
            }
        });

        this.showScreen('test');
        this.elements.testProgressText.textContent = 'Validation Test';
        TestEngine.start();
    },

    onValidationComplete(results) {
        this.state.validationResults = results;
        Storage.saveValidationResults(results);
        this.showValidationScreen();
    },

    showValidationScreen() {
        this.showScreen('validation');

        const baseline = this.state.baselineResults;
        const validation = this.state.validationResults;
        const tuning = this.state.tuningResults;

        if (!baseline || !validation) return;

        // Comparison scores
        this.elements.baselineCompareScore.textContent = `${baseline.deutan.score}%`;
        this.elements.posttuneCompareScore.textContent = `${validation.deutan.score}%`;

        // Improvement
        const improvement = validation.deutan.score - baseline.deutan.score;
        this.elements.improvementValue.textContent = 
            `${improvement >= 0 ? '+' : ''}${improvement}%`;
        
        // Update improvement display color based on result
        const improvementDisplay = document.getElementById('improvement-display');
        if (improvement <= 0) {
            improvementDisplay.style.background = 'linear-gradient(135deg, #6c757d, #5a6268)';
        }

        // Severity comparison
        this.elements.severityBefore.textContent = baseline.severity.bucket;
        this.elements.severityAfter.textContent = validation.severity.bucket;

        // Filter params display
        if (tuning && tuning.bestParams) {
            const display = ColorFilter.formatForDisplay(tuning.bestParams);
            let html = '';
            Object.entries(display).forEach(([key, value]) => {
                html += `<div class="param"><span class="param-name">${key}</span>`;
                html += `<span class="param-value">${value}</span></div>`;
            });
            this.elements.finalFilterParams.innerHTML = html;
        }
    },

    // ========== Camera Mode ==========

    showCameraMode() {
        this.showScreen('camera');
        
        // Initialize camera overlay with filter params
        const filterParams = this.state.tuningResults?.bestParams || ColorFilter.defaults;
        
        CameraOverlay.init({
            videoElement: this.elements.cameraVideo,
            canvasElement: this.elements.cameraCanvas,
            placeholderElement: this.elements.cameraPlaceholder,
            errorElement: this.elements.cameraError,
            filterParams
        });
    },

    async enableCamera() {
        const success = await CameraOverlay.start();
        if (success) {
            this.elements.cameraPlaceholder.style.display = 'none';
        }
    },

    onFilterToggle(e) {
        CameraOverlay.setFilterEnabled(e.target.checked);
    },

    onIntensityChange(e) {
        const intensity = parseInt(e.target.value) / 100;
        CameraOverlay.setFilterIntensity(intensity);
        this.elements.intensityValue.textContent = `${e.target.value}%`;
    },

    takeSnapshot() {
        CameraOverlay.takeSnapshot();
    },

    // ========== Export Screen ==========

    showExportScreen() {
        // Stop camera if active
        if (CameraOverlay.isActive()) {
            CameraOverlay.stop();
        }
        this.showScreen('export');
    },

    skipToExport() {
        this.showScreen('export');
    },

    loadSessionsList() {
        const sessions = Storage.getSessions();
        const container = this.elements.sessionsList;

        if (sessions.length === 0) {
            container.innerHTML = '<div class="empty-sessions">No stored sessions</div>';
            return;
        }

        let html = '';
        sessions.forEach(session => {
            const date = new Date(session.createdAt).toLocaleDateString();
            const score = session.baseline?.overall?.score ?? '--';
            const severity = session.baseline?.severity?.bucket ?? '--';

            html += `
                <div class="session-item" data-id="${session.id}">
                    <div class="session-info">
                        <div class="session-date">${date}</div>
                        <div class="session-summary">Score: ${score}% | Severity: ${severity}</div>
                    </div>
                    <div class="session-actions">
                        <button class="btn btn-secondary btn-export-session" data-id="${session.id}">Export</button>
                        <button class="btn btn-danger btn-delete-session" data-id="${session.id}">Delete</button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;

        // Bind session action buttons
        container.querySelectorAll('.btn-export-session').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const session = Storage.getSession(id);
                if (session) {
                    Export.exportJSON(session);
                }
            });
        });

        container.querySelectorAll('.btn-delete-session').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                this.showModal(
                    'Delete Session',
                    'Are you sure you want to delete this session?',
                    () => {
                        Storage.deleteSession(id);
                        this.loadSessionsList();
                    }
                );
            });
        });
    },

    exportJSON() {
        const session = Storage.getCurrentSession();
        if (session) {
            Export.exportJSON(session);
        } else {
            alert('No session data to export');
        }
    },

    exportCSV() {
        const session = Storage.getCurrentSession();
        if (session) {
            Export.exportCSV(session);
        } else {
            alert('No session data to export');
        }
    },

    confirmClearData() {
        this.showModal(
            'Clear All Data',
            'This will permanently delete all stored sessions and settings. This action cannot be undone.',
            () => {
                Storage.clearAll();
                this.loadSessionsList();
                alert('All data has been cleared');
            }
        );
    },

    startNewSession() {
        // Reset state
        this.state = {
            currentScreen: 'landing',
            session: null,
            baselineResults: null,
            tuningResults: null,
            validationResults: null,
            calibrationSteps: {
                brightness: false,
                lighting: false,
                distance: false
            },
            systemChecks: {
                canvas: false,
                storage: false,
                camera: null
            }
        };

        // Reset calibration UI
        document.querySelectorAll('.step-card').forEach(card => {
            card.classList.remove('confirmed');
        });
        document.querySelectorAll('.step-confirm').forEach(btn => {
            btn.disabled = false;
            btn.textContent = btn.textContent.replace('Confirmed', 'is set');
        });

        // Reset consent
        this.elements.consentCheckbox.checked = false;
        this.elements.btnStart.disabled = true;

        this.showScreen('landing');
    },

    // ========== Modal ==========

    showModal(title, message, onConfirm) {
        this.elements.modalTitle.textContent = title;
        this.elements.modalMessage.textContent = message;
        this.elements.confirmModal.classList.add('active');

        // Remove old listener and add new one
        const newConfirmBtn = this.elements.modalConfirm.cloneNode(true);
        this.elements.modalConfirm.parentNode.replaceChild(newConfirmBtn, this.elements.modalConfirm);
        this.elements.modalConfirm = newConfirmBtn;

        this.elements.modalConfirm.addEventListener('click', () => {
            this.hideModal();
            if (onConfirm) onConfirm();
        });
    },

    hideModal() {
        this.elements.confirmModal.classList.remove('active');
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Export for debugging
window.App = App;
