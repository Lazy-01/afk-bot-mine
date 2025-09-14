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
    defaultMove.canDig = false;
    bot.pathfinder.setMovements(defaultMove);

    setInterval(async () => {
      if (!bot.entity) return;

      const timeOfDay = bot.time.timeOfDay;

      // إيقاف حركة AFK قبل النوم
      const stopAFK = () => ['forward','back','left','right'].forEach(a => bot.setControlState(a, false));

      // ابحث عن أقرب سرير
      const bedBlock = bot.findBlock({
        matching: block => block.name.includes('bed'),
        maxDistance: 10
      });

      // لو فيه لاعب نايم → ينام فورًا
      const sleepingPlayer = Object.values(bot.players).find(p => p.entity && p.entity.isSleeping);
      if (sleepingPlayer && bedBlock) {
        stopAFK();
        try {
          await bot.pathfinder.goto(new goals.GoalBlock(bedBlock.position.x, bedBlock.position.y, bedBlock.position.z));
          await bot.sleep(bedBlock);
          if (bot.connected) bot.chat('💤 نائم مع اللاعبين!');
        } catch (err) {
          if (bot.connected) bot.chat('⚠️ ما قدرت أنام: ' + err.message);
        }
        return;
      }

      // النوم بالليل
      if (timeOfDay > 12540 && timeOfDay < 23460 && bedBlock) {
        stopAFK();
        try {
          await bot.pathfinder.goto(new goals.GoalBlock(bedBlock.position.x, bedBlock.position.y, bedBlock.position.z));
          await bot.sleep(bedBlock);
          if (bot.connected) bot.chat('💤 نائم...');
        } catch (err) {
          if (bot.connected) bot.chat('⚠️ ما قدرت أنام: ' + err.message);
        }
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
      if (Math.random() > 0.7 && bot.connected) bot.chat('✌️ AFK bot شغال!');
    }, 30000);
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
    console.log('🔄 إعادة تشغيل البوت...');
    startBot();
  }, 5000);
}

process.on('uncaughtException', (err) => {
  console.log('💥 خطأ غير متوقع:', err.message);
  reconnect();
});

process.on('unhandledRejection', (err) => {
  console.log('💥 Promise مرفوضة:', err.message);
});

const app = express();
app.get('/', (req, res) => res.send('✅ AFK Bot شغال 24/7!'));
app.listen(3000, () => console.log('🌐 WebServer شغال على بورت 3000'));

startBot();
