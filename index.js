const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinding');
const express = require('express');

// Config
const botConfig = {
  host: 'JOJO_VICE-NSjr.aternos.me',
  port: 14850,
  username: 'afkbot',
  version: '1.21.8',
  auth: 'offline'
};
const targetCoords = { x: 117.6, y: 73, z: 124.4 };
const actions = ['forward', 'back', 'left', 'right'];
let bot;

// Express to keep the bot alive on Render
const app = express();
app.get('/', (req, res) => res.send('AFK Bot Running'));
app.listen(3000, () => console.log('Server is ready for Render ping'));

// Create bot
function createBot() {
  console.log('🔄 Connecting...');
  bot = mineflayer.createBot(botConfig);
  bot.loadPlugin(pathfinder);

  bot.on('login', () => {
    console.log('✅ Bot logged in');
    bot.chat('Hello! AFK bot online!');
  });

  bot.on('spawn', () => {
    console.log('🎮 Bot spawned!');
    const defaultMove = new Movements(bot);
    defaultMove.allowParkour = true;
    defaultMove.allowSprinting = true;
    bot.pathfinder.setMovements(defaultMove);
    startAFK();
  });

  bot.on('end', () => {
    console.log('❌ Bot disconnected, reconnecting in 15s...');
    setTimeout(createBot, 15000);
  });

  bot.on('error', err => console.log('⚠️ Bot error:', err.message));
}

// AFK loop
function startAFK() {
  if (!bot) return;
  let lastChat = 0;

  setInterval(async () => {
    if (!bot.entity) return;

    // Random movement for AFK
    const action = actions[Math.floor(Math.random() * actions.length)];
    bot.setControlState(action, true);
    setTimeout(() => bot.setControlState(action, false), 2000);

    // Send AFK message every 5 minutes
    if (Date.now() - lastChat > 5 * 60 * 1000) {
      bot.chat('AFK ✅');
      lastChat = Date.now();
    }

    // Defend against nearby hostile mobs
    const mob = bot.nearestEntity(e => e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 5 && e.kind === 'Hostile');
    if (mob) {
      bot.lookAt(mob.position);
      bot.attack(mob);
    }

    // Check for nighttime and find nearest bed
    const timeOfDay = bot.time.timeOfDay;
    if (timeOfDay >= 13000 && timeOfDay <= 23000) { // Nighttime
      const bed = bot.nearestEntity(e => e.type === 'object' && e.objectType === 'Bed');
      if (bed) {
        bot.chat('Attempting to sleep...');
        const bedPos = bed.position;
        const goal = new goals.GoalNear(bedPos.x, bedPos.y, bedPos.z, 1);
        bot.pathfinder.setGoal(goal);
        if (bot.entity.position.distanceTo(bedPos) < 2) {
          try {
            await bot.sleep(bot.blockAt(bedPos));
            bot.chat('Sleeping...');
          } catch (err) {
            bot.chat('Could not sleep: ' + err.message);
          }
        }
      }
    } else {
      // Move to target coordinates during daytime
      if (bot.entity.position.distanceTo(targetCoords) > 1) {
        const goal = new goals.GoalNear(targetCoords.x, targetCoords.y, targetCoords.z, 1);
        bot.pathfinder.setGoal(goal);
      }
    }
  }, 10000);
}

// Start bot
createBot();
