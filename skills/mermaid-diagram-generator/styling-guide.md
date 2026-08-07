# Styling Guide

HTML and CSS customization options for diagram HTML files.

## Base HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Diagram Title</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <style>
        /* Styles here */
    </style>
</head>
<body>
    <h1>Main Title</h1>
    <p class="subtitle">Optional subtitle or description</p>

    <div class="diagram-container">
        <div class="mermaid">
            <!-- Mermaid diagram code -->
        </div>
    </div>

    <div class="key-points">
        <h2>Key Points</h2>
        <!-- Documentation -->
    </div>

    <script>
        mermaid.initialize({
            startOnLoad: true,
            theme: 'default'
        });
    </script>
</body>
</html>
```

## CSS Styles

### Modern, Clean Design

```css
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
                 Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif;
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
    background: #f5f5f5;
    line-height: 1.6;
    color: #333;
}

h1 {
    color: #333;
    text-align: center;
    margin-bottom: 10px;
    font-size: 2rem;
}

.subtitle {
    text-align: center;
    color: #666;
    margin-bottom: 30px;
    font-size: 14px;
}

.diagram-container {
    background: white;
    border-radius: 8px;
    padding: 30px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    overflow-x: auto;
    margin-bottom: 20px;
}

.key-points {
    background: white;
    border-radius: 8px;
    padding: 20px 30px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.key-points h2 {
    color: #333;
    margin-top: 0;
    border-bottom: 2px solid #e0e0e0;
    padding-bottom: 10px;
}

.key-points h3 {
    color: #555;
    margin-top: 25px;
}

.key-points ul,
.key-points ol {
    line-height: 1.8;
    color: #555;
}

.key-points li {
    margin-bottom: 8px;
}

.key-points strong {
    color: #333;
}

.key-points code {
    background: #f5f5f5;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Monaco', 'Courier New', monospace;
    font-size: 0.9em;
}
```

### Dark Mode Support

```css
@media (prefers-color-scheme: dark) {
    body {
        background: #1a1a1a;
        color: #e0e0e0;
    }

    h1 {
        color: #ffffff;
    }

    .subtitle {
        color: #999;
    }

    .diagram-container,
    .key-points {
        background: #2d2d2d;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }

    .key-points h2 {
        color: #ffffff;
        border-bottom-color: #444;
    }

    .key-points h3 {
        color: #ccc;
    }

    .key-points ul,
    .key-points ol {
        color: #bbb;
    }

    .key-points strong {
        color: #fff;
    }

    .key-points code {
        background: #3a3a3a;
        color: #e0e0e0;
    }
}
```

### Responsive Design

```css
/* Tablet */
@media (max-width: 768px) {
    body {
        padding: 15px;
    }

    h1 {
        font-size: 1.5rem;
    }

    .diagram-container,
    .key-points {
        padding: 20px;
    }
}

/* Mobile */
@media (max-width: 480px) {
    body {
        padding: 10px;
    }

    h1 {
        font-size: 1.25rem;
    }

    .diagram-container,
    .key-points {
        padding: 15px;
        border-radius: 6px;
    }

    .key-points h2 {
        font-size: 1.25rem;
    }

    .key-points h3 {
        font-size: 1.1rem;
    }
}
```

## Callout Boxes

Add styled callout boxes for important information:

```css
.phase {
    background: #f0f9ff;
    border-left: 4px solid #0284c7;
    padding: 10px 15px;
    margin: 10px 0;
    border-radius: 4px;
}

.phase-title {
    font-weight: bold;
    color: #0284c7;
    margin-bottom: 5px;
}

.warning {
    background: #fff7ed;
    border-left: 4px solid #f59e0b;
    padding: 10px 15px;
    margin: 10px 0;
    border-radius: 4px;
}

.success {
    background: #f0fdf4;
    border-left: 4px solid #10b981;
    padding: 10px 15px;
    margin: 10px 0;
    border-radius: 4px;
}

.error {
    background: #fef2f2;
    border-left: 4px solid #ef4444;
    padding: 10px 15px;
    margin: 10px 0;
    border-radius: 4px;
}
```

### Usage

```html
<div class="phase">
    <div class="phase-title">Phase 1: Setup</div>
    Description of this phase
</div>

<div class="warning">
    <strong>Warning:</strong> Important consideration
</div>

<div class="success">
    <strong>Success:</strong> Task completed
</div>

<div class="error">
    <strong>Error:</strong> Something went wrong
</div>
```

## Code Blocks

For code snippets in documentation:

```css
pre {
    background: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 15px;
    overflow-x: auto;
    font-size: 14px;
}

code {
    font-family: 'Monaco', 'Courier New', monospace;
}

pre code {
    background: none;
    padding: 0;
    border: none;
}
```

## Tables

Style tables for better readability:

```css
table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
}

th {
    background: #f5f5f5;
    border: 1px solid #e0e0e0;
    padding: 12px;
    text-align: left;
    font-weight: 600;
}

td {
    border: 1px solid #e0e0e0;
    padding: 12px;
}

tr:nth-child(even) {
    background: #fafafa;
}

tr:hover {
    background: #f0f0f0;
}
```

## Mermaid Theme Configuration

### Light Theme

```javascript
mermaid.initialize({
    startOnLoad: true,
    theme: 'default',
    themeVariables: {
        primaryColor: '#0284c7',
        primaryTextColor: '#fff',
        primaryBorderColor: '#0369a1',
        lineColor: '#64748b',
        secondaryColor: '#f59e0b',
        tertiaryColor: '#10b981',
        fontSize: '16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }
});
```

### Dark Theme

```javascript
mermaid.initialize({
    startOnLoad: true,
    theme: 'dark',
    themeVariables: {
        darkMode: true,
        primaryColor: '#3b82f6',
        primaryTextColor: '#fff',
        primaryBorderColor: '#2563eb',
        lineColor: '#94a3b8',
        secondaryColor: '#f59e0b',
        tertiaryColor: '#10b981',
        background: '#1e293b',
        mainBkg: '#1e293b',
        secondBkg: '#334155',
        fontSize: '16px'
    }
});
```

### Neutral Theme

```javascript
mermaid.initialize({
    startOnLoad: true,
    theme: 'neutral',
    themeVariables: {
        primaryColor: '#4b5563',
        primaryTextColor: '#fff',
        primaryBorderColor: '#374151',
        lineColor: '#6b7280',
        secondaryColor: '#9ca3af',
        tertiaryColor: '#d1d5db',
        fontSize: '16px'
    }
});
```

## Diagram-Specific Configurations

### Sequence Diagrams

```javascript
mermaid.initialize({
    startOnLoad: true,
    theme: 'default',
    sequence: {
        diagramMarginX: 50,
        diagramMarginY: 10,
        actorMargin: 80,
        width: 200,
        height: 65,
        boxMargin: 10,
        boxTextMargin: 5,
        noteMargin: 10,
        messageMargin: 35,
        mirrorActors: true,
        bottomMarginAdj: 1,
        useMaxWidth: true,
        rightAngles: false,
        showSequenceNumbers: false,
        actorFontSize: 14,
        actorFontFamily: '-apple-system, sans-serif',
        noteFontSize: 14,
        messageFontSize: 14
    }
});
```

### Flowcharts

```javascript
mermaid.initialize({
    startOnLoad: true,
    theme: 'default',
    flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
        diagramPadding: 8,
        nodeSpacing: 50,
        rankSpacing: 50,
        padding: 15,
        fontSize: 14
    }
});
```

### Gantt Charts

```javascript
mermaid.initialize({
    startOnLoad: true,
    theme: 'default',
    gantt: {
        titleTopMargin: 25,
        barHeight: 20,
        barGap: 4,
        topPadding: 50,
        leftPadding: 75,
        gridLineStartPadding: 35,
        fontSize: 11,
        fontFamily: '-apple-system, sans-serif',
        numberSectionStyles: 4,
        axisFormat: '%Y-%m-%d',
        tickInterval: '1 week'
    }
});
```

## Print Styles

Optimize for printing:

```css
@media print {
    body {
        background: white;
        padding: 0;
        max-width: 100%;
    }

    .diagram-container,
    .key-points {
        box-shadow: none;
        border: 1px solid #e0e0e0;
        page-break-inside: avoid;
    }

    h1 {
        page-break-after: avoid;
    }

    .key-points h2,
    .key-points h3 {
        page-break-after: avoid;
    }

    /* Avoid breaking phases */
    .phase,
    .warning,
    .success,
    .error {
        page-break-inside: avoid;
    }
}
```

## Accessibility

Improve accessibility:

```css
/* Focus styles for keyboard navigation */
a:focus,
button:focus {
    outline: 2px solid #0284c7;
    outline-offset: 2px;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
    body {
        background: white;
        color: black;
    }

    .diagram-container,
    .key-points {
        border: 2px solid black;
    }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
```

## Loading State

Add a loading indicator while Mermaid renders:

```html
<style>
    .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 200px;
        color: #666;
    }

    .loading::after {
        content: 'Loading diagram...';
        animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }

    .mermaid {
        min-height: 200px;
    }
</style>

<div class="diagram-container">
    <div class="mermaid">
        <!-- If diagram fails to render, show message -->
        <div class="loading"></div>

        <!-- Mermaid code here -->
    </div>
</div>
```

## Interactive Elements

Add tooltips or expandable sections:

```css
.tooltip {
    position: relative;
    display: inline-block;
    border-bottom: 1px dotted #999;
    cursor: help;
}

.tooltip .tooltiptext {
    visibility: hidden;
    width: 200px;
    background-color: #333;
    color: #fff;
    text-align: center;
    border-radius: 6px;
    padding: 8px;
    position: absolute;
    z-index: 1;
    bottom: 125%;
    left: 50%;
    margin-left: -100px;
    opacity: 0;
    transition: opacity 0.3s;
}

.tooltip:hover .tooltiptext {
    visibility: visible;
    opacity: 1;
}

details {
    background: #f5f5f5;
    border-radius: 4px;
    padding: 10px;
    margin: 10px 0;
}

summary {
    cursor: pointer;
    font-weight: 600;
    user-select: none;
}

summary:hover {
    color: #0284c7;
}
```

## Best Practices

1. **Mobile-First**: Design for mobile, then enhance for desktop
2. **Accessibility**: Ensure good contrast ratios (4.5:1 minimum)
3. **Performance**: Minimize CSS, use efficient selectors
4. **Dark Mode**: Support user's system preference
5. **Print-Friendly**: Ensure diagrams print well
6. **Semantic HTML**: Use proper heading hierarchy
7. **Fallbacks**: Provide loading states and error messages
8. **Consistent Spacing**: Use consistent margins and padding
9. **Readable Fonts**: Choose clear, readable font sizes (minimum 14px)
10. **Color Contrast**: Test with colorblind simulation tools
