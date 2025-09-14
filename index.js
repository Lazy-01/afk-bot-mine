const mineflayer = require('mineflayer');
const cmd = require('mineflayer-cmd').plugin;
const fs = require('fs');

// قراءة config.json
let rawdata = fs.readFileSync('config.json');
let data = JSON.parse(rawdata);

const host = data.ip;
const port = data.port;
const username = data.name;

const targetPos = { x: 100, y: 70, z: 100 }; // غيّر الإحداثيات حسب رغبتك

let bot;
let connected = false;
let lastChat = 0;

// إنشاء البوت
function createBot() {
  console.log(`🔄 Connecting to ${host}:${port} as ${username} (v1.21.1)`);

  bot = mineflayer.createBot({
    host,
    port,
    username,
    version: "1.21.1",
    auth: "offline"
  });

  bot.loadPlugin(cmd);

  bot.on('login', () => {
    console.log("✅ Logged In");
    bot.chat("Hello, I am AFK bot 🤖");
  });

  bot.on('spawn', () => {
    connected = true;
    console.log("🎮 Bot spawned!");
    moveTo(targetPos); // توجه مباشرة للإحداثيات
  });

  bot.on('death', () => {
    console.log("☠️ Bot died, respawning...");
    bot.emit('respawn');
  });

  bot.on('end', () => {
    console.log("❌ Bot disconnected, reconnecting in 10s...");
    connected = false;
    setTimeout(createBot, 10000);
  });

  bot.on('error', (err) => {
    console.log("⚠️ Error:", err.message);
  });

  // AFK حركات + chat دوري
  setInterval(() => {
    if (!bot || !bot.entity) return;

    // رسالة AFK كل 5 دقائق
    const now = Date.now();
    if (!lastChat || now - lastChat > 5 * 60 * 1000) {
      bot.chat("AFK ✅");
      lastChat = now;
    }

    // حركة عشوائية بسيطة
    const actions = ['forward', 'back', 'left', 'right'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    if (bot && typeof bot.setControlState === 'function') {
      bot.setControlState(action, true);
      setTimeout(() => {
        if (bot && typeof bot.setControlState === 'function') {
          bot.setControlState(action, false);
        }
      }, 2000);
    }

  }, 10000);
}

// التوجه للإحداثيات المحددة
function moveTo(pos) {
  if (!bot || !bot.entity) return;

  const dx = pos.x - bot.entity.position.x;
  const dy = pos.y - bot.entity.position.y;
  const dz = pos.z - bot.entity.position.z;

  const steps = 20;
  for (let i = 1; i <= steps; i++) {
    setTimeout(() => {
      if (!bot || !bot.entity) return;
      bot.look(Math.atan2(dz*i/steps, dx*i/steps), 0, false);
      if (bot && typeof bot.setControlState === 'function') {
        bot.setControlState('forward', true);
        setTimeout(() => bot.setControlState('forward', false), 500);
      }
    }, i * 300);
  }
}

// بدء التشغيل
console.log("⌛ Waiting 10s before connecting...");
setTimeout(createBot, 10000);
