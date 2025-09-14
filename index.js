const mineflayer = require('mineflayer');
const cmd = require('mineflayer-cmd').plugin;
const express = require('express');

// Config
const botConfig = {
  host: 'JOJO_VICE-NSjr.aternos.me', // ضع هنا IP السيرفر
  port: 14850,               // ضع هنا المنفذ
  username: 'afkbot',        // اسم البوت
  version: '1.21.8',
  auth: 'offline'
};

const targetCoords = { x: 117.6, y: 73, z: 124.4 }; // إحداثيات تقريبية
const actions = ['forward', 'back', 'left', 'right'];

let bot;

// Express لتجنب توقف Render
const app = express();
app.get('/', (req, res) => res.send('AFK Bot Running'));
app.listen(3000, () => console.log('Server is ready for Render ping'));

// إنشاء البوت
function createBot() {
  console.log('🔄 Connecting...');
  bot = mineflayer.createBot(botConfig);
  bot.loadPlugin(cmd);

  bot.on('login', () => {
    console.log('✅ Bot logged in');
    bot.chat('Hello! AFK bot online!');
  });

  bot.on('spawn', () => {
    console.log('🎮 Bot spawned!');
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

  setInterval(() => {
    if (!bot.entity) return;

    // حركة قصيرة عشوائية
    const action = actions[Math.floor(Math.random() * actions.length)];
    bot.setControlState(action, true);
    setTimeout(() => bot.setControlState(action, false), 2000);

    // رسالة AFK كل 5 دقائق
    if (Date.now() - lastChat > 5 * 60 * 1000) {
      bot.chat('AFK ✅');
      lastChat = Date.now();
    }

    // الدفاع عن نفسه
    const mob = Object.values(bot.entities).find(e => e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 5);
    if (mob) {
      bot.attack(mob);
    }

    // الذهاب إلى الإحداثيات المحددة
    if (bot.entity.position.distanceTo(targetCoords) > 1) {
      moveTowards(targetCoords);
    }

    // النوم على أقرب سرير عند الليل إذا أحد اللاعبين نائم
    const timeOfDay = bot.time.timeOfDay;
    if (timeOfDay >= 13000 && timeOfDay <= 23000) { // الليل
      const bed = Object.values(bot.entities).find(e => e.type === 'object' && e.mobType === 'bed');
      if (bed) {
        bot.chat('/msg Attempting to sleep...');
        moveTowards({ x: bed.position.x, y: bed.position.y, z: bed.position.z });
        setTimeout(() => bot.chat('/sleep'), 2000);
      }
    }

  }, 10000);
}

// تحريك البوت تقريبياً نحو الإحداثيات
function moveTowards(coords) {
  if (!bot.entity) return;
  const pos = bot.entity.position;
  if (coords.x > pos.x) bot.setControlState('forward', true);
  else bot.setControlState('back', true);
  if (coords.z > pos.z) bot.setControlState('right', true);
  else bot.setControlState('left', true);

  setTimeout(() => {
    bot.setControlState('forward', false);
    bot.setControlState('back', false);
    bot.setControlState('left', false);
    bot.setControlState('right', false);
  }, 2000);
}

// بدء البوت
createBot();
