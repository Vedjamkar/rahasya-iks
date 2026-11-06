# Rahasya · रहस्य

An interactive research paper for the Indian Knowledge System course (23SVS1001R), SOC-13.

**Website:** https://vedjamkar.github.io/rahasya-iks/

The paper compares what different Indian practices protected: integrity, confidentiality, encoding, and hidden meaning or controlled access. Illustrated scenes and live figures let readers follow the argument and check the calculations.

## Technology stack

| Part | Implementation |
|---|---|
| Structure | HTML5, semantic sections and expandable full text |
| Styling | CSS3, responsive layouts, custom properties and 2.5D surfaces |
| Illustrations | Inline SVG |
| Interactions and calculations | Vanilla JavaScript, loaded as classic scripts |
| Fonts | Locally bundled Poppins, Rozha One and Tiro Sanskrit |
| Version control | Git and GitHub |
| Hosting | GitHub Pages over HTTPS |

There is no frontend framework, third-party JavaScript library, backend, database, package installation or build step. No external service APIs are called at runtime.

### Browser APIs

- **DOM and event APIs:** reader input, figure updates and in-page navigation.
- **IntersectionObserver:** scroll reveals and offscreen animation control.
- **ResizeObserver:** updating the manuscript layout and gold thread.
- **MutationObserver:** keeping explanatory views aligned with live results.
- **Web Animations API:** movement through `element.animate()`.
- **requestAnimationFrame:** coordinating animation frames and number updates.
- **matchMedia:** reduced-motion preferences and pointer capabilities.

RSA arithmetic uses JavaScript's built-in `BigInt` type. The `IKS.*` namespaces contain project-specific helpers and logic, rather than an external framework.

## Templates and reused code

No third-party website template, boilerplate or starter project is used. The site is a custom HTML, CSS, SVG and JavaScript implementation. Recitation, cipher, letter-counting and RSA logic, along with some visual helpers, were adapted from the project's earlier prototype.

## Project structure

```text
index.html          Paper, source references and static SVG explanations
css/                Design system, responsive styling and animation
js/core.js          Shared helpers
js/motifs.js        SVG motifs
js/paper.js         Reading progress, reveals and the gold thread
js/scene.js         2.5D scenes and depth
js/segments.js      Live figures and their controls
js/explain.js       Explanatory views and motion coordination
js/levels/          Earlier prototype modules supplying the reused logic
fonts/              Local font files and their licence
```

## Run locally

Open `index.html` in a browser. This is a plain static site: no installation, build step, server, or external script dependencies are needed.

Live figures require JavaScript. Static explanations and full-section research text remain readable with JavaScript disabled.

## Motion

Animations trace matching recitation occurrences and assemble the actual Katapayadi digits right to left. Motion respects reduced-motion settings and pauses outside the reading area or in a background tab.

## Research limits

- We found no cipher in the Vedas. Recitation protects a text against changes; the checksum connection is our comparison.
- The Mūladevīya table is still to be verified against Kahn or Ganguly.
- The letter-counting test uses English with a table of the same type. It is not an attack on the real table with Sanskrit text.
- Illustrations are our own explanations, not historical evidence.
- Recitation counts use one line, Ṛgveda 1.1.1, with the pattern formulas stated in the paper.
- The literature search was not exhaustive. Papers 6 and 7 remain marked as pending.
- Group names, search details and the breakdown of group contributions still need completing.
- Sources, qualifications and pending work are included in the paper.

## Publishing

GitHub Pages serves this repository from the root of `main`. The `.nojekyll` file keeps it a static deployment. Updating the site files and pushing to `main` publishes a new version.

Bundled fonts retain their license in `fonts/OFL.txt`.
