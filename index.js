const mineflayer = require('mineflayer');
const fs = require('fs');
const { Vec3 } = require('vec3');

let rawdata = fs.readFileSync('config.json');
let data = JSON.parse(rawdata);

const host = data.ip;
const port = data.port;
const username = data.name;
const nightskip = data['auto-night-skip']; // "true" or "false"
const targetPos = new Vec3(117.632, 73, 124.421); // ضع هنا الإحداثيات المطلوبة

let bot;
let lastChat = 0;

function createBot() {
  console.log(`🔄 Connecting to ${host}:${port} as ${username}`);

  bot = mineflayer.createBot({
    host,
    port,
    username,
    version: false, // auto version
    auth: "offline"
  });

  bot.on('login', () => {
    console.log("✅ Bot logged in");
    bot.chat("Hello, I am AFK bot 🤖");
  });

  bot.on('spawn', () => {
    console.log("🎮 Bot spawned");
    startAFK();
  });

  bot.on('end', () => {
    console.log("❌ Bot disconnected, reconnecting in 30s...");
    setTimeout(() => createBot(), 30000);
  });

  bot.on('error', (err) => {
    console.log("⚠️ Error:", err.message);
  });

  // الدفاع عن النفس تلقائي
  bot.on('entityHurt', (entity) => {
    if (entity.type === 'mob' || entity.type === 'player') {
      bot.chat("⚔️ I'm under attack!");
    }
  });

  bot.on('physicTick', () => {
    // إذا الليل + nightskip تفعيل
    if (nightskip === "true" && bot.time.timeOfDay >= 13000) {
      // محاولة العثور على سرير للنوم
      const bed = Object.values(bot.entities).find(e => e.name === 'bed');
      if (bed) {
        bot.chat('/sleep'); // أو التوجه للسرير مباشرة
      }
    }
  });
}

function startAFK() {
  // حركة عشوائية + الذهاب للإحداثيات
  setInterval(() => {
    if (!bot.entity) return;

    // AFK chat كل 5 دقائق
    const now = Date.now();
    if (now - lastChat > 5 * 60 * 1000) {
      bot.chat("AFK ✅");
      lastChat = now;
    }

    moveTo(targetPos);

    // حركة عشوائية بسيطة
    const actions = ['forward', 'back', 'left', 'right'];
    const action = actions[Math.floor(Math.random() * actions.length)];
    bot.setControlState(action, true);
    setTimeout(() => bot.setControlState(action, false), 2000);

  }, 10000);
}

function moveTo(pos) {
  const dx = pos.x - bot.entity.position.x;
  const dy = pos.y - bot.entity.position.y;
  const dz = pos.z - bot.entity.position.z;

  if (Math.abs(dx) < 0.2 && Math.abs(dy) < 0.2 && Math.abs(dz) < 0.2) {
    bot.setControlState('forward', false);
    bot.setControlState('jump', false);
    return;
  }

  const yaw = Math.atan2(-dx, -dz);
  const pitch = Math.atan2(dy, Math.sqrt(dx*dx + dz*dz));
  bot.look(yaw, pitch, false);

  // حركة أمامية
  if (Math.abs(dx) > 0.2 || Math.abs(dz) > 0.2) {
    bot.setControlState('forward', true);
  } else {
    bot.setControlState('forward', false);
  }

  // إذا ارتفاع كبير
  if (dy > 0.5) {
    bot.setControlState('jump', true);
  } else {
    bot.setControlState('jump', false);
  }
}

// بدء البوت
createBot();
