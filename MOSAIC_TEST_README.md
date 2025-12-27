# Active Filter Deuteranomaly Mosaic Test

## Overview

This is an interactive color vision screening test adapted from the Colorlite mosaic test, specifically designed to detect deuteranomaly (reduced green sensitivity) - the most common form of red-green color vision deficiency.

## Features

- **16 Progressive Difficulty Levels**: Tests gradually increase in difficulty along the deuteranomaly confusion axis
- **Animated Mosaic Grid**: 18x18 grid of color tiles with sine-wave luminance animation
- **Touch-Optimized**: Works on both desktop and mobile devices
- **Responsive Design**: Automatically adjusts canvas size based on screen width
- **Privacy-Focused**: All processing happens in-browser, results stored locally only
- **Real-time Feedback**: Immediate response to user input with score tracking

## How It Works

### Color Science

The test uses carefully selected colors based on JLTTCK Active Filter research:

- **Background Color**: HSL(65°, 25%, 50%) - A greenish-yellow that appears neutral/gray to people with deuteranomaly
- **Target Colors**: Progress from obvious magenta (300°) toward the confusion point (~65°)

The confusion axis for deuteranomaly runs approximately from magenta-pink to greenish-yellow. As the test progresses, the target color moves closer to the background color along this axis, making discrimination increasingly difficult for those with reduced green sensitivity.

### Test Progression

1. **Easy Levels (1-4)**: Strong magenta/purple targets (300°-315°)
2. **Medium Levels (5-8)**: Moving toward the confusion line (320°-350°)
3. **Hard Levels (9-12)**: Red region approaching confusion (0°-30°)
4. **Very Hard Levels (13-16)**: At the confusion boundary (40°-55°)

### Scoring

- **90-100%**: Normal color vision
- **70-89%**: Mild deuteranomaly
- **50-69%**: Moderate deuteranomaly
- **Below 50%**: Severe deuteranomaly

## File Structure

```
/
├── deuteranomaly-test.html          # Main test page with UI
├── js/
│   ├── activefilter-mosaic.js       # Core test engine
│   └── activefilter-controller.js   # UI controller and state management
```

## Implementation Details

### activefilter-mosaic.js

The core test engine that handles:
- Canvas rendering and animation
- Particle grid management
- Color palette generation
- Target positioning and hit detection
- Progress tracking and scoring

### activefilter-controller.js

The UI controller that manages:
- DOM element caching and event binding
- Test flow (start, restart, skip)
- Results display and interpretation
- Local storage of test sessions

## Usage

1. Open `deuteranomaly-test.html` in a web browser
2. Click "Start Test"
3. For each level, tap the 3x3 group of tiles that looks different from the background
4. If you can't distinguish the target, click "I Can't Tell"
5. View your results at the end

## Customization

### Adjusting Difficulty

Edit the `PALETTES.levels` array in `activefilter-mosaic.js`:

```javascript
levels: [
    [hue, saturation, lightness],  // Level 1
    [hue, saturation, lightness],  // Level 2
    // ... etc
]
```

### Changing Background Color

Modify `PALETTES.background` in `activefilter-mosaic.js`:

```javascript
background: [65, 25, 50]  // HSL values
```

### Adding More Levels

Update `CONFIG.totalLevels` and add corresponding entries to `PALETTES.levels`.

## Technical Notes

### Animation System

Each tile particle has:
- A base HSL color
- A sine-wave frequency (randomized between 0.1-0.2)
- Luminance modulation of ±3 units

This creates a subtle "breathing" animation that helps distinguish foreground from background.

### Target Detection

The test uses a 3x3 grid of tiles as the target area:
- Center tile is randomly positioned (allowing space for the 3x3 grid)
- Hit detection checks if click/touch is within the bounds of this 3x3 area
- Allows for some imprecision in user input

### Responsive Design

- Desktop: 600x600px canvas, 30px tiles
- Mobile (<760px): 320x330px canvas, 16px tiles
- Automatically recalculates on window resize

## Browser Compatibility

Tested on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

## Privacy

- No data is sent to any server
- Test results stored in browser's localStorage only
- Session data includes: timestamp, scores, and severity assessment
- Users can clear session data through browser settings

## Credits

Adapted from the Colorlite Mosaic Test by Horváth Zoltán (www.colorlitelens.com)

Modified for deuteranomaly screening as part of the JLTTCK Active Filter research project.

## License

See LICENSE file for details.
