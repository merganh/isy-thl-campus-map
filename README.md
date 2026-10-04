# ISY THL Campus Map

An interactive campus map application for Technische Hochschule Lübeck (THL) featuring animated visualizations, interactive quizzes, and gamification elements.

## Features

- **Interactive Campus Map**: SVG campus map with an animated intro and smooth zoom and pan controls
- **Building Information**: Detailed information for each building including opening hours and descriptions
- **Native Quiz Engine**: 10 self-contained quizzes covering several interaction types:
  - Single choice and multiple choice (with modern card-style options)
  - Memory pair-matching game
  - Drag-and-drop sorting (with up/down arrow alternative)
  - Image grid "find the odd ones out"
  - Word search puzzle
  - Image hotspot (click on regions of an image)
  - Crossword puzzle
- **Gamification System**:
  - Badge system with 3 unlockable achievements
  - Progress tracking with localStorage persistence
  - Visual notifications for earned badges
- **Customizable Filters**:
  - Toggle visibility of map elements (quiz markers, bike stations, bus stops, cafés, buttons)
  - "Toggle All" feature for quick show/hide of all filters
  - Filter preferences saved to localStorage
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Additional Features**:
  - Coffee shop locations
  - Bicycle repair station markers
  - Bus stop information with route details
  - Quick access buttons (FabLab, cafeteria menu, campus tour, etc.)

## Tech Stack

- **Frontend**: Pure HTML, CSS, JavaScript (no framework, no build step)
- **UI Framework**: Bootstrap 5.3.2 (CDN) for responsive components and modals
- **Animation**: Web Animations API directly on the map SVG (no animation library)
- **Icons**: Font Awesome 5.15.4
- **Quiz utility libraries** (all loaded from CDN, MIT licensed):
  - [SortableJS](https://github.com/SortableJS/Sortable) — drag-and-drop for the sort quiz
  - [wordfind](https://github.com/bunkat/wordfind) — word-search grid generation
  - [crossword-layout-generator](https://github.com/MichaelWehar/Crossword-Layout-Generator) — auto crossword layout

## Project Structure

```
isy-thl-campus-map/
├── index.html           # Main HTML file
├── css/
│   └── style.css       # Application styles
├── js/
│   ├── config.js       # Configuration data (buildings, quizzes, badges)
│   └── main.js         # Application logic, quiz engine, badge system
├── assets/
│   ├── campus_map.svg          # Static campus map SVG
│   ├── badge_*.svg             # Badge SVG assets
│   └── [building & quiz images]
└── README.md
```

## Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/isy-thl-campus-map.git
   cd isy-thl-campus-map
   ```

2. **Serve the application** (required due to CORS restrictions):
   ```bash
   npx serve
   ```
   Or use any other local server:
   ```bash
   python -m http.server 3000
   # or
   php -S localhost:3000
   ```

3. **Open in browser**:
   Navigate to `http://localhost:3000`

There is no build step — files are served as-is and all dependencies come from CDNs.

## Deployment

The live site (https://www.hm-techlab.de/campus-map/) is a git checkout of `main` on the IONOS webspace. To deploy, push to `main` and pull on the server:

```bash
ssh ionos 'cd campus-map && git pull --ff-only'
```

`ionos` is an SSH host alias (`~/.ssh/config`, key-based login). Apache already answers requests for `.git/` with 403.

## Usage

### Navigation
- **Pan**: Click and drag on the map
- **Zoom**: Use mouse wheel or pinch gestures (mobile)
- **Skip Intro**: Press any key or tap the screen during the intro animation

### Interacting with Elements
- **Buildings**: Click on any building to view detailed information
- **Quiz Markers**: Click on question marks to start a quiz
- **Buttons**: Access quick links to various campus resources
- **Coffee Shops**: View café locations and opening hours
- **Bike Stations**: Find bicycle repair stations
- **Bus Stops**: Check bus routes and schedules

### Settings
- Access settings via the gear icon in the top-right corner
- Toggle individual map element categories
- Use "Toggle All" to show/hide all elements at once
- Reset progress (confirmation dialog) clears completed quizzes and badges

### Badges
- View earned badges via the medal icon in the top-right corner
- Badges are earned by completing quizzes:
  - **Stay Curious**: Complete your first quiz
  - **Challenge Accepted**: Complete 5 quizzes
  - **Campus Expert**: Complete all 10 quizzes

## Development

### Key Files

- **`js/config.js`**: Configuration data including:
  - Quiz definitions (id, title, type, question, options/items/pairs/hotspots…)
  - Building information
  - Filter configurations
  - Badge definitions

- **`js/main.js`**: Application logic including:
  - Map loading and intro animation (`runMapIntro`)
  - Filter system
  - Event handlers for map interactions
  - Quiz engine (renderers, interaction logic, validation)
  - Badge system

- **`css/style.css`**: All styling, including responsive rules and quiz-specific layouts

### Adding or Editing Quizzes

Each quiz in `quizModals` (in `js/config.js`) has a `content` object whose `type` selects the renderer:

| `type`        | Used for                                  | Required fields                                      |
|---------------|-------------------------------------------|------------------------------------------------------|
| `radio`       | single-choice question                    | `question`, `options[{ text, correct }]`             |
| `checkbox`    | multiple-choice (incl. "all wrong" trick) | `question`, `options[{ text, correct }]`             |
| `memory`      | pair-matching memory game                 | `pairs[{ image, label }]`                            |
| `sort`        | drag/arrow sortable list                  | `question`, `items[]` (in correct order)             |
| `imageGrid`   | select correct images from a grid         | `question`, `columns`, `options[{ image, label, correct }]` |
| `wordsearch`  | word search puzzle                        | `question`, `width`, `height`, `words[{ display, search }]` |
| `hotspot`     | click correct regions in an image         | `question`, `image`, `hotspots[{ x, y, radius, label }]` (percent coords) |
| `crossword`   | crossword puzzle                          | `question`, `words[{ answer, clue }]`                |

The quiz `id` (e.g. `'Frage'`, `'Frage2'`) is the unique key used to track completion in localStorage and to identify the marker on the map.

### Languages (German / English)

German is the default. Users switch via the `DE | EN` toggle next to the gear icon or in the settings panel; the choice is stored and the page reloads without replaying the intro. For embeds, `?lang=en` (or `?lang=de`) in the URL forces a language.

- **`js/i18n.js`**: language detection, `t('key')` for UI strings (`UI_STRINGS.de` / `UI_STRINGS.en`), `data-i18n*` attributes for static text in `index.html`
- **`js/content_en.js`**: English texts for quizzes, buildings, filters and badges, laid over `js/config_v2.js` at load time. It mirrors the German structure with text fields only; arrays are merged by index, so keep order and length in sync when editing the German content. Missing entries simply fall back to German.

Text baked into the map graphic (SVG) stays German.

### Local Storage

The application persists state under these keys:
- `quiz_completed_ids` — array of completed quiz IDs (string IDs like `Frage`, `Frage2`, …)
- `filter_settings` — visibility preferences for map element categories
- `campusmap_lang` — selected language (`de` / `en`)

### Customization

To customize the map:
1. Update building data in `js/config.js`
2. Add/modify images in the `assets/` folder
3. The intro animates `assets/campus_map_v2.svg` directly (`runMapIntro` in `js/main.js`): new buildings join the area they sit in, new top-level layers fade in at the end – no extra work needed
4. Edit individual quizzes by tweaking their entry in `quizModals` (in `js/config.js`)

For the image hotspot quiz, set `debug: true` on the quiz config to visualize hotspot zones and log click coordinates to the browser console — useful for tuning positions.
