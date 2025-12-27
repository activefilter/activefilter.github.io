/**
 * ColorVision Pro - Color Filter Engine
 * Handles color correction filter calculation and application
 */

const ColorFilter = {
    /**
     * Default filter parameters
     */
    defaults: {
        hueShift: 0,        // -180 to 180 degrees
        intensity: 0.5,      // 0 to 1
        saturationBoost: 0,  // -50 to 50
        brightness: 0,       // -50 to 50
        contrast: 0          // -50 to 50
    },

    /**
     * Filter presets based on severity
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
     * Parameter ranges for tuning
     */
    paramRanges: {
        hueShift: { min: -60, max: 60, step: 5 },
        intensity: { min: 0, max: 1, step: 0.1 },
        saturationBoost: { min: -20, max: 40, step: 5 },
        brightness: { min: -20, max: 20, step: 5 },
        contrast: { min: -20, max: 20, step: 5 }
    },

    /**
     * Get initial filter parameters based on severity
     */
    getInitialParams(severity) {
        const preset = this.presets[severity] || this.presets.moderate;
        return { ...preset };
    },

    /**
     * Apply filter to a single RGB color
     */
    applyToRGB(rgb, params) {
        if (!params || params.intensity === 0) {
            return rgb;
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
     * Calculate selective hue shift (more effect on red-green confusion colors)
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
     * Apply filter to image data (for canvas operations)
     */
    applyToImageData(imageData, params) {
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
     * Create CSS filter string (approximate, for quick preview)
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
     * Generate neighboring parameter sets for tuning
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
     * Interpolate between two parameter sets
     */
    interpolate(params1, params2, t) {
        const result = {};
        Object.keys(params1).forEach(key => {
            result[key] = Utils.lerp(params1[key], params2[key], t);
        });
        return result;
    },

    /**
     * Calculate similarity score between two parameter sets
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
     * Validate and normalize parameters
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
     * Format parameters for display
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
     * Serialize parameters for storage
     */
    serialize(params) {
        return JSON.stringify(this.normalizeParams(params));
    },

    /**
     * Deserialize parameters from storage
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
