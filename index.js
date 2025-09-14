const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const express = require('express');

const botConfig = {
  host: 'JOJO_VICE-NSjr.aternos.me',
  port: 14850,
  username: 'AFK_Bot',
  version: '1.21.8',
  auth: 'offline'
};

const targetCoords = { x: 112, y: 74, z: 116 };
let bot;

function startBot() {
  bot = mineflayer.createBot(botConfig);
  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log('✅ البوت دخل السيرفر!');

    const defaultMove = new Movements(bot);
    defaultMove.allowParkour = true;
    defaultMove.allowSprinting = true;
    defaultMove.canDig = false; // ما يكسر أي بلوك
    bot.pathfinder.setMovements(defaultMove);

    // حلقة AFK + نوم
    setInterval(async () => {
      if (!bot.entity) return;

      const timeOfDay = bot.time.timeOfDay;

      // وظيفة للنوم
      async function trySleep() {
        const bed = bot.nearestEntity(e => e.type === 'object' && e.name?.toLowerCase().includes('bed'));
        if (!bed) return false;

        const bedPos = bed.position;
        bot.pathfinder.setGoal(new goals.GoalNear(bedPos.x, bedPos.y, bedPos.z, 1));
        if (bot.entity.position.distanceTo(bedPos) < 2) {
          try {
            await bot.sleep(bot.blockAt(bedPos));
            bot.chat('💤 نائم!');
            return true;
          } catch (err) {
            bot.chat('⚠️ ما قدرت أنام: ' + err.message);
            return false;
          }
        }
        return false;
      }

      // إذا فيه لاعب نايم → البوت يروح ينام فورًا
      const sleepingPlayer = bot.players && Object.values(bot.players).find(p => p.entity && p.entity.isSleeping);
      if (sleepingPlayer) {
        await trySleep();
        return;
      }

      // الليل → البوت يحاول ينام
      if (timeOfDay >= 13000 && timeOfDay <= 23000) {
        await trySleep();
        return;
      }

      // النهار → يروح للإحداثيات الهدف
      if (bot.entity.position.distanceTo(targetCoords) > 1) {
        const goal = new goals.GoalNear(targetCoords.x, targetCoords.y, targetCoords.z, 1);
        bot.pathfinder.setGoal(goal);
      }

      // حركة AFK عشوائية
      const actions = ['forward', 'back', 'left', 'right'];
      const random = actions[Math.floor(Math.random() * actions.length)];
      bot.setControlState(random, true);
      setTimeout(() => bot.setControlState(random, false), 1000);

      // لف حول نفسه
      bot.look(Math.random() * Math.PI * 2, 0);

      // رسالة شات عشوائية
      if (Math.random() > 0.7) bot.chat('✌️ AFK bot شغال!');
    }, 15000);
  });

  bot.on('kicked', (reason) => {
    console.log(`❌ انطرد: ${reason}`);
    reconnect();
  });

  bot.on('end', () => {
    console.log('⚠️ انقطع الاتصال، إعادة تشغيل...');
    reconnect();
  });

  bot.on('error', (err) => {
    console.log('⚠️ Error:', err.message);
  });
}

function reconnect() {
  setTimeout(() => {
    startBot();
  }, 5000);
}

// Express server عشان Render يظل صاحي
const app = express();
app.get('/', (req, res) => res.send('✅ AFK Bot شغال 24/7!'));
app.listen(3000, () => console.log('🌐 WebServer شغال على بورت 3000'));

// تشغيل البوت
startBot();
