# Agent OS

A lightweight operating system for AI agents, based on [buildermethods/agent-os](https://github.com/buildermethods/agent-os). Here I added my own customizations to the original project.

## Overview

Agent OS provides a structured framework for managing AI agent configurations, commands, and workflows through a profile-based system.

## Structure

```text
agent-os/
├── profiles/          # Agent profiles and configurations
│   └── default/       # Default profile
│       ├── agents/    # Agent definitions
│       ├── commands/  # Custom commands
│       ├── standards/ # Coding standards and guidelines
│       └── workflows/ # Workflow definitions
└── scripts/           # Utility scripts
```

## Getting Started

1. Clone this repository
2. Navigate to `profiles/default/` to configure your agents
3. Add custom commands in the `commands/` directory
4. Define workflows in the `workflows/` directory

# Updating Agent OS

To update Agent OS, run the following command:

```bash
curl -sSL "https://raw.githubusercontent.com/buildermethods/agent-os/main/scripts/base-install.sh" | bash
```

## License

See the original [agent-os](https://github.com/buildermethods/agent-os) project for licensing information.
