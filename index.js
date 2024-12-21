import { Client, GatewayIntentBits, REST, Routes, EmbedBuilder } from "discord.js";
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { PermissionsBitField } from "discord.js"; 

dotenv.config(); 

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/codejam'; 

if (!uri) {
    console.error('MongoDB connection string is undefined. Please check your environment variables.');
    process.exit(1);
}

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers]
});

const roleSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    githubRepo: { type: String, required: true },
    githubUsernames: { type: [String], default: [] }, 
    status: { type: String, default: '' },
    marks: { type: [Number], default: [] },
});

const Role = mongoose.model('Role', roleSchema);

const commands = [
    {
        name: 'addroledata',
        description: 'Add additional data for a specific role',
        options: [
            {
                type: 3,
                name: 'role_name',
                description: 'Team Name (The role associated)',
                required: true,
            },
            {
                type: 3,
                name: 'github_repo',
                description: 'The GitHub repository associated with the role',
                required: false, 
            },
            {
                type: 3,
                name: 'github_usernames',
                description: 'Comma-separated list of GitHub usernames',
                required: false, 
            },
            {
                type: 3,
                name: 'status',
                description: 'Status of the team',
                required: false,
            },
        ],
    },
    {
        name: 'showroledata',
        description: 'Show additional data for a specific role',
        options: [
            {
                type: 3,
                name: 'role_name',
                description: 'The name of the role',
                required: true,
            },
        ],
    },
    {
        name: 'setstatus',
        description: 'Set the status for a specific role',
        options: [
            {
                type: 3,
                name: 'role_name',
                description: 'The name of the role',
                required: true,
            },
            {
                type: 3,
                name: 'status',
                description: 'New status for the role',
                required: true,
            },
        ],
    },
    {
        name: 'setmarks',
        description: 'Set marks for a specific role',
        options: [
            {
                type: 3,
                name: 'role_name',
                description: 'The name of the role',
                required: true,
            },
            {
                type: 3,
                name: 'marks',
                description: 'Comma-separated list of marks (3 entries)',
                required: true,
            },
        ],
    },
];

const token = process.env.TOKEN; 
const clientId = process.env.CLIENT_ID; 
const guildId = process.env.GUILD_ID; 
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
            body: commands,
        });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
})();

client.login(token);

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    const guild = client.guilds.cache.get(guildId);
    if (guild) {
        await guild.members.fetch();
        console.log(`Fetched ${guild.memberCount} members from the guild.`);
    }
});

