/**
 * ColorVision Pro - Utility Functions
 * Provides shared helpers for math, color conversion, DOM manipulation, and formatting.
 */

const Utils = {
    /**
     * Create a seeded random number generator using the Mulberry32 algorithm.
     * @param {number} seed - Integer seed value.
     * @returns {function(): number} A function that returns a pseudo-random number in [0, 1).
     */
    createRNG(seed) {
        return function() {
            let t = seed += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    },

    /**
     * Generate a deterministic seed from the current timestamp and an optional salt string.
     * @param {string} [salt=''] - Optional salt to mix into the seed.
     * @returns {number} A non-negative integer seed.
     */
    generateSeed(salt = '') {
        const now = Date.now();
        let hash = 0;
        const str = now.toString() + salt;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    },

    /**
     * Shuffle an array using the Fisher-Yates algorithm.
     * Returns a new array; the original is not modified.
     * @param {Array} array - The array to shuffle.
     * @param {function(): number} [rng=Math.random] - Random number generator returning [0, 1).
     * @returns {Array} A new shuffled array.
     */
    shuffleArray(array, rng = Math.random) {
        if (!Array.isArray(array)) return [];
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    },

    /**
     * Pick a random item from an array.
     * @param {Array} array - The source array.
     * @param {function(): number} [rng=Math.random] - Random number generator returning [0, 1).
     * @returns {*} A random element, or undefined if the array is empty.
     */
    randomPick(array, rng = Math.random) {
        if (!Array.isArray(array) || array.length === 0) return undefined;
        return array[Math.floor(rng() * array.length)];
    },

    /**
     * Clamp a numeric value between a minimum and maximum.
     * @param {number} value - The value to clamp.
     * @param {number} min - Minimum allowed value.
     * @param {number} max - Maximum allowed value.
     * @returns {number} The clamped value.
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },

    /**
     * Linearly interpolate between two values.
     * @param {number} a - Start value.
     * @param {number} b - End value.
     * @param {number} t - Interpolation factor in [0, 1].
     * @returns {number} The interpolated value.
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    /**
     * Convert HSL color values to RGB.
     * @param {number} h - Hue in degrees (0–360).
     * @param {number} s - Saturation as a percentage (0–100).
     * @param {number} l - Lightness as a percentage (0–100).
     * @returns {number[]} An [r, g, b] array with values in 0–255.
     */
    hslToRgb(h, s, l) {
        h = ((h % 360) + 360) % 360 / 360;
        s = this.clamp(s, 0, 100) / 100;
        l = this.clamp(l, 0, 100) / 100;

        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    },

    /**
     * Convert RGB color values to HSL.
     * @param {number} r - Red channel (0–255).
     * @param {number} g - Green channel (0–255).
     * @param {number} b - Blue channel (0–255).
     * @returns {number[]} An [h, s, l] array where h is 0–360, s and l are 0–100.
     */
    rgbToHsl(r, g, b) {
        r = this.clamp(r, 0, 255) / 255;
        g = this.clamp(g, 0, 255) / 255;
        b = this.clamp(b, 0, 255) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
    },

    /**
     * Convert RGB values to a hex color string.
     * @param {number} r - Red channel (0–255).
     * @param {number} g - Green channel (0–255).
     * @param {number} b - Blue channel (0–255).
     * @returns {string} A hex color string like "#ff0000".
     */
    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = this.clamp(Math.round(x), 0, 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    },

    /**
     * Parse a hex color string to an RGB array.
     * @param {string} hex - A hex color string (e.g. "#ff0000" or "ff0000").
     * @returns {number[]|null} An [r, g, b] array, or null if parsing fails.
     */
    hexToRgb(hex) {
        if (typeof hex !== 'string') return null;
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : null;
    },

    /**
     * Calculate the Euclidean distance between two RGB colors.
     * @param {number[]} rgb1 - First color as [r, g, b].
     * @param {number[]} rgb2 - Second color as [r, g, b].
     * @returns {number} The distance (0–~441.67).
     */
    colorDistance(rgb1, rgb2) {
        if (!Array.isArray(rgb1) || !Array.isArray(rgb2) ||
            rgb1.length < 3 || rgb2.length < 3) {
            return 0;
        }
        return Math.sqrt(
            Math.pow(rgb1[0] - rgb2[0], 2) +
            Math.pow(rgb1[1] - rgb2[1], 2) +
            Math.pow(rgb1[2] - rgb2[2], 2)
        );
    },

    /**
     * Format a duration in seconds as "mm:ss".
     * @param {number} seconds - Duration in seconds.
     * @returns {string} Formatted time string.
     */
    formatTime(seconds) {
        if (typeof seconds !== 'number' || seconds < 0) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    /**
     * Format a date value for display using the browser locale.
     * @param {string|number|Date} date - A value parseable by the Date constructor.
     * @returns {string} A locale-formatted date string.
     */
    formatDate(date) {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleString();
    },

    /**
     * Generate a unique identifier string.
     * @returns {string} A unique ID combining timestamp and random characters.
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Collect basic, non-identifying device and environment information.
     * @returns {Object} An object with user agent, platform, screen, and timing data.
     */
    getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenWidth: screen.width,
            screenHeight: screen.height,
            pixelRatio: window.devicePixelRatio || 1,
            colorDepth: screen.colorDepth,
            timestamp: new Date().toISOString()
        };
    },

    /**
     * Create a debounced version of a function that delays invocation until
     * after `wait` milliseconds have elapsed since the last call.
     * @param {Function} func - The function to debounce.
     * @param {number} wait - Delay in milliseconds.
     * @returns {Function} The debounced function.
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Check whether a value falls within an inclusive range.
     * @param {number} value - The value to test.
     * @param {number} min - Range minimum (inclusive).
     * @param {number} max - Range maximum (inclusive).
     * @returns {boolean} True if value is within [min, max].
     */
    isBetween(value, min, max) {
        return value >= min && value <= max;
    },

    /**
     * Calculate the rounded percentage of a value relative to a total.
     * @param {number} value - The numerator.
     * @param {number} total - The denominator.
     * @returns {number} The percentage (0–100), or 0 if total is 0.
     */
    percentage(value, total) {
        if (total === 0) return 0;
        return Math.round((value / total) * 100);
    },

    /**
     * Calculate the arithmetic mean of a numeric array.
     * @param {number[]} arr - Array of numbers.
     * @returns {number} The average, or 0 for an empty array.
     */
    average(arr) {
        if (!Array.isArray(arr) || arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    },

    /**
     * Calculate the population standard deviation of a numeric array.
     * @param {number[]} arr - Array of numbers.
     * @returns {number} The standard deviation, or 0 for an empty array.
     */
    standardDeviation(arr) {
        if (!Array.isArray(arr) || arr.length === 0) return 0;
        const avg = this.average(arr);
        const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
        return Math.sqrt(this.average(squareDiffs));
    },

    // ============================================
    // DOM Helpers
    // ============================================

    /**
     * Show a DOM element by removing the 'hidden' class.
     * @param {HTMLElement|null} el - The element to show.
     */
    showElement(el) {
        if (el) el.classList.remove('hidden');
    },

    /**
     * Hide a DOM element by adding the 'hidden' class.
     * @param {HTMLElement|null} el - The element to hide.
     */
    hideElement(el) {
        if (el) el.classList.add('hidden');
    },

    /**
     * Trigger a file download in the browser.
     * @param {string} content - The file content.
     * @param {string} filename - The suggested download filename.
     * @param {string} mimeType - The MIME type of the content.
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    }
};

// Export for use in other modules
window.Utils = Utils;
