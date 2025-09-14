const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const express = require('express');

const botConfig = {
  host: 'JOJO_VICE-NSjr.aternos.me',
  port: 14850,
  username: 'AFK_Bot',
  version: false,
  auth: 'offline'
};

const targetCoords = { x: 119, y: 74, z: 120 };
let bot;
let someoneSleeping = false; // حالة: في لاعب نايم أو لا

function startBot() {
  bot = mineflayer.createBot(botConfig);
  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log('✅ البوت دخل السيرفر!');

    // إعدادات الحركة
    const defaultMove = new Movements(bot);
    defaultMove.allowParkour = true;
    defaultMove.allowSprinting = true;
    defaultMove.canDig = false;   // ❌ ما يكسر
    defaultMove.canPlace = false; // ❌ ما يبني
    bot.pathfinder.setMovements(defaultMove);

    // مراقبة رسائل الشات → لو لاعب نام
    bot.on('chat', (username, message) => {
      if (username === bot.username) return;
      if (message.toLowerCase().includes('is now sleeping') || message.includes('ذهب للنوم')) {
        someoneSleeping = true;
        trySleep();
      }
    });

    // إذا صحى
    bot.on('wake', () => {
      someoneSleeping = false;
      bot.chat('☀️ صباح الخير!');
    });

    // حلقة AFK
    setInterval(() => {
      if (!bot.entity) return;

      if (!someoneSleeping) {
        // يتحرك للمكان المحدد
        if (bot.entity.position.distanceTo(targetCoords) > 1) {
          const goal = new goals.GoalNear(targetCoords.x, targetCoords.y, targetCoords.z, 1);
          bot.pathfinder.setGoal(goal, true);
        }

        // حركة عشوائية صغيرة
        const actions = ['forward', 'back', 'left', 'right'];
        const random = actions[Math.floor(Math.random() * actions.length)];
        bot.setControlState(random, true);
        setTimeout(() => bot.setControlState(random, false), 1000);

        // يلف حول نفسه
        bot.look(Math.random() * Math.PI * 2, 0);

        // رسالة عشوائية
        if (Math.random() > 0.7) bot.chat('✌️ AFK bot شغال!');
      }
    }, 15000);
  });

  bot.on('goal_reached', () => {
    console.log('📍 وصل للإحداثيات الهدف.');
  });

  bot.on('path_update', (results) => {
    if (results.status === 'noPath') {
      bot.chat('⚠️ ما قدرت أوصل، الطريق مسدود!');
    }
  });

bot.on('kicked', (reason, loggedIn) => {
  console.log(`❌ انطرد: ${JSON.stringify(reason)}`);
});


  bot.on('end', () => {
    console.log('⚠️ انقطع الاتصال، إعادة تشغيل...');
    reconnect();
  });

  bot.on('error', (err) => {
    console.log('⚠️ Error:', err.message);
  });

  async function trySleep() {
    if (bot.time.timeOfDay >= 13000 && bot.time.timeOfDay <= 23000) {
      const bed = bot.nearestEntity(e => e.type === 'object' && e.name?.toLowerCase().includes('bed'));
      if (bed) {
        const bedPos = bed.position;
        const goal = new goals.GoalNear(bedPos.x, bedPos.y, bedPos.z, 1);
        bot.pathfinder.setGoal(goal);

        if (bot.entity.position.distanceTo(bedPos) < 2) {
          try {
            await bot.sleep(bot.blockAt(bedPos));
            bot.chat('💤 نايم...');
          } catch (err) {
            bot.chat('⚠️ ما قدرت أنام: ' + err.message);
          }
        }
      }
    }
  }
}

function reconnect() {
  setTimeout(() => {
    startBot();
  }, 15000);
}

// Express server
const app = express();
app.get('/', (req, res) => res.send('✅ AFK Bot شغال 24/7!'));
app.listen(3000, () => console.log('🌐 WebServer شغال على بورت 3000'));

startBot();
