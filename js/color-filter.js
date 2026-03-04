/**
 * ColorVision Pro - Color Filter Engine
 * Handles color correction filter calculation and application for deuteranomaly compensation.
 */

const ColorFilter = {
    /**
     * Default filter parameters when no correction is applied.
     * @type {Object}
     */
    defaults: {
        hueShift: 0,        // -180 to 180 degrees
        intensity: 0.5,      // 0 to 1
        saturationBoost: 0,  // -50 to 50
        brightness: 0,       // -50 to 50
        contrast: 0          // -50 to 50
    },

    /**
     * Severity-based filter presets.
     * @type {Object.<string, Object>}
     */
    presets: {
        none: {
            hueShift: 0,
            intensity: 0,
            saturationBoost: 0,
            brightness: 0,
            contrast: 0
        },
        mild: {
            hueShift: 15,
            intensity: 0.3,
            saturationBoost: 10,
            brightness: 0,
            contrast: 5
        },
        moderate: {
            hueShift: 25,
            intensity: 0.5,
            saturationBoost: 15,
            brightness: 0,
            contrast: 8
        },
        strong: {
            hueShift: 40,
            intensity: 0.7,
            saturationBoost: 20,
            brightness: 0,
            contrast: 10
        }
    },

    /**
     * Allowed parameter ranges for the tuning UI.
     * @type {Object.<string, {min: number, max: number, step: number}>}
     */
    paramRanges: {
        hueShift: { min: -60, max: 60, step: 5 },
        intensity: { min: 0, max: 1, step: 0.1 },
        saturationBoost: { min: -20, max: 40, step: 5 },
        brightness: { min: -20, max: 20, step: 5 },
        contrast: { min: -20, max: 20, step: 5 }
    },

    /**
     * Return initial filter parameters for a given severity level.
     * @param {string} severity - One of 'none', 'mild', 'moderate', 'strong'.
     * @returns {Object} A copy of the preset parameters.
     */
    getInitialParams(severity) {
        const preset = this.presets[severity] || this.presets.moderate;
        return { ...preset };
    },

    /**
     * Apply the color correction filter to a single RGB pixel.
     * @param {number[]} rgb - The [r, g, b] input color (0–255 each).
     * @param {Object} params - Filter parameters (hueShift, intensity, saturationBoost, brightness, contrast).
     * @returns {number[]} The corrected [r, g, b] color.
     */
    applyToRGB(rgb, params) {
        if (!params || params.intensity === 0) {
            return rgb;
        }
        if (!Array.isArray(rgb) || rgb.length < 3) {
            return [0, 0, 0];
        }

        let [r, g, b] = rgb;
        const { hueShift, intensity, saturationBoost, brightness, contrast } = params;

        // Convert to HSL
        let [h, s, l] = Utils.rgbToHsl(r, g, b);

        // Apply hue shift (selective for red-green range)
        const effectiveHueShift = this.calculateSelectiveHueShift(h, hueShift, intensity);
        h = (h + effectiveHueShift + 360) % 360;

        // Apply saturation boost
        s = Utils.clamp(s + saturationBoost * intensity, 0, 100);

        // Convert back to RGB
        [r, g, b] = Utils.hslToRgb(h, s, l);

        // Apply brightness
        if (brightness !== 0) {
            const brightnessFactor = 1 + (brightness * intensity / 100);
            r = Utils.clamp(r * brightnessFactor, 0, 255);
            g = Utils.clamp(g * brightnessFactor, 0, 255);
            b = Utils.clamp(b * brightnessFactor, 0, 255);
        }

        // Apply contrast
        if (contrast !== 0) {
            const contrastFactor = 1 + (contrast * intensity / 100);
            r = Utils.clamp(((r / 255 - 0.5) * contrastFactor + 0.5) * 255, 0, 255);
            g = Utils.clamp(((g / 255 - 0.5) * contrastFactor + 0.5) * 255, 0, 255);
            b = Utils.clamp(((b / 255 - 0.5) * contrastFactor + 0.5) * 255, 0, 255);
        }

        return [Math.round(r), Math.round(g), Math.round(b)];
    },

    /**
     * Calculate selective hue shift for the red-green confusion axis.
     * Colors in the red-green range receive more shift; others receive less.
     * @param {number} hue - Current hue in degrees (0–360).
     * @param {number} shift - Base hue shift amount.
     * @param {number} intensity - Filter intensity (0–1).
     * @returns {number} The effective hue shift to apply.
     */
    calculateSelectiveHueShift(hue, shift, intensity) {
        // Red-green confusion colors are in specific hue ranges
        // Red: 0-30, 330-360
        // Green: 60-150
        
        let factor = 0;
        
        // Red range
        if (hue >= 0 && hue <= 40) {
            factor = 1 - (hue / 40) * 0.5;
        } else if (hue >= 320 && hue <= 360) {
            factor = (hue - 320) / 40 * 0.5 + 0.5;
        }
        // Yellow-green range
        else if (hue >= 40 && hue <= 90) {
            factor = 0.5 + (hue - 40) / 50 * 0.5;
        }
        // Green range
        else if (hue >= 90 && hue <= 150) {
            factor = 1 - (hue - 90) / 60 * 0.5;
        }
        // Less effect on other colors
        else {
            factor = 0.2;
        }

        return shift * intensity * factor;
    },

    /**
     * Apply the color correction filter to an entire ImageData buffer.
     * @param {ImageData} imageData - The canvas ImageData to process in-place.
     * @param {Object} params - Filter parameters.
     * @returns {ImageData} The modified ImageData.
     */
    applyToImageData(imageData, params) {
        if (!imageData || !imageData.data) {
            return imageData;
        }
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const [r, g, b] = this.applyToRGB(
                [data[i], data[i + 1], data[i + 2]],
                params
            );
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
            // Alpha stays the same
        }

        return imageData;
    },

    /**
     * Build a CSS filter property string approximating the color correction.
     * @param {Object} params - Filter parameters.
     * @returns {string} A CSS filter value (e.g. "hue-rotate(15deg) saturate(1.1)"), or "none".
     */
    toCSSFilter(params) {
        if (!params || params.intensity === 0) {
            return 'none';
        }

        const filters = [];
        const { hueShift, intensity, saturationBoost, brightness, contrast } = params;

        if (hueShift !== 0) {
            filters.push(`hue-rotate(${hueShift * intensity}deg)`);
        }
        if (saturationBoost !== 0) {
            const satValue = 1 + (saturationBoost * intensity / 100);
            filters.push(`saturate(${satValue})`);
        }
        if (brightness !== 0) {
            const brightValue = 1 + (brightness * intensity / 100);
            filters.push(`brightness(${brightValue})`);
        }
        if (contrast !== 0) {
            const contrastValue = 1 + (contrast * intensity / 100);
            filters.push(`contrast(${contrastValue})`);
        }

        return filters.length > 0 ? filters.join(' ') : 'none';
    },

    /**
     * Generate neighboring parameter sets for hill-climbing tuning.
     * @param {Object} params - The current parameter set.
     * @param {number} [stepMultiplier=1] - Scale factor for the step size.
     * @returns {Object[]} An array of nearby parameter sets.
     */
    generateNeighbors(params, stepMultiplier = 1) {
        const neighbors = [];
        const { paramRanges } = this;

        // Generate variations for each parameter
        Object.keys(paramRanges).forEach(param => {
            const range = paramRanges[param];
            const step = range.step * stepMultiplier;
            
            // Lower value
            if (params[param] - step >= range.min) {
                neighbors.push({
                    ...params,
                    [param]: Math.round((params[param] - step) * 100) / 100
                });
            }
            
            // Higher value
            if (params[param] + step <= range.max) {
                neighbors.push({
                    ...params,
                    [param]: Math.round((params[param] + step) * 100) / 100
                });
            }
        });

        return neighbors;
    },

    /**
     * Linearly interpolate between two parameter sets.
     * @param {Object} params1 - Start parameters.
     * @param {Object} params2 - End parameters.
     * @param {number} t - Interpolation factor (0–1).
     * @returns {Object} Interpolated parameters.
     */
    interpolate(params1, params2, t) {
        const result = {};
        Object.keys(params1).forEach(key => {
            result[key] = Utils.lerp(params1[key], params2[key], t);
        });
        return result;
    },

    /**
     * Calculate a similarity score (0–1) between two parameter sets.
     * @param {Object} params1 - First parameter set.
     * @param {Object} params2 - Second parameter set.
     * @returns {number} Similarity score where 1 means identical.
     */
    similarity(params1, params2) {
        let totalDiff = 0;
        const { paramRanges } = this;

        Object.keys(paramRanges).forEach(param => {
            const range = paramRanges[param].max - paramRanges[param].min;
            const diff = Math.abs(params1[param] - params2[param]) / range;
            totalDiff += diff;
        });

        return 1 - (totalDiff / Object.keys(paramRanges).length);
    },

    /**
     * Validate and clamp filter parameters to their allowed ranges.
     * @param {Object} params - Raw parameters to normalize.
     * @returns {Object} Normalized parameters with all values within range.
     */
    normalizeParams(params) {
        const normalized = { ...this.defaults };
        const { paramRanges } = this;

        Object.keys(paramRanges).forEach(param => {
            if (params[param] !== undefined) {
                normalized[param] = Utils.clamp(
                    params[param],
                    paramRanges[param].min,
                    paramRanges[param].max
                );
            }
        });

        return normalized;
    },

    /**
     * Format parameters into human-readable display strings.
     * @param {Object} params - Filter parameters.
     * @returns {Object.<string, string>} Formatted key-value pairs.
     */
    formatForDisplay(params) {
        return {
            'Hue Shift': `${params.hueShift.toFixed(0)}°`,
            'Intensity': `${(params.intensity * 100).toFixed(0)}%`,
            'Saturation': `${params.saturationBoost > 0 ? '+' : ''}${params.saturationBoost.toFixed(0)}%`,
            'Brightness': `${params.brightness > 0 ? '+' : ''}${params.brightness.toFixed(0)}%`,
            'Contrast': `${params.contrast > 0 ? '+' : ''}${params.contrast.toFixed(0)}%`
        };
    },

    /**
     * Serialize parameters to a JSON string.
     * @param {Object} params - Filter parameters.
     * @returns {string} JSON representation.
     */
    serialize(params) {
        return JSON.stringify(this.normalizeParams(params));
    },

    /**
     * Deserialize parameters from a JSON string.
     * @param {string} str - JSON string to parse.
     * @returns {Object} Normalized filter parameters, or defaults on parse error.
     */
    deserialize(str) {
        try {
            const parsed = JSON.parse(str);
            return this.normalizeParams(parsed);
        } catch (e) {
            return { ...this.defaults };
        }
    }
};

// Export for use in other modules
window.ColorFilter = ColorFilter;
