const mineflayer = require('mineflayer');
const cmd = require('mineflayer-cmd').plugin;
const fs = require('fs');
const express = require('express');

// Keep-Alive للـ Render/Replit
const app = express();
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('🌐 Express server running for Keep-Alive'));

// قراءة الإعدادات من config.json
let config = JSON.parse(fs.readFileSync('config.json'));
let host = config.ip;
let port = config.port;
let username = config.name;
let nightskip = config['auto-night-skip'] === "true";

let bot;
let connected = false;
let lastChat = 0;
let moving = false;
let lastAction;
const actions = ['forward', 'back', 'left', 'right'];
const moveInterval = 2; // seconds
const maxRandom = 5;
const pi = 3.14159;
let defend = true; // true = يهاجم الوحوش تلقائي، false = لا
let targetCoords = null;

function createBot() {
  console.log(`🔄 Connecting to ${host}:${port} as ${username} (v1.21.8)`);

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
    bot.chat("Hello, AFK bot 🤖");
    connected = true;
  });

  bot.on('spawn', () => {
    connected = true;
  });

  bot.on('death', () => {
    bot.emit("respawn");
    console.log("☠️ Bot died, respawning...");
  });

  // حركة AFK عشوائية + رسائل AFK
  setInterval(() => {
    if (!connected) return;

    // حركة قصيرة عشوائية
    let action = actions[Math.floor(Math.random() * actions.length)];
    bot.setControlState(action, true);
    setTimeout(() => bot.setControlState(action, false), 2000);

    // رسالة AFK كل 5 دقائق
    if (Date.now() - lastChat > 5 * 60 * 1000) {
      bot.chat("AFK ✅");
      lastChat = Date.now();
    }

    // إذا حددنا إحداثيات يتحرك لها
    if (targetCoords && bot.pathfinder) {
      bot.pathfinder.goto(targetCoords).catch(()=>{});
    }

  }, 10000);

  // أوامر شات
  bot.on('chat', (usernameChat, message) => {
    if (usernameChat === username) return; // تجاهل رسائل البوت نفسه
    const args = message.split(" ");

    // الذهاب لإحداثيات معينة
    if (args[0] === "!goto" && args.length === 4) {
      let x = parseFloat(args[1]);
      let y = parseFloat(args[2]);
      let z = parseFloat(args[3]);
      targetCoords = { x, y, z };
      bot.chat(`🧭 Moving to ${x}, ${y}, ${z}`);
    }

    // تفعيل/تعطيل الدفاع
    if (args[0] === "!defend") {
      if (args[1] === "on") {
        defend = true;
        bot.chat("🛡️ Defense enabled");
      } else if (args[1] === "off") {
        defend = false;
        bot.chat("🛡️ Defense disabled");
      }
    }
  });

  bot.on('end', () => {
    console.log("❌ Bot disconnected, reconnecting in 30s...");
    connected = false;
    setTimeout(() => createBot(), 30000);
  });

  bot.on('error', (err) => {
    console.log("⚠️ Error:", err.message);
  });
}

// بدء التشغيل بعد 10 ثوانٍ للتأكد أن السيرفر جاهز
setTimeout(() => createBot(), 10000);
