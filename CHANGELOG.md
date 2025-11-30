# Changelog

All notable changes to CardCheckerWebsite are documented here.

## [0.2] - 2025-11-30

### Added
- Dynamic credits loader (`loadCredits()`) that fetches `data/credits.json` and renders footer content into `#siteCredits` on all pages
- `CHANGELOG.md` file to track project updates
- `README.md` with comprehensive project documentation, quick start guide, and development notes

### Changed
- Updated all page footers to use dynamic `#siteCredits` placeholder instead of static text
- **UI/Layout improvements for Aggiorna Lista page:**
  - Convert compare columns (left: original preview with highlights, right: updated list) from fixed max-width (600px) to full-width responsive layout (50% each)
  - Ensured consistent font rendering across both boxes:
    - `font-family: monospace` on both `.output-preview` and `.compare-col textarea`
    - `font-size: 14px` on both boxes
    - `line-height: 1.5` on both boxes for consistent vertical spacing
  - Fixed overflow handling: long lists now wrap within box boundaries with vertical scrolling
  - Made clickable number spans (`.num`) match exact text size by removing padding/margin and changing to `display: inline`
- Removed unused `script.js` file (navigation helper was already in `js/app.js`)

### Fixed
- Long card lists no longer flow outside the preview box boundaries
- Font size and line spacing now match between left (preview) and right (textarea) columns in Aggiorna Lista
- Clickable numbers in preview no longer appear larger than plain text


---

## [0.1] - Initial Release

### Features
- **Crea Lista:** Generate formatted card list with missing/doubles sections and timestamp
- **Aggiorna Lista:** Paste and iteratively update lists (mark missing found, add/remove doubles)
  - Side-by-side view showing original vs updated lists
  - Click-to-remove functionality on preview numbers
  - Visual highlighting for added (green) and removed (red) items
  - Validation warnings for conflicting operations
  - Cumulative editing support
- **Compara Lista:** Compare two lists and show unique doubles in each (A but not B, B but not A)
- **FAQ:** Editable FAQ content loaded from `data/faq.json`
- **Site-wide:** Green header banner, navigation buttons, responsive layout, copy-to-clipboard functionality

### Data Files
- Created `data/credits.json` with author, year, and version fields for dynamic footer rendering

---

_Generated: 2025-11-30_
