const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const cmd = require('mineflayer-cmd').plugin;
const fs = require('fs');
const express = require('express');

// Keep-Alive Render
const app = express();
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('🌐 Render Keep-Alive active'));

const config = JSON.parse(fs.readFileSync('config.json'));
const host = config.ip;
const port = config.port;
const username = config.name;
const nightskip = config['auto-night-skip'] === "true";

let bot;
let connected = false;
let lastChat = 0;
const actions = ['forward', 'back', 'left', 'right'];

function createBot() {
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
    console.log("✅ Logged In");
    connected = true;
    bot.chat("Hello, AFK bot 🤖");
  });

  bot.on('spawn', () => {
    connected = true;
  });

  bot.on('death', () => bot.emit("respawn"));

  // الدفاع التلقائي عن البوت
  bot.on('entityHurt', (entity) => {
    if (!entity.type === 'mob') return;
    bot.attack(entity);
  });

  // حركة AFK + النوم
  setInterval(async () => {
    if (!connected) return;

    // حركة عشوائية قصيرة
    const action = actions[Math.floor(Math.random() * actions.length)];
    bot.setControlState(action, true);
    setTimeout(() => bot.setControlState(action, false), 2000);

    // رسالة AFK كل 5 دقائق
    if (Date.now() - lastChat > 5 * 60 * 1000) {
      bot.chat("AFK ✅");
      lastChat = Date.now();
    }

    // النوم تلقائيًا إذا الليل
    if (nightskip && bot.time.timeOfDay >= 13000 && !bot.isSleeping) {
      const bed = bot.findBlock({
        matching: b => b.name.includes('bed'),
        maxDistance: 64
      });
      if (bed) {
        const goal = new goals.GoalBlock(bed.position.x, bed.position.y, bed.position.z);
        bot.pathfinder.setMovements(new Movements(bot));
        bot.pathfinder.goto(goal).then(() => bot.sleep(bed).catch(() => {})).catch(() => {});
      }
    }
  }, 10000);

  bot.on('end', () => {
    console.log("❌ Bot disconnected, reconnecting in 30s...");
    connected = false;
    setTimeout(createBot, 30000);
  });

  bot.on('error', (err) => {
    console.log("⚠️ Error:", err.message);
  });
}

// بدء التشغيل بعد 10 ثواني
setTimeout(createBot, 10000);
