const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const collectBlock = require('mineflayer-collectblock').plugin;
const pvpPlugin = require('mineflayer-pvp').plugin;
const express = require('express');

const botConfig = {
  host: 'fi-01.freezehost.pro',
  port: 8387,
  username: 'AFK_Bot',
  version: '1.21.8',
  auth: 'offline'
};

const targetCoords = { x: 112, y: 74, z: 116 };
let bot;
let firstSpawn = true;
let busy = false;

function startBot() {
  bot = mineflayer.createBot(botConfig);
  bot.loadPlugin(pathfinder);
  bot.loadPlugin(collectBlock);
  bot.loadPlugin(pvpPlugin);

  bot.once('spawn', async () => {
    console.log('✅ البوت دخل السيرفر!');

    const defaultMove = new Movements(bot);
    defaultMove.allowParkour = true;
    defaultMove.allowSprinting = true;
    defaultMove.canDig = true;
    bot.pathfinder.setMovements(defaultMove);

    // أول دخول → يروح للسرير وينام
    if (firstSpawn) {
      firstSpawn = false;
      try {
        const goal = new goals.GoalBlock(targetCoords.x, targetCoords.y, targetCoords.z);
        await bot.pathfinder.goto(goal);

        const bedBlock = bot.findBlock({
          matching: b => b.name.includes('bed'),
          maxDistance: 5
        });

        if (bedBlock) {
          await bot.sleep(bedBlock);
          if (bot.connected) bot.chat('✅ ضبطت الريسباون على السرير!');
        }
      } catch (err) {
        console.log('⚠️ ما قدر يوصل/ينام:', err.message);
      }
    }

    // دوران مستمر مثل اللاعب
    setInterval(() => {
      if (!bot.entity || busy) return;
      const yaw = Math.random() * Math.PI * 2;
      const pitch = (Math.random() - 0.5) * 0.5;
      bot.look(yaw, pitch, true);
    }, 5000);
  });

  // أوامر الشات
  bot.on('chat', async (username, message) => {
    if (username === bot.username) return;

    const args = message.split(' ');
    const cmd = args.shift().toLowerCase();

    if (busy && cmd !== '!stop') {
      return bot.chat('⚠️ أنا مشغول هسه، خلص المهمة الحالية أول.');
    }

    // متابعة لاعب
    if (cmd === '!follow') {
      busy = true;
      const targetName = args[0];
      const target = bot.players[targetName]?.entity;
      if (!target) {
        bot.chat('⚠️ ما لقيت اللاعب');
        busy = false;
        return;
      }

      bot.chat(`👣 جالس أتابع ${targetName}`);
      const goal = new goals.GoalFollow(target, 2);
      bot.pathfinder.setGoal(goal, true);
    }

    // الحفر
    if (cmd === '!mine') {
      busy = true;
      const blockName = args[0];
      const amount = parseInt(args[1]);
      const x = parseInt(args[2]);
      const y = parseInt(args[3]);
      const z = parseInt(args[4]);

      if (!blockName || !amount || isNaN(x) || isNaN(y) || isNaN(z)) {
        bot.chat('⚠️ الصيغة: !mine <block> <amount> <x> <y> <z>');
        busy = false;
        return;
      }

      const oldPos = bot.entity.position.clone();
      const mcData = require('minecraft-data')(bot.version);
      const blockType = mcData.blocksByName[blockName];
      if (!blockType) {
        bot.chat('⚠️ ما عرفت البلوك هذا');
        busy = false;
        return;
      }

      try {
        const goal = new goals.GoalBlock(x, y, z);
        await bot.pathfinder.goto(goal);

        let collected = 0;
        while (collected < amount) {
          const blocks = bot.findBlocks({
            matching: blockType.id,
            maxDistance: 32,
            count: amount - collected
          });
          if (blocks.length === 0) break;

          // جهز أفضل pickaxe
          const pickaxesPriority = ['netherite_pickaxe','diamond_pickaxe','iron_pickaxe','stone_pickaxe','wooden_pickaxe'];
          const pickaxe = bot.inventory.items().sort((a,b) => pickaxesPriority.indexOf(a.name) - pickaxesPriority.indexOf(b.name))[0];
          if (pickaxe && pickaxesPriority.includes(pickaxe.name)) await bot.equip(pickaxe, 'hand');

          await bot.collectBlock.collect(blocks.map(b => bot.blockAt(b)));

          collected = bot.inventory.items().filter(i => i.name === blockName).reduce((sum,i)=>sum+i.count,0);
        }

        // كب كل شي ما عدا البلوك المطلوب
        const itemsToToss = bot.inventory.items().filter(i => i.name !== blockName);
        for (const item of itemsToToss) {
          try { await bot.tossStack(item); } catch(e){ console.log('⚠️ ما قدر يرمي:', item.name, e.message); }
        }

        // ارجع مكانه القديم
        const returnGoal = new goals.GoalBlock(Math.floor(oldPos.x), Math.floor(oldPos.y), Math.floor(oldPos.z));
        await bot.pathfinder.goto(returnGoal);

      } catch (err) {
        bot.chat('⚠️ صار خطأ بالحفر: ' + err.message);
      }
      busy = false;
    }

    // القتال
    if (cmd === '!kill') {
      busy = true;

      const mob = Object.values(bot.entities)
        .filter(e => e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 16)
        .sort((a, b) => bot.entity.position.distanceTo(a.position) - bot.entity.position.distanceTo(b.position))[0];

      if (!mob) {
        bot.chat('⚠️ ما لقيت أي وحش قريب.');
        busy = false;
        return;
      }

      // أفضل سيف أو اليد
      const swordsPriority = ['netherite_sword','diamond_sword','iron_sword','stone_sword','wooden_sword'];
      let sword = bot.inventory.items().sort((a,b) => swordsPriority.indexOf(a.name) - swordsPriority.indexOf(b.name))[0];
      if (sword && swordsPriority.includes(sword.name)) await bot.equip(sword, 'hand');

      bot.chat(`⚔️ مهاجم ${mob.name} القريب`);

      bot.pvp.attack(mob);

      const checkInterval = setInterval(() => {
        if (!mob.isValid || mob.health <= 0 || bot.entity.position.distanceTo(mob.position) > 16) {
          clearInterval(checkInterval);
          bot.pvp.stop();
          busy = false;
          bot.chat('✅ خلصت القتال أو ابتعد الوحش.');
        }
      }, 1000);
    }

    // أمر التوقف
    if (cmd === '!stop') {
      bot.pathfinder.setGoal(null);
      busy = false;
      bot.chat('🛑 وقفت المهمة.');
    }
  });

  bot.on('kicked', reason => { console.log(`❌ انطرد: ${reason}`); reconnect(); });
  bot.on('end', () => { console.log('⚠️ انقطع الاتصال، إعادة تشغيل...'); reconnect(); });
  bot.on('error', err => { console.log('⚠️ Error:', err.message); });
}

function reconnect() {
  setTimeout(() => {
    console.log('🔄 إعادة تشغيل البوت...');
    startBot();
  }, 5000);
}

process.on('uncaughtException', err => { console.log('💥 خطأ غير متوقع:', err.message); reconnect(); });
process.on('unhandledRejection', err => { console.log('💥 Promise مرفوضة:', err.message); });

const app = express();
app.get('/', (req, res) => res.send('✅ Bot شغال 24/7!'));
app.listen(3000, () => console.log('🌐 WebServer شغال على بورت 3000'));

startBot();
