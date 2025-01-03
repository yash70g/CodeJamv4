# Team Management Discord Bot

A Discord bot designed to manage team roles, GitHub repositories, and team statuses for coding competitions or collaborative projects. The bot stores team data in MongoDB and provides various commands for managing team information.

## Features

- Manage team roles and their associated data
- Track GitHub repositories for each team
- Store team member GitHub usernames
- Set and update team status
- Record and display team marks/scores
- View comprehensive team information through Discord embeds

## Prerequisites

- Node.js (v14 or higher)
- MongoDB instance
- Discord Bot Token
- Discord Server (Guild) with administrative permissions

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id
GUILD_ID=your_discord_server_id
MONGODB_URI=your_mongodb_connection_string
```

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Set up your environment variables
4. Start the bot:
```bash
node index.js
```

## Commands

### `/addroledata`
Add or update team information
- `role_name`: Team name (required)
- `github_repo`: GitHub repository URL (optional)
- `github_usernames`: Comma-separated list of GitHub usernames (optional)
- `status`: Team status (optional)

### `/showroledata`
Display team information in an embedded message
- `role_name`: Team name (required)

### `/setstatus`
Update team status
- `role_name`: Team name (required)
- `status`: New status message (required)

### `/setmarks`
Set team marks/scores (Admin only)
- `role_name`: Team name (required)
- `marks`: Comma-separated list of three marks (required)

## Permissions

- Administrators have access to all commands
- Team members can only view and modify their own team's data
- Only administrators can set marks

## Database Schema

The bot uses MongoDB with the following schema for team data:

```javascript
{
    name: String,           // Team name (required, unique)
    githubRepo: String,     // GitHub repository URL
    githubUsernames: Array, // List of GitHub usernames
    status: String,         // Team status
    marks: Array           // Team marks/scores
}
```

## Error Handling

The bot includes error handling for:
- Invalid role names
- Missing permissions
- Database connection issues
- Invalid command inputs

## Dependencies

- discord.js
- mongoose
- dotenv

## Contributing

1. Fork the repository
2. Create a new branch for your feature
3. Submit a pull request

## License

This project is open source and available under the MIT License.
