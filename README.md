Test ID Helper – VS Code Extension

This extension automatically adds data-testid attributes to React components based on your project’s TEST_IDS structure.

Features

Detects JSX/TSX components.

Automatically inserts data-testid={TEST_IDS...}.

Supports:

Normal tags

Multiline props

Self-closing tags (e.g., <Icon />)

Skips components that already have a test ID.

Commands
Command Description
Test ID Helper: Add Test IDs Runs the test-id injection on the current file.
How It Works

Parses your React file using Babel.

Identifies JSX elements.

Injects the correct data-testid prop based on project naming conventions.

Requirements

None.

Extension Settings

No custom settings yet.

Known Issues

None right now.

Release Notes
1.0.0

Initial release with test-id auto-injection.
