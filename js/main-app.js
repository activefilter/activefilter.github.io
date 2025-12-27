/**
 * ColorVision Pro - Main Application
 * JLTTCK Active Filter - animated mosaic test for detecting red-green color vision deficiency (deuteranomaly)
 */

const App = {
    /**
     * Application state
     */
    state: {
        currentScreen: 'landing',
        session: null,
        baselineResults: null,
        tuningRound: 0,
        validationResults: null,
        filterParams: null,
        calibrationComplete: {
            brightness: false,
            lighting: false,
            distance: false
        },
        systemReady: false
    },

    /**
     * DOM element cache
     */
    elements: {},

    /**
     * Initialize the application
     */
    init() {
        console.log('ColorVision Pro initializing...');
        
        this.cacheElements();
        this.bindEvents();
        this.checkSystemCapabilities();
        this.showScreen('landing');
        
        console.log('ColorVision Pro ready');
    },

    /**
     * Cache DOM elements for performance
     */
    cacheElements() {
        // Screens
        this.elements.screens = {
            landing: document.getElementById('screen-landing'),
            calibration: document.getElementById('screen-calibration'),
            test: document.getElementById('screen-test'),
            results: document.getElementById('screen-results'),
            camera: document.getElementById('screen-camera'),
            export: document.getElementById('screen-export')
        };

        // Landing
        this.elements.consentCheckbox = document.getElementById('consent-checkbox');
        this.elements.btnStart = document.getElementById('btn-start');

        // Calibration
        this.elements.btnBackLanding = document.getElementById('btn-back-landing');
        this.elements.btnStartTest = document.getElementById('btn-start-test');
        this.elements.stepConfirms = document.querySelectorAll('.step-confirm');
        this.elements.systemChecks = {
            canvas: document.getElementById('check-canvas'),
            storage: document.getElementById('check-storage'),
            camera: document.getElementById('check-camera')
        };

        // Test
        this.elements.testCanvas = document.getElementById('test-canvas');
        this.elements.progressFill = document.getElementById('test-progress-fill');
        this.elements.progressText = document.getElementById('test-progress-text');
        this.elements.testTimer = document.getElementById('test-timer');
        this.elements.testInstruction = document.getElementById('test-instruction');
        this.elements.btnCantTell = document.getElementById('btn-cant-tell');

        // Results
        this.elements.overallScore = document.getElementById('overall-score');
        this.elements.deutanScoreBar = document.getElementById('deutan-score-bar');
        this.elements.deutanScoreText = document.getElementById('deutan-score-text');
        this.elements.controlScoreBar = document.getElementById('control-score-bar');
        this.elements.controlScoreText = document.getElementById('control-score-text');
        this.elements.severityMeter = document.getElementById('severity-meter-fill');
        this.elements.severityLabel = document.getElementById('severity-label');
        this.elements.severityDesc = document.getElementById('severity-description');
        this.elements.avgTimeText = document.getElementById('avg-time');
        this.elements.totalTimeText = document.getElementById('total-time');
        this.elements.btnSkipCamera = document.getElementById('btn-skip-camera');
        this.elements.btnTryCamera = document.getElementById('btn-try-camera');

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
        this.elements.btnSwitchCamera = document.getElementById('btn-switch-camera');
        this.elements.btnBackResults = document.getElementById('btn-back-results');
        this.elements.btnGoExport = document.getElementById('btn-go-export');
        this.elements.filterPreview = document.getElementById('filter-preview');

        // Export
        this.elements.btnExportJSON = document.getElementById('btn-export-json');
        this.elements.btnExportCSV = document.getElementById('btn-export-csv');
        this.elements.sessionsList = document.getElementById('sessions-list');
        this.elements.btnClearData = document.getElementById('btn-clear-data');
        this.elements.btnNewTest = document.getElementById('btn-new-test');

        // Modal
        this.elements.modal = document.getElementById('confirm-modal');
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
        if (this.elements.consentCheckbox) {
            this.elements.consentCheckbox.addEventListener('change', () => this.onConsentChange());
        }
        if (this.elements.btnStart) {
            this.elements.btnStart.addEventListener('click', () => this.startCalibration());
        }

        // Calibration
        if (this.elements.btnBackLanding) {
            this.elements.btnBackLanding.addEventListener('click', () => this.showScreen('landing'));
        }
        if (this.elements.btnStartTest) {
            this.elements.btnStartTest.addEventListener('click', () => this.startTest());
        }
        this.elements.stepConfirms?.forEach(btn => {
            btn.addEventListener('click', (e) => this.onCalibrationStep(e));
        });

        // Test
        if (this.elements.testCanvas) {
            this.elements.testCanvas.addEventListener('click', (e) => this.onCanvasClick(e));
            this.elements.testCanvas.addEventListener('touchend', (e) => this.onCanvasTouch(e));
        }
        if (this.elements.btnCantTell) {
            this.elements.btnCantTell.addEventListener('click', () => this.onCantTell());
        }

        // Results
        if (this.elements.btnSkipCamera) {
            this.elements.btnSkipCamera.addEventListener('click', () => this.showExportScreen());
        }
        if (this.elements.btnTryCamera) {
            this.elements.btnTryCamera.addEventListener('click', () => this.showCameraScreen());
        }

        // Camera
        if (this.elements.btnEnableCamera) {
            this.elements.btnEnableCamera.addEventListener('click', () => this.enableCamera());
        }
        if (this.elements.btnRetryCamera) {
            this.elements.btnRetryCamera.addEventListener('click', () => this.enableCamera());
        }
        if (this.elements.filterToggle) {
            this.elements.filterToggle.addEventListener('change', (e) => this.onFilterToggle(e));
        }
        if (this.elements.filterIntensity) {
            this.elements.filterIntensity.addEventListener('input', (e) => this.onIntensityChange(e));
        }
        if (this.elements.btnSnapshot) {
            this.elements.btnSnapshot.addEventListener('click', () => this.takeSnapshot());
        }
        if (this.elements.btnSwitchCamera) {
            this.elements.btnSwitchCamera.addEventListener('click', () => this.switchCamera());
        }
        if (this.elements.btnBackResults) {
            this.elements.btnBackResults.addEventListener('click', () => this.showScreen('results'));
        }
        if (this.elements.btnGoExport) {
            this.elements.btnGoExport.addEventListener('click', () => this.showExportScreen());
        }

        // Export
        if (this.elements.btnExportJSON) {
            this.elements.btnExportJSON.addEventListener('click', () => this.exportJSON());
        }
        if (this.elements.btnExportCSV) {
            this.elements.btnExportCSV.addEventListener('click', () => this.exportCSV());
        }
        if (this.elements.btnClearData) {
            this.elements.btnClearData.addEventListener('click', () => this.confirmClearData());
        }
        if (this.elements.btnNewTest) {
            this.elements.btnNewTest.addEventListener('click', () => this.startNewTest());
        }

        // Modal
        if (this.elements.modalCancel) {
            this.elements.modalCancel.addEventListener('click', () => this.hideModal());
        }
    },

    /**
     * Show a screen
     */
    showScreen(screenName) {
        // Hide all screens
        Object.values(this.elements.screens).forEach(screen => {
            if (screen) screen.classList.remove('active');
        });

        // Show target screen
        const screen = this.elements.screens[screenName];
        if (screen) {
            screen.classList.add('active');
            this.state.currentScreen = screenName;
        }

        // Stop camera when leaving camera screen
        if (screenName !== 'camera' && AdaptiveCameraFilter.isActive()) {
            AdaptiveCameraFilter.stop();
        }

        // Scroll to top
        window.scrollTo(0, 0);
    },

    /**
     * Check system capabilities
     */
    checkSystemCapabilities() {
        // Canvas check
        try {
            const testCanvas = document.createElement('canvas');
            const ctx = testCanvas.getContext('2d');
            this.state.systemReady = !!ctx;
        } catch (e) {
            this.state.systemReady = false;
        }
    },

    /**
     * Run system checks on calibration screen
     */
    runSystemChecks() {
        const checks = this.elements.systemChecks;

        // Canvas
        if (checks.canvas) {
            const canvasOk = this.state.systemReady;
            checks.canvas.classList.add(canvasOk ? 'success' : 'error');
            checks.canvas.querySelector('.check-status').textContent = canvasOk ? '✓' : '✗';
        }

        // Storage
        if (checks.storage) {
            const storageOk = Storage.isAvailable();
            checks.storage.classList.add(storageOk ? 'success' : 'error');
            checks.storage.querySelector('.check-status').textContent = storageOk ? '✓' : '✗';
        }

        // Camera
        if (checks.camera) {
            const cameraOk = AdaptiveCameraFilter.isSupported();
            checks.camera.classList.add(cameraOk ? 'success' : 'warning');
            checks.camera.querySelector('.check-status').textContent = cameraOk ? '✓' : '⚠';
        }
    },

    // ========== Landing Screen ==========

    onConsentChange() {
        const checked = this.elements.consentCheckbox?.checked;
        if (this.elements.btnStart) {
            this.elements.btnStart.disabled = !checked;
        }
    },

    startCalibration() {
        if (!this.elements.consentCheckbox?.checked) return;
        // Skip calibration screen, go directly to test
        this.startTest();
    },

    // ========== Calibration Screen ==========

    onCalibrationStep(e) {
        const step = e.target.dataset.step;
        const stepCard = document.getElementById(`step-${step}`);
        
        if (stepCard) {
            this.state.calibrationComplete[step] = true;
            stepCard.classList.add('confirmed');
            e.target.textContent = '✓ Confirmed';
            e.target.disabled = true;
        }

        this.checkCalibrationComplete();
    },

    checkCalibrationComplete() {
        const { brightness, lighting, distance } = this.state.calibrationComplete;
        const allDone = brightness && lighting && distance && this.state.systemReady;
        
        if (this.elements.btnStartTest) {
            this.elements.btnStartTest.disabled = !allDone;
        }
    },

    // ========== Test Screen ==========

    startTest() {
        // Create new session
        this.state.session = Storage.createSession();
        
        // Initialize the animated mosaic
        AnimatedMosaic.init(this.elements.testCanvas);
        
        // Set canvas size
        const container = this.elements.testCanvas.parentElement;
        const size = Math.min(container.clientWidth, 500);
        this.elements.testCanvas.width = size;
        this.elements.testCanvas.height = size;
        
        // Initialize test engine
        OutlierTestEngine.init({
            mosaic: AnimatedMosaic,
            mode: 'baseline',
            callbacks: {
                onPlateStart: (plate, index) => this.onPlateStart(plate, index),
                onPlateComplete: (response, result) => this.onPlateComplete(response, result),
                onTestComplete: (results) => this.onTestComplete(results),
                onProgress: (current, total) => this.updateProgress(current, total),
                onTimeout: (plate, index) => this.onPlateTimeout(plate, index)
            }
        });

        // Show test screen and start
        this.showScreen('test');
        this.testStartTime = Date.now();
        this.updateTimer();
        
        // Small delay to let screen transition complete
        setTimeout(() => {
            OutlierTestEngine.start();
        }, 300);
    },

    onPlateStart(plate, index) {
        // Update instruction text based on difficulty
        const instructions = {
            easy: 'Tap the square that looks different',
            medium: 'Find the odd one out',
            hard: 'Which square is different?'
        };
        
        if (this.elements.testInstruction) {
            this.elements.testInstruction.textContent = instructions[plate.difficulty] || instructions.medium;
        }
    },

    onPlateComplete(response, result) {
        // Could show brief feedback here
    },

    onPlateTimeout(plate, index) {
        // Show timeout message briefly
        if (this.elements.testInstruction) {
            this.elements.testInstruction.textContent = 'Time up! Moving to next...';
        }
    },

    updateProgress(current, total) {
        const progress = (current / total) * 100;
        
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${progress}%`;
        }
        if (this.elements.progressText) {
            this.elements.progressText.textContent = `${current + 1} of ${total}`;
        }
    },

    updateTimer() {
        if (this.state.currentScreen !== 'test') return;
        
        const elapsed = Math.floor((Date.now() - this.testStartTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        
        if (this.elements.testTimer) {
            this.elements.testTimer.textContent = 
                `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        
        setTimeout(() => this.updateTimer(), 1000);
    },

    onCanvasClick(e) {
        const result = OutlierTestEngine.handleResponse(e.clientX, e.clientY);
        // Result is handled by the callback
    },

    onCanvasTouch(e) {
        e.preventDefault();
        if (e.changedTouches.length > 0) {
            const touch = e.changedTouches[0];
            OutlierTestEngine.handleResponse(touch.clientX, touch.clientY);
        }
    },

    onCantTell() {
        OutlierTestEngine.handleCantTell();
    },

    onTestComplete(results) {
        this.state.baselineResults = results;
        
        // Save to storage
        Storage.saveBaselineResults(results);
        
        // Tune filter based on results
        this.state.filterParams = AdaptiveCameraFilter.tuneFromResults(results);
        
        // Show results
        this.showResultsScreen(results);
    },

    // ========== Results Screen ==========

    showResultsScreen(results) {
        this.showScreen('results');

        // Overall score
        if (this.elements.overallScore) {
            const scoreEl = this.elements.overallScore.querySelector('.score-value');
            if (scoreEl) scoreEl.textContent = results.overall.score;
        }

        // Deutan score
        if (this.elements.deutanScoreBar) {
            this.elements.deutanScoreBar.style.width = `${results.deutan.score}%`;
        }
        if (this.elements.deutanScoreText) {
            this.elements.deutanScoreText.textContent = `${results.deutan.correct}/${results.deutan.total}`;
        }

        // Control score
        if (this.elements.controlScoreBar) {
            this.elements.controlScoreBar.style.width = `${results.control.score}%`;
        }
        if (this.elements.controlScoreText) {
            this.elements.controlScoreText.textContent = `${results.control.correct}/${results.control.total}`;
        }

        // Severity
        if (this.elements.severityMeter) {
            this.elements.severityMeter.style.left = `${results.severity.value}%`;
        }
        if (this.elements.severityLabel) {
            this.elements.severityLabel.textContent = this.formatSeverity(results.severity.bucket);
            this.elements.severityLabel.className = `severity-label ${results.severity.bucket}`;
        }
        if (this.elements.severityDesc) {
            this.elements.severityDesc.textContent = results.severity.description;
        }

        // Timing
        if (this.elements.avgTimeText) {
            this.elements.avgTimeText.textContent = results.timing.avgResponseTimeSeconds;
        }
        if (this.elements.totalTimeText) {
            this.elements.totalTimeText.textContent = results.timing.totalTestTime;
        }
    },

    formatSeverity(bucket) {
        const labels = {
            none: 'No Deficiency',
            mild: 'Mild',
            moderate: 'Moderate',
            strong: 'Strong',
            inconclusive: 'Inconclusive'
        };
        return labels[bucket] || bucket;
    },

    // ========== Camera Screen ==========

    showCameraScreen() {
        this.showScreen('camera');
        
        // Show filter preview
        if (this.elements.filterPreview && this.state.filterParams) {
            this.updateFilterPreview();
        }
    },

    async enableCamera() {
        AdaptiveCameraFilter.init({
            videoElement: this.elements.cameraVideo,
            canvasElement: this.elements.cameraCanvas,
            placeholderElement: this.elements.cameraPlaceholder,
            errorElement: this.elements.cameraError,
            customParams: this.state.filterParams
        });

        await AdaptiveCameraFilter.start();
    },

    onFilterToggle(e) {
        AdaptiveCameraFilter.toggleFilter(e.target.checked);
    },

    onIntensityChange(e) {
        const value = parseInt(e.target.value) / 100;
        AdaptiveCameraFilter.setIntensity(value);
        
        if (this.elements.intensityValue) {
            this.elements.intensityValue.textContent = `${e.target.value}%`;
        }
    },

    takeSnapshot() {
        AdaptiveCameraFilter.takeSnapshot();
    },

    switchCamera() {
        AdaptiveCameraFilter.switchCamera();
    },

    updateFilterPreview() {
        if (!this.elements.filterPreview || !this.state.filterParams) return;
        
        const params = this.state.filterParams;
        this.elements.filterPreview.innerHTML = `
            <div class="filter-param">
                <span class="param-name">Hue Shift</span>
                <span class="param-value">${Math.round(params.hueShift)}°</span>
            </div>
            <div class="filter-param">
                <span class="param-name">R-G Enhance</span>
                <span class="param-value">${Math.round(params.redGreenEnhance * 100)}%</span>
            </div>
            <div class="filter-param">
                <span class="param-name">Saturation</span>
                <span class="param-value">+${Math.round(params.saturationBoost)}%</span>
            </div>
        `;
    },

    // ========== Export Screen ==========

    showExportScreen() {
        // Stop camera if active
        if (AdaptiveCameraFilter.isActive()) {
            AdaptiveCameraFilter.stop();
        }
        
        this.showScreen('export');
        this.loadSessionsList();
    },

    loadSessionsList() {
        const sessions = Storage.getSessions();
        const container = this.elements.sessionsList;
        
        if (!container) return;
        
        if (sessions.length === 0) {
            container.innerHTML = '<p class="no-sessions">No saved sessions yet.</p>';
            return;
        }
        
        container.innerHTML = sessions.map(session => `
            <div class="session-item" data-id="${session.id}">
                <div class="session-info">
                    <span class="session-date">${new Date(session.createdAt).toLocaleDateString()}</span>
                    <span class="session-score">${session.baseline?.overall?.score ?? '--'}%</span>
                    <span class="session-severity ${session.baseline?.severity?.bucket || ''}">${session.baseline?.severity?.bucket || 'N/A'}</span>
                </div>
                <button class="btn btn-small btn-secondary" data-action="export" data-id="${session.id}">Export</button>
            </div>
        `).join('');
        
        // Bind export buttons
        container.querySelectorAll('[data-action="export"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const session = Storage.getSession(id);
                if (session) Export.exportJSON(session);
            });
        });
    },

    exportJSON() {
        Export.exportJSON();
    },

    exportCSV() {
        Export.exportCSV();
    },

    confirmClearData() {
        this.showModal(
            'Clear All Data',
            'This will permanently delete all saved test sessions. This cannot be undone.',
            () => {
                Storage.clearAll();
                this.loadSessionsList();
                this.hideModal();
            }
        );
    },

    startNewTest() {
        // Reset state
        this.state.baselineResults = null;
        this.state.filterParams = null;
        this.state.calibrationComplete = {
            brightness: false,
            lighting: false,
            distance: false
        };
        
        // Reset calibration UI
        this.elements.stepConfirms?.forEach(btn => {
            btn.textContent = btn.dataset.originalText || '✓ Confirm';
            btn.disabled = false;
            const step = btn.dataset.step;
            const stepCard = document.getElementById(`step-${step}`);
            if (stepCard) stepCard.classList.remove('confirmed');
        });
        
        this.showScreen('landing');
    },

    // ========== Modal ==========

    showModal(title, message, onConfirm) {
        if (this.elements.modalTitle) this.elements.modalTitle.textContent = title;
        if (this.elements.modalMessage) this.elements.modalMessage.textContent = message;
        if (this.elements.modal) this.elements.modal.classList.add('active');
        
        this.modalConfirmHandler = onConfirm;
        if (this.elements.modalConfirm) {
            this.elements.modalConfirm.onclick = () => {
                if (this.modalConfirmHandler) this.modalConfirmHandler();
            };
        }
    },

    hideModal() {
        if (this.elements.modal) this.elements.modal.classList.remove('active');
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());

// Export
window.App = App;
