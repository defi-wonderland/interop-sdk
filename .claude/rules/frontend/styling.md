# Styling Conventions

## General Principles

-   Prefer CSS-in-JS or CSS Modules for scoped styles
-   Use design tokens/CSS variables for theming
-   Mobile-first responsive design

## Constraints

-   **Direct edit to visual/styling code requires approval**
-   Always propose styling changes, wait for approval
-   Never change colors, spacing, or layout without explicit request

## Responsive Design

-   Use relative units (rem, em, %) over absolute (px)
-   Define breakpoints as CSS variables or constants
-   Test all breakpoints before completion

## Theming

-   All colors should reference design tokens
-   Support light/dark mode via CSS variables