client.on('guildMemberAdd', member => {
    console.log(`New member joined: ${member.user.username}`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options } = interaction;
    const hasPermission = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) || 
                          interaction.member.roles.cache.some(role => role.name === "CT25");

    if (commandName === 'setmarks') {
        const roleName = options.getString('role_name');
        const marksInput = options.getString('marks')
        if (!hasPermission) {
            await interaction.reply("You do not have permission to use this command.");
            return;
        }

        const guild = interaction.guild;
        const role = guild.roles.cache.find(r => r.name === roleName);
        if (!role) {
            await interaction.reply(`The role "${roleName}" does not exist in this guild.`);
            return;
        }

        const marks = marksInput.split(',').map(mark => {
            const trimmedMark = mark.trim();
            return trimmedMark ? parseInt(trimmedMark) : null;
        });

        while (marks.length < 3) {
            marks.push(null);
        }

        const finalMarks = marks.slice(0, 3);

        try {
            const existingRoleData = await Role.findOne({ name: roleName });
            if (!existingRoleData) {
                await interaction.reply(`No data found for role "${roleName}". Please add role data first using the /addroledata command.`);
                return;
            }

            existingRoleData.marks = finalMarks;
            await existingRoleData.save();
            await interaction.reply(`Marks for role "${roleName}" have been updated to: ${finalMarks.join(', ')}.`);
        } catch (error) {
            console.error('Error updating role marks:', error);
            await interaction.reply("An error occurred while updating the role marks.");
        }
    }

    if (commandName === 'addroledata') {
        const roleName = options.getString('role_name');
        const githubRepo = options.getString('github_repo') || null;
        const githubUsernames = options.getString('github_usernames') ? options.getString('github_usernames').split(',').map(username => username.trim()) : [];
        const status = options.getString('status') || null;
        const guild = interaction.guild;
        const role = guild.roles.cache.find(r => r.name === roleName);

        if (!role) {
            await interaction.reply(`The role "${roleName}" does not exist in this guild.`);
            return;
        }

        if (!hasPermission) {
            if (!interaction.member.roles.cache.has(role.id)) {
                await interaction.reply("You do not have permission to use this command, and you do not have the specified role.");
                return;
            }
        }

        try {
            const existingRoleData = await Role.findOne({ name: roleName });
            if (existingRoleData) {
                if (githubRepo !== null) {
                    existingRoleData.githubRepo = githubRepo;
                }
                if (githubUsernames.length > 0) {
                    existingRoleData.githubUsernames = githubUsernames;
                }
                if (status !== null) {
                    existingRoleData.status = status;
                }
                await existingRoleData.save();
                await interaction.reply(`Role data for "${roleName}" has been updated.`);
            } else {
                const roleData = new Role({
                    name: roleName,
                    githubRepo: githubRepo || '',
                    githubUsernames: githubUsernames,
                    status: status || ''
                });
                await roleData.save();
                await interaction.reply(`Role data for "${roleName}" has been added.`);
            }
        } catch (error) {
            console.error('Error adding or updating role data:', error);
            await interaction.reply("An error occurred while adding or updating role data.");
        }
    }

    if (commandName === 'setstatus') {
        const roleName = options.getString('role_name');
        const newStatus = options.getString('status');

        const guild = interaction.guild;
        const role = guild.roles.cache.find(r => r.name === roleName);
        if (!role) {
            await interaction.reply(`The role "${roleName}" does not exist in this guild.`);
            return;
        }

        if (!hasPermission) {
            if (!interaction.member.roles.cache.has(role.id)) {
                await interaction.reply("You do not have permission to use this command, and you do not have the specified role.");
                return;
            }
        }

        try {
            const existingRoleData = await Role.findOne({ name: roleName });
            if (!existingRoleData) {
                await interaction.reply(`No data found for role "${roleName}". Please add role data first using the /addroledata command.`);
                return;
            }

            existingRoleData.status = newStatus;
            await existingRoleData.save();
            await interaction.reply(`Status for role "${roleName}" has been updated to: "${newStatus}".`);
        } catch (error) {
            console.error('Error updating role status:', error);
            await interaction.reply("An error occurred while updating the role status.");
        }
    }

    if (commandName === 'showroledata') {
        const roleName = options.getString('role_name');
        if (!hasPermission) {
            const guild = interaction.guild;
            const role = guild.roles.cache.find(r => r.name === roleName);
            if (!role || !interaction.member.roles.cache.has(role.id)) {
                await interaction.reply("You do not have permission to access this command.");
                return;
            }
        }

        try {
            const roleData = await Role.findOne({ name: roleName });
            if (!roleData) {
                await interaction.reply(`No data found for role "${roleName}".`);
                return;
            }

            const guild = interaction.guild;
            const role = guild.roles.cache.find(r => r.name === roleName);
            if (!role) {
                await interaction.reply(`Role "${roleName}" not found in this guild.`);
                return;
            }

            const membersWithRole = guild.members.cache.filter(member => member.roles.cache.has(role.id));
            const memberNames = membersWithRole.map(member => member.user.username).join(', ') || 'No members with this role.';

            const githubRepoLink = `https://github.com/${roleData.githubRepo}`;

            const embed = new EmbedBuilder()
                .setColor('#ff6a00')
                .setTitle(`Role Data for "${roleName}"`)
                .setDescription(`Here are the details for the role "${roleName}"`)
                .addFields(
                    { name: 'GitHub Repository:', value: `[${roleData.githubRepo}](${githubRepoLink})` || 'Not specified' },
                    { 
                        name: 'GitHub Usernames:', 
                        value: roleData.githubUsernames.length > 0 
                            ? roleData.githubUsernames.map(username => `[${username}](https://github.com/${username})`).join(', ').replace(/,(?! )/g, ', ') 
                            : 'No usernames available' 
                    },
                    { name: 'Status:', value: roleData.status || 'No status available' },
                    { name: 'Marks:', value: roleData.marks.length > 0 
                        ? roleData.marks.join(', ') 
                        : 'No marks available' 
                    },
                    { name: 'Members with this Role:', value: memberNames }
                ).setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching role data:', error);
            await interaction.reply("An error occurred while fetching role data.");
        }
    }
});