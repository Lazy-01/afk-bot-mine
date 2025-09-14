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

const targetCoords = { x: 119, y: 74, z: 120 };
let bot;

function startBot() {
  bot = mineflayer.createBot(botConfig);
  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log('✅ البوت دخل السيرفر!');

    const defaultMove = new Movements(bot);
    defaultMove.allowParkour = true;
    defaultMove.allowSprinting = true;
    bot.pathfinder.setMovements(defaultMove);

    setInterval(async () => {
      if (!bot.entity) return;

      const timeOfDay = bot.time.timeOfDay;

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

      // النوم بالليل دائماً
      if (timeOfDay >= 13000 && timeOfDay <= 23000) {
        const bed = bot.nearestEntity(e => e.type === 'object' && e.name?.toLowerCase().includes('bed'));
        if (bed) {
          bot.chat('🛏️ الليل! راح أنام...');
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
          return;
        }
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
    // حل مشكلة طباعة [object Object]
    const msg = typeof reason === 'string' ? reason : JSON.stringify(reason);
    console.log(`❌ انطرد: ${msg}`);
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
  }, 15000);
}

// Express server عشان Render يظل صاحي
const app = express();
app.get('/', (req, res) => res.send('✅ AFK Bot شغال 24/7!'));
app.listen(3000, () => console.log('🌐 WebServer شغال على بورت 3000'));

// تشغيل البوت
startBot();
