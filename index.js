const mineflayer = require('mineflayer');
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

  bot.on('login', () => {
    console.log("✅ Logged In");
    connected = true;
    bot.chat("Hello, AFK bot 🤖");
  });

  bot.on('spawn', () => connected = true);
  bot.on('death', () => bot.emit("respawn"));

  // AFK + رسائل + نوم + حركة
  setInterval(() => {
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

    // auto-night-skip (يحاول النوم)
    if (nightskip && bot.time.timeOfDay >= 13000 && !bot.isSleeping) {
      const bed = bot.findBlock({
        matching: b => b.name.includes('bed'),
        maxDistance: 5
      });
      if (bed) bot.sleep(bed).catch(() => {});
    }

  }, 10000);

  // الذهاب لإحداثيات محددة
  bot.goToCoords = function(targetX, targetY, targetZ) {
    if (!bot.entity) return;
    const interval = setInterval(() => {
      const pos = bot.entity.position;
      const dx = targetX - pos.x;
      const dz = targetZ - pos.z;
      const dy = targetY - pos.y;

      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(dz) < 0.5) {
        bot.setControlState('forward', false);
        bot.setControlState('back', false);
        bot.setControlState('left', false);
        bot.setControlState('right', false);
        bot.setControlState('jump', false);
        clearInterval(interval);
        console.log("✅ Reached target coordinates!");
        return;
      }

      bot.setControlState('forward', Math.abs(dx) > Math.abs(dz) && dx > 0);
      bot.setControlState('back', Math.abs(dx) > Math.abs(dz) && dx < 0);
      bot.setControlState('right', Math.abs(dz) >= Math.abs(dx) && dz > 0);
      bot.setControlState('left', Math.abs(dz) >= Math.abs(dx) && dz < 0);
      bot.setControlState('jump', dy > 0.5);

    }, 200);
  };

  bot.on('end', () => {
    console.log("❌ Bot disconnected, reconnecting in 30s...");
    connected = false;
    setTimeout(createBot, 30000);
  });

  bot.on('error', (err) => console.log("⚠️ Error:", err.message));
}

// بدء التشغيل
setTimeout(createBot, 5000);

// مثال استخدام الذهاب لإحداثيات (يمكنك تعديلها)
setTimeout(() => {
  if (bot) bot.goToCoords(117.632, 73.0, 124.421);

}, 20000);
