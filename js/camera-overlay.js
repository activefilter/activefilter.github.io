/**
 * ColorVision Pro - Camera Overlay
 * Handles camera access and real-time filter application
 */

const CameraOverlay = {
    /**
     * State
     */
    state: {
        isActive: false,
        hasPermission: false,
        stream: null,
        filterEnabled: true,
        filterIntensity: 1,
        filterParams: null,
        animationFrame: null
    },

    /**
     * DOM elements
     */
    elements: {
        video: null,
        canvas: null,
        placeholder: null,
        error: null
    },

    /**
     * Configuration
     */
    config: {
        idealWidth: 1280,
        idealHeight: 720,
        facingMode: 'environment' // Use back camera on mobile
    },

    /**
     * Callbacks
     */
    callbacks: {
        onStart: null,
        onStop: null,
        onError: null,
        onSnapshot: null
    },

    /**
     * Initialize camera overlay
     */
    init(options = {}) {
        const {
            videoElement,
            canvasElement,
            placeholderElement,
            errorElement,
            filterParams = null,
            callbacks = {}
        } = options;

        this.elements = {
            video: videoElement,
            canvas: canvasElement,
            placeholder: placeholderElement,
            error: errorElement
        };

        this.state.filterParams = filterParams;
        this.callbacks = { ...this.callbacks, ...callbacks };

        return this;
    },

    /**
     * Check camera support
     */
    isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    },

    /**
     * Request camera access and start streaming
     */
    async start() {
        if (!this.isSupported()) {
            this.showError('Camera API is not supported in this browser');
            return false;
        }

        try {
            // Request camera permission
            const constraints = {
                video: {
                    width: { ideal: this.config.idealWidth },
                    height: { ideal: this.config.idealHeight },
                    facingMode: this.config.facingMode
                },
                audio: false
            };

            this.state.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.state.hasPermission = true;

            // Set up video element
            this.elements.video.srcObject = this.state.stream;
            this.elements.video.style.display = 'block';

            // Wait for video to be ready
            await new Promise((resolve) => {
                this.elements.video.onloadedmetadata = () => {
                    this.elements.video.play();
                    resolve();
                };
            });

            // Set up canvas
            const videoTrack = this.state.stream.getVideoTracks()[0];
            const settings = videoTrack.getSettings();
            
            this.elements.canvas.width = settings.width || this.config.idealWidth;
            this.elements.canvas.height = settings.height || this.config.idealHeight;

            // Hide placeholder, show canvas
            this.elements.placeholder.style.display = 'none';
            this.elements.error.style.display = 'none';
            this.elements.canvas.style.display = 'block';

            // Start rendering
            this.state.isActive = true;
            this.startRendering();

            if (this.callbacks.onStart) {
                this.callbacks.onStart();
            }

            return true;

        } catch (error) {
            console.error('Camera error:', error);
            this.handleError(error);
            return false;
        }
    },

    /**
     * Handle camera errors
     */
    handleError(error) {
        let message = 'Failed to access camera';

        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            message = 'Camera permission was denied. Please allow camera access and try again.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            message = 'No camera found. Please connect a camera and try again.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            message = 'Camera is in use by another application. Please close other apps using the camera.';
        } else if (error.name === 'OverconstrainedError') {
            message = 'Camera does not meet requirements. Trying again with lower resolution...';
            // Try with lower constraints
            this.config.idealWidth = 640;
            this.config.idealHeight = 480;
            return this.start();
        }

        this.showError(message);

        if (this.callbacks.onError) {
            this.callbacks.onError(message, error);
        }
    },

    /**
     * Show error message
     */
    showError(message) {
        if (this.elements.error) {
            const errorText = this.elements.error.querySelector('#camera-error-text');
            if (errorText) {
                errorText.textContent = message;
            }
            this.elements.placeholder.style.display = 'none';
            this.elements.error.style.display = 'flex';
        }
    },

    /**
     * Stop camera
     */
    stop() {
        this.state.isActive = false;

        // Stop animation
        if (this.state.animationFrame) {
            cancelAnimationFrame(this.state.animationFrame);
            this.state.animationFrame = null;
        }

        // Stop stream
        if (this.state.stream) {
            this.state.stream.getTracks().forEach(track => track.stop());
            this.state.stream = null;
        }

        // Reset video
        if (this.elements.video) {
            this.elements.video.srcObject = null;
            this.elements.video.style.display = 'none';
        }

        // Hide canvas, show placeholder
        if (this.elements.canvas) {
            this.elements.canvas.style.display = 'none';
        }
        if (this.elements.placeholder) {
            this.elements.placeholder.style.display = 'flex';
        }

        if (this.callbacks.onStop) {
            this.callbacks.onStop();
        }
    },

    /**
     * Start rendering loop
     */
    startRendering() {
        const render = () => {
            if (!this.state.isActive) return;

            this.renderFrame();
            this.state.animationFrame = requestAnimationFrame(render);
        };

        render();
    },

    /**
     * Render a single frame
     */
    renderFrame() {
        const { video, canvas } = this.elements;
        const ctx = canvas.getContext('2d');

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Apply filter if enabled
        if (this.state.filterEnabled && this.state.filterParams) {
            this.applyFilter(ctx, canvas.width, canvas.height);
        }
    },

    /**
     * Apply color filter to canvas
     */
    applyFilter(ctx, width, height) {
        // Get image data
        const imageData = ctx.getImageData(0, 0, width, height);
        
        // Create modified params with current intensity
        const params = {
            ...this.state.filterParams,
            intensity: this.state.filterParams.intensity * this.state.filterIntensity
        };

        // Apply filter
        ColorFilter.applyToImageData(imageData, params);

        // Put filtered data back
        ctx.putImageData(imageData, 0, 0);
    },

    /**
     * Set filter enabled state
     */
    setFilterEnabled(enabled) {
        this.state.filterEnabled = enabled;
    },

    /**
     * Set filter intensity (0-1)
     */
    setFilterIntensity(intensity) {
        this.state.filterIntensity = Utils.clamp(intensity, 0, 1);
    },

    /**
     * Update filter parameters
     */
    setFilterParams(params) {
        this.state.filterParams = params;
    },

    /**
     * Take a snapshot
     */
    takeSnapshot() {
        if (!this.state.isActive) {
            return null;
        }

        const { canvas } = this.elements;
        
        // Get data URL
        const dataUrl = canvas.toDataURL('image/png');

        // Create download
        const link = document.createElement('a');
        link.download = `colorvision-snapshot-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();

        if (this.callbacks.onSnapshot) {
            this.callbacks.onSnapshot(dataUrl);
        }

        return dataUrl;
    },

    /**
     * Switch camera (front/back)
     */
    async switchCamera() {
        // Toggle facing mode
        this.config.facingMode = 
            this.config.facingMode === 'environment' ? 'user' : 'environment';

        // Restart with new camera
        this.stop();
        await this.start();
    },

    /**
     * Check if camera is active
     */
    isActive() {
        return this.state.isActive;
    },

    /**
     * Check if filter is enabled
     */
    isFilterEnabled() {
        return this.state.filterEnabled;
    },

    /**
     * Get current filter intensity
     */
    getFilterIntensity() {
        return this.state.filterIntensity;
    }
};

// Export for use in other modules
window.CameraOverlay = CameraOverlay;
