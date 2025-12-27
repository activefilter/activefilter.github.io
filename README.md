# ColorVision Pro

A static, client-only web app for screening red-green color vision deficiency (focus: deuteranomaly) using Mosaic Tests. The app auto-tunes a visual correction filter, validates improvement, and optionally applies the filter as a live camera overlay.

🔗 **Live Demo:** [https://activefilter.github.io](https://activefilter.github.io)

## Features

- 🎨 **Mosaic Vision Test** - Animated mosaic plates with colored tiles (not Ishihara dots)
- 📊 **Severity Assessment** - Estimates level of red-green color vision deficiency
- 🔧 **Auto-Tune Filter** - Automatically calibrates a correction filter for your vision
- 📹 **Live Camera Overlay** - Apply the tuned filter to your camera in real-time
- 💾 **Export Results** - Download your data as CSV or JSON
- 🔒 **Privacy-First** - All data stored locally, no server communication

## ⚠️ Important Disclaimer

**This application is NOT a medical diagnostic tool.** It is designed for educational and screening purposes only.

- Results are approximate and cannot replace professional eye examination
- If you suspect a color vision deficiency, please consult an eye care professional
- The correction filter is experimental and may vary in effectiveness

## How It Works

### 1. Baseline Mosaic Test
The app presents a sequence of mosaic plates made of colored tiles. Each plate embeds a hidden target (number, letter, or shape) using color differences designed to be difficult for people with deuteranomaly to distinguish.

### 2. Severity Assessment
Based on your performance on red-green confusion plates vs. control plates, the app estimates your severity level:
- **None** - Normal color vision for tested range
- **Mild** - Subtle difficulty with some red-green shades
- **Moderate** - Likely deuteranomaly
- **Strong** - Significant red-green color perception issues

### 3. Auto-Tune Filter
The app iteratively adjusts filter parameters (hue shift, intensity, saturation) across multiple test rounds to find settings that maximize your ability to distinguish colors.

### 4. Validation
A short retest confirms the filter's effectiveness, showing before/after comparison.

### 5. Camera Overlay
Apply your personalized filter to a live camera feed to see the world with corrected colors.

## Technical Details

### Built With
- Pure HTML5, CSS3, and vanilla JavaScript
- No frameworks, no build step, no dependencies
- Canvas API for mosaic rendering and camera processing
- LocalStorage for session persistence
- MediaDevices API for camera access

### Project Structure
```
├── index.html              # Main application
├── css/
│   └── styles.css          # All styling
├── js/
│   ├── utils.js            # Utility functions
│   ├── mosaic-generator.js # Plate generation
│   ├── color-filter.js     # Filter calculations
│   ├── test-engine.js      # Test flow management
│   ├── tuning-engine.js    # Auto-tuning logic
│   ├── camera-overlay.js   # Camera handling
│   ├── storage.js          # LocalStorage management
│   ├── export.js           # CSV/JSON export
│   └── app.js              # Main controller
├── CNAME                   # GitHub Pages domain
├── LICENSE                 # MIT License
└── README.md               # This file
```

### GitHub Pages Deployment
This app is designed specifically for GitHub Pages:
- No server-side code required
- Single-page architecture with hash-based navigation awareness
- Works with page reloads
- All assets are static files

## Browser Support

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 11+
- ✅ Edge 79+

Camera features require HTTPS (automatic on GitHub Pages).

## Data Export Format

### JSON Export
Complete session data including:
- Session metadata and timestamps
- Device/environment info (non-identifying)
- Baseline and post-tune results
- Per-plate outcomes with response times
- Final filter parameters

### CSV Export
Tabular format with:
- Results summary
- Filter parameters
- Individual plate responses

## Privacy

- **No accounts required**
- **No data sent to servers**
- **All processing happens in your browser**
- **Data stored only in your browser's LocalStorage**
- **"Clear Data" option available**

## Development

No build step required. Simply:

1. Clone the repository
2. Open `index.html` in a browser, or
3. Serve with any static file server:
   ```bash
   python -m http.server 8000
   # or
   npx serve .
   ```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## Acknowledgments

- JLTTCK Active Filter mosaic test methodology
- Color confusion palettes based on deuteranomaly research
- Filter algorithms adapted from color vision accessibility studies
