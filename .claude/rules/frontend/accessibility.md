# Accessibility (a11y) Guidelines

## Semantic HTML

-   Use semantic elements (`<button>`, `<nav>`, `<main>`, `<article>`)
-   Never use `<div>` for interactive elements
-   Use heading hierarchy correctly (h1 → h2 → h3)

## Interactive Elements

-   All interactive elements must be keyboard accessible
-   Focus states must be visible
-   Click handlers on non-button elements need `role` and `tabIndex`

## Images and Media

-   All `<img>` must have `alt` attribute
-   Decorative images: `alt=""`
-   Videos should have captions/transcripts

## Forms

-   All inputs must have associated `<label>`
-   Error messages linked with `aria-describedby`
-   Required fields marked with `aria-required`

## Color and Contrast

-   Minimum contrast ratio: 4.5:1 for normal text
-   Don't convey information with color alone
