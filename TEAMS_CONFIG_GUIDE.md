# Dynamic Team Configuration System

This application now uses a dynamic team and activity configuration system that allows you to easily manage teams and their activities without modifying the code.

## Configuration File

The configuration is stored in `config/teams.json`. Here's the structure:

```json
{
  "teams": {
    "Team Name": {
      "displayName": "Display Name",
      "icon": "fas fa-icon-name",
      "activities": ["Activity 1", "Activity 2", "..."]
    }
  }
}
```

## How to Add a New Team

1. Open `config/teams.json`
2. Add a new team entry under the "teams" object:

```json
"New Team Name": {
  "displayName": "New Team Display Name",
  "icon": "fas fa-your-icon",
  "activities": [
    "Activity 1 for new team",
    "Activity 2 for new team"
  ]
}
```

## How to Add/Remove Activities

1. Open `config/teams.json`
2. Find the team you want to modify
3. Add or remove activities from the "activities" array:

```json
"Secrecy Cell": {
  "displayName": "Secrecy Cell",
  "icon": "fas fa-lock",
  "activities": [
    "Existing Activity",
    "New Activity Added Here",
    "Another New Activity"
  ]
}
```

## How to Modify Team Display Names

1. Open `config/teams.json`
2. Change the "displayName" field:

```json
"Secrecy Cell": {
  "displayName": "Updated Display Name",
  "icon": "fas fa-lock",
  "activities": [...]
}
```

## How to Change Team Icons

1. Open `config/teams.json`
2. Update the "icon" field with any Font Awesome icon class:

```json
"Secrecy Cell": {
  "displayName": "Secrecy Cell",
  "icon": "fas fa-shield-alt",
  "activities": [...]
}
```

## Available Font Awesome Icons

Some commonly used icons:

- `fas fa-lock` - Lock icon
- `fas fa-file-alt` - Document icon
- `fas fa-language` - Language icon
- `fas fa-edit` - Edit icon
- `fas fa-users` - Users icon
- `fas fa-cog` - Settings icon
- `fas fa-shield-alt` - Shield icon
- `fas fa-chart-bar` - Chart icon

## Important Notes

1. **Restart Required**: After modifying `config/teams.json`, you need to restart the server for changes to take effect.

2. **JSON Syntax**: Make sure the JSON syntax is correct. Use a JSON validator if needed.

3. **Unique Team Names**: Each team key should be unique.

4. **Activity Names**: Activity names should be descriptive and unique within a team.

## Example: Adding a New "Quality Assurance" Team

```json
{
  "teams": {
    "Secrecy Cell": { ... },
    "Generation & Vetting": { ... },
    "Translation": { ... },
    "Editing": { ... },
    "Quality Assurance": {
      "displayName": "Quality Assurance",
      "icon": "fas fa-check-circle",
      "activities": [
        "Review Process",
        "Quality Check",
        "Final Approval",
        "Documentation Review",
        "Process Improvement"
      ]
    }
  }
}
```

## Troubleshooting

1. **Server won't start**: Check JSON syntax in `config/teams.json`
2. **Teams not showing**: Verify the JSON structure matches the expected format
3. **Activities not displaying**: Check that activity names don't contain special characters that might break HTML

This system makes the application much more maintainable and allows non-technical users to update team configurations without touching the code.
