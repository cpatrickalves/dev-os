# Flow Diagram Generator Skill

A Claude Code skill for generating interactive HTML diagrams with Mermaid.js.

## Overview

This skill enables Claude to automatically create visual diagrams when discussing complex flows, architectures, or processes. The diagrams are generated as standalone HTML files that can be opened in any browser.

## Files

- **SKILL.md** - Main skill definition with triggers and instructions
- **diagram-examples.md** - Complete templates for all diagram types
- **mermaid-syntax-guide.md** - Full Mermaid.js syntax reference
- **styling-guide.md** - HTML/CSS customization options

## Activation Triggers

The skill activates when users say:
- "Create a diagram"
- "Draw a sequence diagram"
- "Show me the flow"
- "Visualize how X works"
- "Turn this into a diagram"
- "What's the architecture?"

## Supported Diagram Types

1. **Sequence Diagrams** - API flows, user journeys, webhook processes
2. **Flowcharts** - Decision trees, algorithms, process flows
3. **Entity Relationship Diagrams** - Database schemas, relationships
4. **Class Diagrams** - Component architecture, object relationships
5. **State Diagrams** - Status workflows, state machines
6. **Gantt Charts** - Project timelines, schedules
7. **Git Graphs** - Branch strategies, version history
8. **Mindmaps** - Feature planning, concept mapping
9. **Timelines** - User journeys, historical events
10. **Pie Charts** - Data distribution

## Example Usage

### User Request
"Show me how the team purchase flow works from checkout to webhook"

### Claude Response
Claude will:
1. Read relevant files (`purchase.ts`, `handle-team-purchase.ts`, `buy.tsx`)
2. Analyze the flow from user action → Stripe → webhook → database
3. Create a sequence diagram with 3 phases
4. Generate an HTML file with the diagram and documentation
5. Save to project root or specified location

### Output
```
📊 Diagram created: /path/to/team-purchase-flow.html

The diagram shows:
- Complete flow from user clicking "Buy Team" to team creation
- 3 distinct phases: Checkout Session, Payment & Team Creation, User Returns
- 7 actors: User, BuyPage, TRPC, Stripe, Webhook, Handler, Database

Open the file in your browser to view the interactive diagram.
```

## Features

- **Interactive** - Pan, zoom, and explore diagrams
- **Standalone** - No dependencies except Mermaid CDN
- **Responsive** - Works on desktop, tablet, and mobile
- **Dark Mode** - Automatic theme switching
- **Print-Friendly** - Optimized for printing
- **Documented** - Includes key points and explanations
- **Shareable** - Send HTML files to team members

## Customization

The skill supports:
- Custom themes (light, dark, neutral, forest)
- Custom colors via theme variables
- Responsive layouts
- Print styles
- Accessibility features
- Loading states

See `styling-guide.md` for full customization options.

## Development

### Adding New Templates

To add a new diagram template:

1. Add the template to `diagram-examples.md`
2. Document the syntax in `mermaid-syntax-guide.md`
3. Update `SKILL.md` with the new use case

### Testing

Test diagrams by:
1. Opening generated HTML in browser
2. Checking mobile responsiveness
3. Testing dark mode toggle
4. Verifying print preview
5. Testing with screen readers

## Best Practices

1. **Clarity** - Keep diagrams simple and focused
2. **Context** - Base diagrams on actual code, not assumptions
3. **Documentation** - Include explanatory text with diagrams
4. **Phases** - Break complex flows into logical phases
5. **Labels** - Use clear, descriptive names for actors/nodes
6. **Consistency** - Follow the same style patterns

## Troubleshooting

### Diagram Not Rendering
- Check Mermaid syntax for errors
- Ensure CDN is accessible
- Look for JavaScript console errors

### Text Overlapping
- Break long text into multiple lines with `<br/>`
- Adjust margin settings in Mermaid config
- Simplify diagram or split into multiple diagrams

### Slow Rendering
- Reduce number of nodes/connections
- Simplify complex relationships
- Split into multiple smaller diagrams

## Resources

- [Mermaid.js Documentation](https://mermaid.js.org/)
- [Mermaid Live Editor](https://mermaid.live/)
- [GitHub Mermaid Support](https://github.blog/2022-02-14-include-diagrams-markdown-files-mermaid/)

## Version

1.0.0 - Initial release
