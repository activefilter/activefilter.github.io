/**
 * ColorVision Pro - Mosaic Plate Generator
 * Generates animated mosaic plates with colored tiles for the JLTTCK Active Filter
 */

const MosaicGenerator = {
    /**
     * Plate configuration
     */
    config: {
        defaultSize: 400,
        tileCountRange: [12, 16], // tiles per row/column
        tilePadding: 1,
        borderRadius: 2
    },

    /**
     * Color palettes designed to confuse deuteranomaly (red-green deficiency)
     * These are carefully chosen to have similar appearance for people with deuteranomaly
     */
    colorPalettes: {
        // Red-green confusion palettes (main test)
        deutanConfusion: [
            // Palette 1: Green background, red target
            {
                background: [
                    { h: 120, s: 45, l: 45 }, // Muted green
                    { h: 125, s: 40, l: 50 },
                    { h: 115, s: 50, l: 40 },
                    { h: 130, s: 42, l: 48 }
                ],
                target: [
                    { h: 0, s: 50, l: 45 },   // Muted red
                    { h: 5, s: 45, l: 48 },
                    { h: 355, s: 48, l: 42 }
                ]
            },
            // Palette 2: Olive/brown background, green target
            {
                background: [
                    { h: 45, s: 35, l: 40 },  // Olive/brown
                    { h: 50, s: 38, l: 42 },
                    { h: 40, s: 32, l: 45 },
                    { h: 55, s: 36, l: 38 }
                ],
                target: [
                    { h: 85, s: 45, l: 42 },  // Yellow-green
                    { h: 90, s: 42, l: 45 },
                    { h: 80, s: 48, l: 40 }
                ]
            },
            // Palette 3: Brownish-red, pure green target
            {
                background: [
                    { h: 15, s: 40, l: 42 },
                    { h: 20, s: 38, l: 45 },
                    { h: 10, s: 42, l: 40 },
                    { h: 25, s: 36, l: 44 }
                ],
                target: [
                    { h: 140, s: 48, l: 40 },
                    { h: 145, s: 45, l: 42 },
                    { h: 135, s: 50, l: 38 }
                ]
            },
            // Palette 4: Teal-ish background, pink target
            {
                background: [
                    { h: 165, s: 35, l: 45 },
                    { h: 170, s: 38, l: 42 },
                    { h: 160, s: 32, l: 48 },
                    { h: 175, s: 36, l: 44 }
                ],
                target: [
                    { h: 340, s: 45, l: 50 },
                    { h: 345, s: 42, l: 48 },
                    { h: 335, s: 48, l: 52 }
                ]
            },
            // Palette 5: Cyan-green, orange target
            {
                background: [
                    { h: 150, s: 42, l: 48 },
                    { h: 155, s: 38, l: 45 },
                    { h: 145, s: 45, l: 50 },
                    { h: 160, s: 40, l: 46 }
                ],
                target: [
                    { h: 25, s: 55, l: 50 },
                    { h: 30, s: 52, l: 48 },
                    { h: 20, s: 58, l: 52 }
                ]
            }
        ],

        // Control palettes (should be equally visible to all)
        control: [
            // Blue vs Yellow (not affected by deuteranomaly)
            {
                background: [
                    { h: 220, s: 50, l: 50 },
                    { h: 225, s: 48, l: 52 },
                    { h: 215, s: 52, l: 48 },
                    { h: 230, s: 46, l: 54 }
                ],
                target: [
                    { h: 55, s: 70, l: 55 },
                    { h: 60, s: 68, l: 52 },
                    { h: 50, s: 72, l: 58 }
                ]
            },
            // Purple vs Yellow
            {
                background: [
                    { h: 270, s: 45, l: 45 },
                    { h: 275, s: 42, l: 48 },
                    { h: 265, s: 48, l: 42 },
                    { h: 280, s: 44, l: 46 }
                ],
                target: [
                    { h: 48, s: 65, l: 55 },
                    { h: 52, s: 62, l: 58 },
                    { h: 44, s: 68, l: 52 }
                ]
            },
            // Dark blue vs Light orange
            {
                background: [
                    { h: 235, s: 55, l: 35 },
                    { h: 240, s: 52, l: 38 },
                    { h: 230, s: 58, l: 32 },
                    { h: 245, s: 50, l: 36 }
                ],
                target: [
                    { h: 35, s: 80, l: 65 },
                    { h: 40, s: 78, l: 62 },
                    { h: 30, s: 82, l: 68 }
                ]
            }
        ]
    },

    /**
     * Target shapes/patterns that can be embedded in plates
     */
    targetPatterns: {
        numbers: ['2', '3', '5', '6', '7', '8', '9'],
        letters: ['A', 'C', 'E', 'H', 'K', 'N', 'O', 'P', 'S', 'X'],
        shapes: ['circle', 'square', 'triangle', 'diamond']
    },

    /**
     * Generate a complete mosaic plate
     */
    generatePlate(options = {}) {
        const {
            size = this.config.defaultSize,
            type = 'deutanConfusion', // 'deutanConfusion' or 'control'
            seed = Utils.generateSeed(),
            difficulty = 'medium', // 'easy', 'medium', 'hard'
            targetType = 'number', // 'number', 'letter', 'shape'
            filterParams = null // Apply correction filter for tuning tests
        } = options;

        const rng = Utils.createRNG(seed);
        
        // Determine tile count based on difficulty
        const tileCounts = {
            easy: 10,
            medium: 14,
            hard: 18
        };
        const tileCount = tileCounts[difficulty] || 14;
        const tileSize = Math.floor(size / tileCount);

        // Select color palette
        const palettes = type === 'control' 
            ? this.colorPalettes.control 
            : this.colorPalettes.deutanConfusion;
        const palette = Utils.randomPick(palettes, rng);

        // Select target
        let target, targetValue;
        if (targetType === 'number') {
            targetValue = Utils.randomPick(this.targetPatterns.numbers, rng);
            target = { type: 'number', value: targetValue };
        } else if (targetType === 'letter') {
            targetValue = Utils.randomPick(this.targetPatterns.letters, rng);
            target = { type: 'letter', value: targetValue };
        } else {
            targetValue = Utils.randomPick(this.targetPatterns.shapes, rng);
            target = { type: 'shape', value: targetValue };
        }

        // Generate the plate data
        const plateData = {
            seed,
            size,
            tileCount,
            tileSize,
            type,
            difficulty,
            palette,
            target,
            filterParams,
            tiles: this.generateTiles(tileCount, tileSize, palette, target, rng, filterParams)
        };

        return plateData;
    },

    /**
     * Generate tile data for the plate
     */
    generateTiles(tileCount, tileSize, palette, target, rng, filterParams) {
        const tiles = [];
        const targetMask = this.createTargetMask(tileCount, target, rng);

        for (let row = 0; row < tileCount; row++) {
            for (let col = 0; col < tileCount; col++) {
                const isTarget = targetMask[row][col];
                const colorSet = isTarget ? palette.target : palette.background;
                const baseColor = Utils.randomPick(colorSet, rng);
                
                // Add small random variation
                let color = {
                    h: baseColor.h + (rng() - 0.5) * 8,
                    s: baseColor.s + (rng() - 0.5) * 6,
                    l: baseColor.l + (rng() - 0.5) * 6
                };

                // Apply correction filter if provided
                if (filterParams) {
                    color = this.applyFilterToHSL(color, filterParams);
                }

                const rgb = Utils.hslToRgb(color.h, color.s, color.l);
                
                tiles.push({
                    row,
                    col,
                    x: col * tileSize,
                    y: row * tileSize,
                    size: tileSize,
                    isTarget,
                    color: Utils.rgbToHex(rgb[0], rgb[1], rgb[2]),
                    rgb
                });
            }
        }

        return tiles;
    },

    /**
     * Create a mask indicating which tiles are part of the target
     */
    createTargetMask(gridSize, target, rng) {
        const mask = Array(gridSize).fill(null).map(() => Array(gridSize).fill(false));
        const centerX = gridSize / 2;
        const centerY = gridSize / 2;
        const scale = gridSize / 14; // Base scale

        if (target.type === 'number' || target.type === 'letter') {
            // Generate character pattern
            const patterns = this.getCharacterPatterns();
            const pattern = patterns[target.value];
            if (pattern) {
                const patternHeight = pattern.length;
                const patternWidth = pattern[0].length;
                const startRow = Math.floor((gridSize - patternHeight * scale) / 2);
                const startCol = Math.floor((gridSize - patternWidth * scale) / 2);

                for (let py = 0; py < patternHeight; py++) {
                    for (let px = 0; px < patternWidth; px++) {
                        if (pattern[py][px] === 1) {
                            // Scale up the pattern
                            for (let sy = 0; sy < scale; sy++) {
                                for (let sx = 0; sx < scale; sx++) {
                                    const row = Math.floor(startRow + py * scale + sy);
                                    const col = Math.floor(startCol + px * scale + sx);
                                    if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
                                        mask[row][col] = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } else if (target.type === 'shape') {
            // Generate shape pattern
            const radius = gridSize * 0.35;
            
            for (let row = 0; row < gridSize; row++) {
                for (let col = 0; col < gridSize; col++) {
                    const dx = col - centerX + 0.5;
                    const dy = row - centerY + 0.5;
                    
                    switch (target.value) {
                        case 'circle':
                            if (Math.sqrt(dx * dx + dy * dy) < radius) {
                                mask[row][col] = true;
                            }
                            break;
                        case 'square':
                            if (Math.abs(dx) < radius * 0.7 && Math.abs(dy) < radius * 0.7) {
                                mask[row][col] = true;
                            }
                            break;
                        case 'triangle':
                            if (dy > -radius * 0.6 && dy < radius * 0.6 &&
                                Math.abs(dx) < (radius * 0.6 - dy * 0.5)) {
                                mask[row][col] = true;
                            }
                            break;
                        case 'diamond':
                            if (Math.abs(dx) + Math.abs(dy) < radius * 0.8) {
                                mask[row][col] = true;
                            }
                            break;
                    }
                }
            }
        }

        return mask;
    },

    /**
     * Character patterns for numbers and letters (5x7 grid each)
     */
    getCharacterPatterns() {
        return {
            '2': [
                [0,1,1,1,0],
                [1,0,0,0,1],
                [0,0,0,0,1],
                [0,0,1,1,0],
                [0,1,0,0,0],
                [1,0,0,0,0],
                [1,1,1,1,1]
            ],
            '3': [
                [0,1,1,1,0],
                [1,0,0,0,1],
                [0,0,0,0,1],
                [0,0,1,1,0],
                [0,0,0,0,1],
                [1,0,0,0,1],
                [0,1,1,1,0]
            ],
            '5': [
                [1,1,1,1,1],
                [1,0,0,0,0],
                [1,1,1,1,0],
                [0,0,0,0,1],
                [0,0,0,0,1],
                [1,0,0,0,1],
                [0,1,1,1,0]
            ],
            '6': [
                [0,0,1,1,0],
                [0,1,0,0,0],
                [1,0,0,0,0],
                [1,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [0,1,1,1,0]
            ],
            '7': [
                [1,1,1,1,1],
                [0,0,0,0,1],
                [0,0,0,1,0],
                [0,0,1,0,0],
                [0,1,0,0,0],
                [0,1,0,0,0],
                [0,1,0,0,0]
            ],
            '8': [
                [0,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [0,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [0,1,1,1,0]
            ],
            '9': [
                [0,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [0,1,1,1,1],
                [0,0,0,0,1],
                [0,0,0,1,0],
                [0,1,1,0,0]
            ],
            'A': [
                [0,0,1,0,0],
                [0,1,0,1,0],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,1,1,1,1],
                [1,0,0,0,1],
                [1,0,0,0,1]
            ],
            'C': [
                [0,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,0,0,0,1],
                [0,1,1,1,0]
            ],
            'E': [
                [1,1,1,1,1],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,1,1,1,0],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,1,1,1,1]
            ],
            'H': [
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,1,1,1,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1]
            ],
            'K': [
                [1,0,0,0,1],
                [1,0,0,1,0],
                [1,0,1,0,0],
                [1,1,0,0,0],
                [1,0,1,0,0],
                [1,0,0,1,0],
                [1,0,0,0,1]
            ],
            'N': [
                [1,0,0,0,1],
                [1,1,0,0,1],
                [1,0,1,0,1],
                [1,0,0,1,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1]
            ],
            'O': [
                [0,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [0,1,1,1,0]
            ],
            'P': [
                [1,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,0,1],
                [1,1,1,1,0],
                [1,0,0,0,0],
                [1,0,0,0,0],
                [1,0,0,0,0]
            ],
            'S': [
                [0,1,1,1,0],
                [1,0,0,0,1],
                [1,0,0,0,0],
                [0,1,1,1,0],
                [0,0,0,0,1],
                [1,0,0,0,1],
                [0,1,1,1,0]
            ],
            'X': [
                [1,0,0,0,1],
                [0,1,0,1,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,0,1,0,0],
                [0,1,0,1,0],
                [1,0,0,0,1]
            ]
        };
    },

    /**
     * Apply color filter to HSL color
     */
    applyFilterToHSL(hsl, filterParams) {
        if (!filterParams) return hsl;
        
        const { hueShift = 0, intensity = 1, saturationBoost = 0 } = filterParams;
        
        return {
            h: (hsl.h + hueShift * intensity + 360) % 360,
            s: Utils.clamp(hsl.s + saturationBoost * intensity, 0, 100),
            l: hsl.l
        };
    },

    /**
     * Render plate to canvas
     */
    renderToCanvas(canvas, plateData) {
        const ctx = canvas.getContext('2d');
        const { size, tiles, tileSize } = plateData;
        const padding = this.config.tilePadding;
        const radius = this.config.borderRadius;

        canvas.width = size;
        canvas.height = size;

        // Clear canvas
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, size, size);

        // Draw tiles
        tiles.forEach(tile => {
            ctx.fillStyle = tile.color;
            this.roundRect(
                ctx,
                tile.x + padding,
                tile.y + padding,
                tile.size - padding * 2,
                tile.size - padding * 2,
                radius
            );
        });

        return canvas;
    },

    /**
     * Draw rounded rectangle
     */
    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    },

    /**
     * Generate a test sequence of plates
     */
    generateTestSequence(options = {}) {
        const {
            plateCount = 12,
            deutanRatio = 0.67, // 2/3 deutan plates, 1/3 control
            seed = Utils.generateSeed(),
            difficulty = 'medium',
            filterParams = null
        } = options;

        const plates = [];
        const rng = Utils.createRNG(seed);
        
        const deutanCount = Math.round(plateCount * deutanRatio);
        const controlCount = plateCount - deutanCount;

        // Generate plate type sequence and shuffle
        const sequence = [
            ...Array(deutanCount).fill('deutanConfusion'),
            ...Array(controlCount).fill('control')
        ];
        const shuffledSequence = Utils.shuffleArray(sequence, rng);

        // Alternate between numbers and shapes for variety
        const targetTypes = ['number', 'number', 'letter', 'shape'];
        
        shuffledSequence.forEach((type, index) => {
            const plateSeed = Utils.generateSeed(`${seed}-${index}`);
            const targetType = targetTypes[index % targetTypes.length];
            
            plates.push(this.generatePlate({
                type,
                seed: plateSeed,
                difficulty,
                targetType,
                filterParams
            }));
        });

        return plates;
    },

    /**
     * Generate abbreviated sequence for tuning rounds
     */
    generateTuningSequence(options = {}) {
        return this.generateTestSequence({
            plateCount: 5,
            deutanRatio: 0.8, // Focus on deutan plates during tuning
            ...options
        });
    },

    /**
     * Get answer options for a plate
     */
    getAnswerOptions(plateData, rng = Math.random) {
        const { target } = plateData;
        let options = [];
        let correctAnswer = target.value;

        if (target.type === 'number') {
            // Include correct answer and 3 wrong ones
            const allNumbers = this.targetPatterns.numbers.filter(n => n !== target.value);
            const wrongNumbers = Utils.shuffleArray(allNumbers, rng).slice(0, 3);
            options = Utils.shuffleArray([target.value, ...wrongNumbers], rng);
        } else if (target.type === 'letter') {
            const allLetters = this.targetPatterns.letters.filter(l => l !== target.value);
            const wrongLetters = Utils.shuffleArray(allLetters, rng).slice(0, 3);
            options = Utils.shuffleArray([target.value, ...wrongLetters], rng);
        } else if (target.type === 'shape') {
            options = Utils.shuffleArray([...this.targetPatterns.shapes], rng);
        }

        // Add "I can't see it" option
        options.push('none');

        return { options, correctAnswer };
    }
};

// Export for use in other modules
window.MosaicGenerator = MosaicGenerator;
