const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const cmd = require('mineflayer-cmd').plugin;
const fs = require('fs');
const express = require('express');

// Keep-Alive Render
const app = express();
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('🌐 Render Keep-Alive active'));

// قراءة config.json
const config = JSON.parse(fs.readFileSync('config.json'));
const host = config.ip;
const port = config.port;
const username = config.name;
const nightskip = config['auto-night-skip'] === "true";

let bot;
let connected = false;
let lastChat = 0;
const actions = ['forward', 'back', 'left', 'right'];

// إنشاء البوت
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

  bot.on('spawn', () => connected = true);

  bot.on('death', () => bot.emit("respawn"));

  // الدفاع التلقائي
  bot.on('entityHurt', (entity) => {
    if (entity.type === 'mob') {
      bot.attack(entity);
    }
  });

  // AFK + رسائل + نوم + حركة
  setInterval(() => {
    if (!connected) return;

    // حركة قصيرة عشوائية
    const action = actions[Math.floor(Math.random() * actions.length)];
    bot.setControlState(action, true);
    setTimeout(() => bot.setControlState(action, false), 2000);

    // رسالة AFK كل 5 دقائق
    if (Date.now() - lastChat > 5 * 60 * 1000) {
      bot.chat("AFK ✅");
      lastChat = Date.now();
    }

    // auto-night-skip
    if (nightskip && bot.time.timeOfDay >= 13000 && !bot.isSleeping) {
      const bed = bot.findBlock({
        matching: b => b.name.includes('bed'),
        maxDistance: 5
      });
      if (bed) bot.sleep(bed).catch(() => {});
    }

  }, 10000);

  bot.on('end', () => {
    console.log("❌ Bot disconnected, reconnecting in 30s...");
    connected = false;
    setTimeout(createBot, 30000);
  });

  bot.on('error', (err) => console.log("⚠️ Error:", err.message));
}

// التحرك لأي إحداثيات
function goToCoords(117.632, 73.00000, 124.421) {
  const mcData = require('minecraft-data')(bot.version);
  bot.pathfinder.setMovements(new Movements(bot, mcData));
  const { GoalBlock } = goals;
  bot.pathfinder.setGoal(new GoalBlock(x, y, z));
}

// بدء التشغيل
setTimeout(createBot, 5000);

// مثال: التحرك إلى إحداثيات محددة بعد 20 ثانية
setTimeout(() => {
  if (bot && bot.pathfinder) goToCoords(100, 64, 200);
}, 20000);
