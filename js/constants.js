/**
 * ColorVision Pro - Shared Constants
 * Centralizes magic numbers and configuration values used across modules.
 */

const Constants = {
    /**
     * Grid configuration shared across mosaic generators
     */
    grid: {
        /** @type {number} Default grid size (tiles per row/column) */
        size: 18,
        /** @type {number} Padding between tiles in pixels */
        tilePadding: 0,
        /** @type {number} Target detection area (tiles x tiles) */
        targetSize: 3
    },

    /**
     * Canvas size presets for responsive layout
     */
    canvas: {
        desktop: {
            /** @type {number} Tile size on desktop in pixels */
            tileSize: 30,
            /** @type {number} Canvas width on desktop in pixels */
            width: 600,
            /** @type {number} Canvas height on desktop in pixels */
            height: 600
        },
        mobile: {
            /** @type {number} Tile size on mobile in pixels */
            tileSize: 16,
            /** @type {number} Canvas width on mobile in pixels */
            width: 320,
            /** @type {number} Canvas height on mobile in pixels */
            height: 330
        },
        /** @type {number} Breakpoint width in pixels below which mobile layout is used */
        mobileBreakpoint: 760
    },

    /**
     * Camera configuration defaults
     */
    camera: {
        /** @type {number} Ideal capture width in pixels */
        idealWidth: 1280,
        /** @type {number} Ideal capture height in pixels */
        idealHeight: 720,
        /** @type {number} Fallback capture width in pixels */
        fallbackWidth: 640,
        /** @type {number} Fallback capture height in pixels */
        fallbackHeight: 480,
        /** @type {string} Default camera facing mode */
        defaultFacingMode: 'environment'
    },

    /**
     * Animation timing constants
     */
    animation: {
        /** @type {number} Number of animation frames per cycle */
        frames: 10,
        /** @type {number} Interval between animation frames in ms */
        interval: 50,
        /** @type {number} Total animation cycle duration in ms */
        cycleDuration: 510,
        /** @type {number} Base animation speed factor */
        baseSpeed: 0.0008
    },

    /**
     * Test configuration defaults
     */
    test: {
        /** @type {number} Number of plates in a baseline test */
        baselinePlateCount: 12,
        /** @type {number} Number of plates in a validation test */
        validationPlateCount: 8,
        /** @type {number} Number of plates per tuning round */
        tuningPlateCount: 5,
        /** @type {number} Maximum response time per plate in ms (30 seconds) */
        maxResponseTime: 30000,
        /** @type {number} Maximum tuning rounds */
        maxTuningRounds: 5,
        /** @type {number} Minimum improvement threshold to continue tuning (percent) */
        improvementThreshold: 5,
        /** @type {number} Maximum rounds without improvement before stopping */
        maxNoImprovement: 2
    },

    /**
     * Severity classification thresholds (percentage score boundaries)
     */
    severity: {
        /** @type {number} Score above this value indicates no deficiency */
        noneThreshold: 85,
        /** @type {number} Score above this value indicates mild deficiency */
        mildThreshold: 65,
        /** @type {number} Score above this value indicates moderate deficiency */
        moderateThreshold: 40,
        /** @type {string[]} Ordered severity bucket names */
        buckets: ['none', 'mild', 'moderate', 'strong']
    },

    /**
     * Storage configuration
     */
    storage: {
        /** @type {number} Maximum number of sessions to keep */
        maxSessions: 50,
        /** @type {string} LocalStorage key prefix */
        keyPrefix: 'colorvision_'
    },

    /**
     * Color ranges for selective hue shift (degrees)
     */
    hueRanges: {
        /** @type {number[]} Red hue range [start, end] */
        red: [0, 40],
        /** @type {number[]} Red wrap-around range [start, end] */
        redWrap: [320, 360],
        /** @type {number[]} Yellow-green hue range [start, end] */
        yellowGreen: [40, 90],
        /** @type {number[]} Green hue range [start, end] */
        green: [90, 150],
        /** @type {number} Default factor for non-targeted hue ranges */
        defaultFactor: 0.2
    },

    /**
     * Export format metadata
     */
    export: {
        /** @type {string} Current export format version */
        version: '1.0',
        /** @type {string} Format identifier for single session export */
        formatName: 'ColorVision Pro Session Export',
        /** @type {string} Format identifier for all sessions export */
        allSessionsFormatName: 'ColorVision Pro All Sessions Export'
    }
};

// Freeze to prevent accidental mutation
Object.freeze(Constants);
Object.freeze(Constants.grid);
Object.freeze(Constants.canvas);
Object.freeze(Constants.canvas.desktop);
Object.freeze(Constants.canvas.mobile);
Object.freeze(Constants.camera);
Object.freeze(Constants.animation);
Object.freeze(Constants.test);
Object.freeze(Constants.severity);
Object.freeze(Constants.storage);
Object.freeze(Constants.hueRanges);
Object.freeze(Constants.export);

// Export for use in other modules
window.Constants = Constants;
