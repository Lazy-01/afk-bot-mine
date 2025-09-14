const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const cmd = require('mineflayer-cmd').plugin;
const Vec3 = require('vec3');
const fs = require('fs');
const express = require('express');

// Express server for Render / Replit keep-alive
const app = express();
app.get('/', (req, res) => res.send('AFK Bot is running!'));
app.listen(3000, () => console.log('🌐 Express server running on port 3000'));

// قراءة config.json
let rawdata = fs.readFileSync('config.json');
let data = JSON.parse(rawdata);

const host = data.ip;
const port = data.port;
const username = data.name;
const nightskip = data['auto-night-skip'];

let bot;
let connected = false;
let actions = ['forward', 'back', 'left', 'right'];

// إنشاء البوت
function createBot() {
  console.log(`🔄 Connecting to ${host}:${port} as ${username} (v1.21.1)`);

  bot = mineflayer.createBot({
    host,
    port,
    username,
    version: "1.21.8",
    auth: "offline"
  });

  bot.loadPlugin(cmd);
  bot.loadPlugin(pathfinder);

  bot.on('login', () => {
    console.log('✅ Logged in!');
    bot.chat('Hello, I am AFK bot 🤖');
  });

  bot.on('spawn', () => {
    connected = true;
    console.log('🎮 Bot spawned!');
    bot.pathfinder.setMovements(new Movements(bot, require('minecraft-data')('1.21.1')));
  });

  bot.on('death', () => {
    bot.emit('respawn');
    console.log('☠️ Bot died, respawning...');
  });

  bot.on('end', () => {
    connected = false;
    console.log('❌ Bot disconnected, reconnecting in 15s...');
    setTimeout(createBot, 15000);
  });

  bot.on('error', (err) => {
    console.log('⚠️ Error:', err.message);
  });

  // حركة AFK و auto-night-skip
  setInterval(() => {
    if (!connected) return;

    // حركة عشوائية قصيرة
    const action = actions[Math.floor(Math.random() * actions.length)];
    bot.setControlState(action, true);
    setTimeout(() => bot.setControlState(action, false), 2000);

    // رسالة AFK كل 5 دقائق
    const now = Date.now();
    if (!bot.lastChat || now - bot.lastChat > 5 * 60 * 1000) {
      bot.chat('AFK ✅');
      bot.lastChat = now;
    }

    // auto-night-skip
    if (nightskip === "true" && bot.time.timeOfDay >= 13000) {
      bot.chat('/time set day');
    }
  }, 10000);

  // الدفاع عن النفس
  bot.on('entityHurt', (entity) => {
    if (entity.type === 'mob' || entity.type === 'player') {
      bot.chat('⚔️ Defending myself!');
      bot.attack(entity);
    }
  });

  // الذهاب لإحداثيات محددة
  bot.goToCoords = function(x, y, z) {
    const goal = new goals.GoalBlock(x, y, z);
    bot.pathfinder.setGoal(goal);
  };
}

// بدء التشغيل
createBot();

// مثال: اذهب إلى إحداثيات عند التشغيل بعد 20 ثانية
setTimeout(() => {
  if (connected) bot.goToCoords(100, 65, 100); // عدل الإحداثيات
}, 20000);
