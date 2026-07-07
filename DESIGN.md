# Design System: X1 — Based on Cursor

> Tokens extracted from Cursor's actual DESIGN.md via Open Design plugin.
> All components MUST follow these tokens.

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#f2f1ed` | Page background (warm cream) |
| `--surface` | `#e6e5e0` | Cards, secondary surfaces |
| `--surface-warm` | `#ebeae5` | Button backgrounds |
| `--surface-100` | `#f7f7f4` | Lightest surface |
| `--fg` | `#26251e` | Primary text (warm near-black) |
| `--fg-2` | `rgba(38,37,30,0.9)` | Secondary text |
| `--muted` | `rgba(38,37,30,0.55)` | Muted text |
| `--meta` | `rgba(38,37,30,0.4)` | Meta text |
| `--accent` | `#f54e00` | Primary accent (orange) |
| `--accent-on` | `#ffffff` | Text on accent |
| `--border` | `rgba(38,37,30,0.1)` | Standard border |
| `--border-medium` | `rgba(38,37,30,0.2)` | Emphasized border |
| `--border-strong` | `rgba(38,37,30,0.55)` | Strong borders |
| `--success` | `#1f8a65` | Success states |
| `--danger` | `#cf2d56` | Error, hover states |
| `--warn` | `#eab308` | Warnings |

## Typography

**Display/UI:** system-ui, -apple-system, Segoe UI, Helvetica Neue, Arial, sans-serif
**Code:** ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.5 |
| Button | 14px | 400 | 1.0 |
| Caption | 11px | 500 | 1.5 |
| System Label | 13px | 500-600 | 1.33 |
| System Micro | 11px | 500 | 1.27 |

## Spacing (8px base)

`2px, 4px, 6px, 8px, 12px, 14px, 16px, 20px, 24px, 32px, 48px`

## Border Radii

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `8px` | Standard cards, buttons |
| `--radius-md` | `10px` | Featured cards |
| `--radius-lg` | `12px` | Large containers |
| `--radius-pill` | `9999px` | Pills, tags |

## Components

### Buttons (Primary)
- Background: `#ebeae5` (Surface Warm)
- Text: `#26251e`
- Padding: `10px 14px`
- Radius: `8px`
- Hover: text shifts to `#cf2d56` (danger color)
- Focus: `0 4px 12px rgba(0,0,0,0.1)`

### Cards
- Background: `#e6e5e0` or `#f2f1ed`
- Border: `1px solid rgba(38,37,30,0.1)`
- Radius: `8px`

### Inputs
- Background: transparent or surface
- Text: `#26251e`
- Padding: `8px 8px 6px`
- Border: `1px solid rgba(38,37,30,0.1)`
- Focus: border shifts to `rgba(38,37,30,0.2)`

### Pills / Tags
- Background: `#e6e5e0`
- Text: `rgba(38,37,30,0.6)`
- Radius: `9999px`
- Padding: `3px 8px`

## Elevation

| Level | Treatment |
|-------|-----------|
| Flat | none |
| Border Ring | `0 0 0 1px rgba(38,37,30,0.1)` |
| Ambient | `rgba(0,0,0,0.02) 0px 0px 16px, rgba(0,0,0,0.008) 0px 0px 8px` |
| Elevated | `rgba(0,0,0,0.14) 0px 28px 70px, rgba(0,0,0,0.1) 0px 14px 32px, 0 0 0 1px rgba(38,37,30,0.1)` |

## Motion

- Hover: `150ms ease`
- Shadow: `200ms ease`
- Focus: `rgba(0,0,0,0.1) 0px 4px 12px`

## Guidelines

### Do
- Use `#f2f1ed` as page background
- Use `#26251e` for primary text
- Use `rgba(38,37,30,0.1)` for borders
- Use `#ebeae5` for button backgrounds
- Use `#f54e00` for accent/links
- Use `#cf2d56` for hover text and errors
- Use 8px radius for cards and buttons
- Use 9999px radius for pills

### Don't
- Don't use pure white `#ffffff` for page backgrounds
- Don't use pure black `#000000` for text
- Don't use cold grays (use warm browns instead)
- Don't use blue focus rings (use warm shadows)
- Don't use border-radius outside: 8px, 10px, 12px, 9999px
