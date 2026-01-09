/**
 * ColorVision Pro - Adaptive Camera Filter
 * Applies color correction filters to live camera feed based on test results
 * Similar to iOS color filter accessibility but tuned based on the test
 */

const AdaptiveCameraFilter = {
    /**
     * State
     */
    state: {
        isActive: false,
        hasPermission: false,
        stream: null,
        filterEnabled: true,
        filterIntensity: 1.0,
        animationFrame: null
    },

    /**
     * Filter parameters (adjusted based on test results)
     */
    filterParams: {
        // Hue rotation (in degrees)
        hueShift: 0,
        // Red-green enhancement factor
        redGreenEnhance: 0,
        // Saturation adjustment
        saturationBoost: 0,
        // Contrast adjustment
        contrastBoost: 0,
        // Color channel gains
        redGain: 1.0,
        greenGain: 1.0,
        blueGain: 1.0
    },

    /**
     * Default filter presets based on severity
     * Calibrated to normalize color perception:
     * - Input (without filter): Blue=100, Green=59.3, Red=79
     * - Target output: Blue=100, Green=100, Red=100
     * 
     * Base gains calculated as:
     * - redGain = 100/79 ≈ 1.27
     * - greenGain = 100/59.3 ≈ 1.69
     * - blueGain = 1.0
     */
    presets: {
        none: {
            hueShift: 0,
            redGreenEnhance: 0,
            saturationBoost: 0,
            contrastBoost: 0,
            redGain: 1.0,
            greenGain: 1.0,
            blueGain: 1.0
        },
        mild: {
            hueShift: 0,
            redGreenEnhance: 0,
            saturationBoost: 5,
            contrastBoost: 3,
            redGain: 1.07,
            greenGain: 1.17,
            blueGain: 1.0
        },
        moderate: {
            hueShift: 0,
            redGreenEnhance: 0,
            saturationBoost: 8,
            contrastBoost: 5,
            redGain: 1.17,
            greenGain: 1.43,
            blueGain: 1.0
        },
        strong: {
            hueShift: 0,
            redGreenEnhance: 0,
            saturationBoost: 10,
            contrastBoost: 8,
            redGain: 1.27,
            greenGain: 1.69,
            blueGain: 1.0
        },
        inconclusive: {
            hueShift: 0,
            redGreenEnhance: 0,
            saturationBoost: 6,
            contrastBoost: 4,
            redGain: 1.12,
            greenGain: 1.30,
            blueGain: 1.0
        }
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
        facingMode: 'environment'
    },

    /**
     * Initialize the camera filter
     */
    init(options = {}) {
        const {
            videoElement,
            canvasElement,
            placeholderElement,
            errorElement,
            severity = 'none',
            customParams = null
        } = options;

        this.elements = {
            video: videoElement,
            canvas: canvasElement,
            placeholder: placeholderElement,
            error: errorElement
        };

        // Set filter params from severity or custom
        if (customParams) {
            this.filterParams = { ...this.filterParams, ...customParams };
        } else {
            this.applyPreset(severity);
        }

        return this;
    },

    /**
     * Apply a preset based on severity
     */
    applyPreset(severity) {
        const preset = this.presets[severity] || this.presets.none;
        this.filterParams = { ...preset };
    },

    /**
     * Tune filter based on test results
     * Uses calibrated gain values to normalize color perception
     */
    tuneFromResults(results) {
        const { severity } = results;
        
        // Start from the preset for this severity
        this.applyPreset(severity.bucket);
        
        // Fine-tune saturation based on the performance gap for better distinction
        if (severity.performanceGap !== undefined) {
            const gapFactor = Math.min(severity.performanceGap / 50, 1);
            
            // Slightly increase saturation for larger gaps to aid color distinction
            this.filterParams.saturationBoost *= (1 + gapFactor * 0.15);
        }

        return this.filterParams;
    },

    /**
     * Check if camera is supported
     */
    isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    },

    /**
     * Start the camera
     */
    async start() {
        if (!this.isSupported()) {
            this.showError('Camera API is not supported in this browser');
            return false;
        }

        try {
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

            // Show canvas, hide placeholder
            if (this.elements.placeholder) {
                this.elements.placeholder.style.display = 'none';
            }
            if (this.elements.error) {
                this.elements.error.style.display = 'none';
            }
            this.elements.canvas.style.display = 'block';

            // Start rendering
            this.state.isActive = true;
            this.startRendering();

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

        if (error.name === 'NotAllowedError') {
            message = 'Camera permission was denied. Please allow camera access in your browser settings.';
        } else if (error.name === 'NotFoundError') {
            message = 'No camera found on this device.';
        } else if (error.name === 'NotReadableError') {
            message = 'Camera is in use by another application.';
        } else if (error.name === 'OverconstrainedError') {
            // Try with lower constraints
            this.config.idealWidth = 640;
            this.config.idealHeight = 480;
            return this.start();
        }

        this.showError(message);
    },

    /**
     * Show error message
     */
    showError(message) {
        if (this.elements.error) {
            const errorText = this.elements.error.querySelector('.error-text');
            if (errorText) {
                errorText.textContent = message;
            }
            if (this.elements.placeholder) {
                this.elements.placeholder.style.display = 'none';
            }
            this.elements.error.style.display = 'flex';
        }
    },

    /**
     * Stop the camera
     */
    stop() {
        this.state.isActive = false;

        if (this.state.animationFrame) {
            cancelAnimationFrame(this.state.animationFrame);
            this.state.animationFrame = null;
        }

        if (this.state.stream) {
            this.state.stream.getTracks().forEach(track => track.stop());
            this.state.stream = null;
        }

        if (this.elements.video) {
            this.elements.video.srcObject = null;
        }
    },

    /**
     * Start the rendering loop
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
     * Render a single frame with filter applied
     */
    renderFrame() {
        const video = this.elements.video;
        const canvas = this.elements.canvas;
        const ctx = canvas.getContext('2d');

        if (!video.videoWidth) return;

        // Draw video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Apply filter if enabled
        if (this.state.filterEnabled && this.state.filterIntensity > 0) {
            this.applyFilter(ctx, canvas.width, canvas.height);
        }
    },

    /**
     * Apply the color correction filter
     */
    applyFilter(ctx, width, height) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const intensity = this.state.filterIntensity;

        const {
            hueShift,
            redGreenEnhance,
            saturationBoost,
            contrastBoost,
            redGain,
            greenGain,
            blueGain
        } = this.filterParams;

        // Pre-calculate values
        const hueRad = (hueShift * intensity * Math.PI) / 180;
        const cosH = Math.cos(hueRad);
        const sinH = Math.sin(hueRad);
        const satMult = 1 + (saturationBoost * intensity) / 100;
        const contMult = 1 + (contrastBoost * intensity) / 100;
        const rgEnhance = redGreenEnhance * intensity;

        // Process each pixel
        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // Apply channel gains
            r *= redGain;
            g *= greenGain;
            b *= blueGain;

            // Red-green enhancement (shift red toward magenta, green toward cyan)
            if (rgEnhance > 0) {
                const rg = r - g;
                if (rg > 0) {
                    // More red than green - enhance red, add some blue
                    r += rg * rgEnhance * 0.5;
                    b += rg * rgEnhance * 0.2;
                } else {
                    // More green than red - enhance green, add some blue
                    g -= rg * rgEnhance * 0.4;
                    b -= rg * rgEnhance * 0.15;
                }
            }

            // Hue rotation (simplified for performance)
            if (hueShift !== 0) {
                const avg = (r + g + b) / 3;
                const rPrime = r - avg;
                const gPrime = g - avg;
                
                // Rotate in RG plane
                const newR = avg + rPrime * cosH - gPrime * sinH;
                const newG = avg + rPrime * sinH + gPrime * cosH;
                
                r = newR;
                g = newG;
            }

            // Saturation boost
            if (saturationBoost !== 0) {
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                r = gray + (r - gray) * satMult;
                g = gray + (g - gray) * satMult;
                b = gray + (b - gray) * satMult;
            }

            // Contrast
            if (contrastBoost !== 0) {
                r = ((r / 255 - 0.5) * contMult + 0.5) * 255;
                g = ((g / 255 - 0.5) * contMult + 0.5) * 255;
                b = ((b / 255 - 0.5) * contMult + 0.5) * 255;
            }

            // Clamp and write back
            data[i] = Math.max(0, Math.min(255, r));
            data[i + 1] = Math.max(0, Math.min(255, g));
            data[i + 2] = Math.max(0, Math.min(255, b));
        }

        ctx.putImageData(imageData, 0, 0);
    },

    /**
     * Set filter intensity (0-1)
     */
    setIntensity(value) {
        this.state.filterIntensity = Math.max(0, Math.min(1, value));
    },

    /**
     * Toggle filter on/off
     */
    toggleFilter(enabled) {
        this.state.filterEnabled = enabled !== undefined ? enabled : !this.state.filterEnabled;
    },

    /**
     * Take a snapshot
     */
    takeSnapshot() {
        const canvas = this.elements.canvas;
        const dataUrl = canvas.toDataURL('image/png');
        
        // Create download link
        const link = document.createElement('a');
        link.download = `colorvision-snapshot-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();

        return dataUrl;
    },

    /**
     * Switch camera (front/back)
     */
    async switchCamera() {
        this.config.facingMode = this.config.facingMode === 'environment' ? 'user' : 'environment';
        
        if (this.state.isActive) {
            this.stop();
            await this.start();
        }
    },

    /**
     * Get current filter parameters
     */
    getFilterParams() {
        return { ...this.filterParams };
    },

    /**
     * Set custom filter parameters
     */
    setFilterParams(params) {
        this.filterParams = { ...this.filterParams, ...params };
    },

    /**
     * Check if camera is active
     */
    isActive() {
        return this.state.isActive;
    }
};

// Export
window.AdaptiveCameraFilter = AdaptiveCameraFilter;
