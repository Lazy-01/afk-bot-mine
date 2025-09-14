const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const express = require('express');

// إعدادات البوت
const botConfig = {
  host: 'JOJO_VICE-NSjr.aternos.me', // غيرها لو السيرفر مختلف
  port: 14850,
  username: 'afkbot',
  version: '1.21', // 1.21 يغطي 1.21.8 عادي
  auth: 'offline'
};

const targetCoords = { x: 117.6, y: 73, z: 124.4 };
const actions = ['forward', 'back', 'left', 'right'];
let bot;

// Express server عشان Render يضل يصحي البوت
const app = express();
app.get('/', (req, res) => res.send('✅ AFK Bot is running!'));
app.listen(3000, () => console.log('🌐 Webserver ready for Render ping'));

// إنشاء البوت
function createBot() {
  console.log('🔄 Connecting to server...');
  bot = mineflayer.createBot(botConfig);
  bot.loadPlugin(pathfinder);

  bot.on('login', () => {
    console.log('✅ Bot logged in');
    bot.chat('AFK bot online 😎');
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

  bot.on('error', err => {
    console.log('⚠️ Error:', err.message);
  });
}

// حلقة AFK
function startAFK() {
  if (!bot) return;
  let lastChat = 0;

  setInterval(async () => {
    if (!bot.entity) return;

    // حركة عشوائية
    const action = actions[Math.floor(Math.random() * actions.length)];
    bot.setControlState(action, true);
    setTimeout(() => bot.setControlState(action, false), 2000);

    // رسالة كل 5 دقايق
    if (Date.now() - lastChat > 5 * 60 * 1000) {
      bot.chat('AFK ✅');
      lastChat = Date.now();
    }

    // الدفاع ضد الموبز القريبة
    const mob = bot.nearestEntity(
      e => e.type === 'mob' && e.kind === 'Hostile' && e.position.distanceTo(bot.entity.position) < 5
    );
    if (mob) {
      try {
        await bot.lookAt(mob.position, true);
        bot.attack(mob);
      } catch (err) {
        console.log('⚔️ Attack failed:', err.message);
      }
    }

    // وقت الليل → حاول ينام
    const timeOfDay = bot.time.timeOfDay;
    if (timeOfDay >= 13000 && timeOfDay <= 23000) {
      const bed = bot.nearestEntity(e => e.name?.toLowerCase().includes('bed'));
      if (bed) {
        bot.chat('🛏️ Trying to sleep...');
        const bedPos = bed.position;
        const goal = new goals.GoalNear(bedPos.x, bedPos.y, bedPos.z, 1);
        bot.pathfinder.setGoal(goal);

        if (bot.entity.position.distanceTo(bedPos) < 2) {
          try {
            await bot.sleep(bot.blockAt(bedPos));
            bot.chat('💤 Sleeping...');
          } catch (err) {
            bot.chat('Could not sleep: ' + err.message);
          }
        }
      }
    } else {
      // بالنهار → روح للإحداثيات
      if (bot.entity.position.distanceTo(targetCoords) > 1) {
        const goal = new goals.GoalNear(targetCoords.x, targetCoords.y, targetCoords.z, 1);
        bot.pathfinder.setGoal(goal);
      }
    }
  }, 10000);
}

// شغل البوت
createBot();
