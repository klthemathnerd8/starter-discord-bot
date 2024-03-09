require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const {
  InteractionType,
  InteractionResponseType,
  verifyKeyMiddleware,
} = require('discord-interactions');

const app = express();

const APPLICATION_ID = process.env.APPLICATION_ID;
const TOKEN = process.env.TOKEN;
const PUBLIC_KEY = process.env.PUBLIC_KEY || 'not set';
const GUILD_ID = process.env.GUILD_ID;

const discordApi = axios.create({
  baseURL: 'https://discord.com/api/',
  timeout: 3000,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Authorization',
    Authorization: `Bot ${TOKEN}`,
  },
});

const userData = {}; // Object to store user data

app.post('/interactions', verifyKeyMiddleware(PUBLIC_KEY), async (req, res) => {
  const interaction = req.body;

  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    if (interaction.data.name === 'start_timer') {
      // Handle the button click event and start the timer
      const userId = interaction.member.user.id;

      if (!userData[userId]) {
        userData[userId] = {
          username: interaction.member.user.username,
          reapCount: 0,
          wins: 0,
        };
      }

      const timerMessage = await discordApi.post(
        `/channels/${interaction.channel_id}/messages`,
        {
          content: `Timer for ${userData[userId].username}: 0 seconds`,
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 1,
                  label: 'Click me to start timer',
                  custom_id: 'start_timer_button',
                },
              ],
            },
          ],
        }
      );

      // Start the timer and update the message
      let seconds = 0;
      const intervalId = setInterval(async () => {
        seconds++;
        await discordApi.patch(
          `/channels/${interaction.channel_id}/messages/${timerMessage.data.id}`,
          {
            content: `Timer for ${userData[userId].username}: ${seconds} seconds`,
          }
        );
      }, 1000);

      // Optionally, you can store the intervalId in a data structure to later stop the timer if needed

      // Respond to the interaction
      return res.send({
        type: InteractionResponseType.DEFERRED_MESSAGE_UPDATE,
      });
    }
  }
});

// Add a function to update and sort user data and save it to a text file
function updateAndSaveUserData() {
  const sortedUserData = Object.values(userData).sort(
    (a, b) => b.wins - a.wins
  );

  const dataString = sortedUserData
    .map((user) => `${user.username} ${user.reapCount} ${user.wins}`)
    .join('\n');

  // Write data to a text file (data.txt)
  fs.writeFileSync('data.txt', dataString);
}

// Schedule the updateAndSaveUserData function to run every minute (adjust as needed)
setInterval(updateAndSaveUserData, 60000);

app.get('/register_commands', async (req, res) => {
  const slashCommands = [
    {
      name: 'start_timer',
      description: 'Starts a timer with a button click',
      options: [],
    },
    // Add other commands as needed
  ];

  try {
    await discordApi.put(
      `/applications/${APPLICATION_ID}/guilds/${GUILD_ID}/commands`,
      slashCommands
    );

    return res.send('Commands have been registered');
  } catch (e) {
    console.error(e.code);
    console.error(e.response?.data);
    return res.send(`${e.code} error from Discord`);
  }
});

app.get('/', async (req, res) => {
  return res.send('Follow documentation');
});

app.listen(8999, () => {
  console.log('Server is running on port 8999');
});
