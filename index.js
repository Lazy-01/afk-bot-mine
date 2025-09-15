const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const collectBlock = require('mineflayer-collectblock').plugin;
const { GoalFollow, GoalBlock } = goals;
const express = require('express');
const minecraftData = require('minecraft-data');

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

  bot.once('spawn', async () => {
    console.log('✅ البوت دخل السيرفر!');

    const mcData = minecraftData(bot.version);
    const defaultMove = new Movements(bot, mcData);
    defaultMove.allowParkour = true;
    defaultMove.allowSprinting = true;
    defaultMove.canDig = true;
    bot.pathfinder.setMovements(defaultMove);

    // أول دخول → يروح للسرير وينام
    if (firstSpawn) {
      firstSpawn = false;
      try {
        const goal = new GoalBlock(targetCoords.x, targetCoords.y, targetCoords.z);
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
    const cmd = args[0];

    // !follow <player>
    if (cmd === '!follow') {
      if (busy) return bot.chat('⚠️ مشغول حالياً.');
      const playerName = args[1];
      const target = bot.players[playerName]?.entity;
      if (!target) return bot.chat('❌ ما لقيت اللاعب.');

      busy = true;
      bot.chat(`🚶 بتبع ${playerName}...`);
      const goal = new GoalFollow(target, 1);
      bot.pathfinder.setGoal(goal, true);
    }

    // !mine <block> <amount> <x> <y> <z>
    if (cmd === '!mine') {
      if (busy) return bot.chat('⚠️ مشغول حالياً.');
      const blockName = args[1];
      const amount = parseInt(args[2]);
      const [x, y, z] = args.slice(3).map(Number);

      if (!blockName || isNaN(amount) || isNaN(x) || isNaN(y) || isNaN(z)) {
        return bot.chat('❌ صيغة الأمر: !mine <block> <amount> <x> <y> <z>');
      }

      const mcData = minecraftData(bot.version);
      const blockId = mcData.blocksByName[blockName]?.id;
      if (!blockId) return bot.chat('❌ اسم البلوك غير صحيح.');

      busy = true;
      const startPos = bot.entity.position.clone();

      try {
        const goal = new GoalBlock(x, y, z);
        await bot.pathfinder.goto(goal);

        let collected = 0;
        bot.on('blockBreakProgressEnd', (block) => {
          if (block.name === blockName) collected++;
          if (collected >= amount) {
            bot.chat(`✅ جمعت ${amount} ${blockName}.`);

            // يرمي كل شي إلا البلوك المطلوب
            bot.inventory.items().forEach(item => {
              if (item.name !== blockName) {
                bot.tossStack(item).catch(() => {});
              }
            });

            // يرجع مكانه
            bot.pathfinder.goto(new GoalBlock(startPos.x, startPos.y, startPos.z));
            busy = false;
          }
        });

        const targets = [];
        const block = bot.findBlock({
          matching: blockId,
          maxDistance: 32
        });
        if (block) targets.push(block);

        if (targets.length) {
          await bot.collectBlock.collect(targets, { count: amount });
        } else {
          bot.chat('❌ ما لقيت البلوك قريب.');
          busy = false;
        }
      } catch (err) {
        bot.chat('⚠️ خطأ: ' + err.message);
        busy = false;
      }
    }

    // !kill
    if (cmd === '!kill') {
      if (busy) return bot.chat('⚠️ مشغول حالياً.');
      busy = true;

      const mob = Object.values(bot.entities)
        .filter(e => e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 16)
        .sort((a, b) => bot.entity.position.distanceTo(a.position) - bot.entity.position.distanceTo(b.position))[0];

      if (!mob) {
        bot.chat('❌ ما في وحوش قريبة.');
        busy = false;
        return;
      }

      // أفضل سيف
      const swordsPriority = ['netherite_sword', 'diamond_sword', 'iron_sword', 'stone_sword', 'wooden_sword'];
      const sword = bot.inventory.items().find(i => swordsPriority.includes(i.name));
      if (sword) await bot.equip(sword, 'hand');

      bot.chat(`⚔️ بهجم على ${mob.name}`);

      const pvp = require('mineflayer-pvp').plugin;
      bot.loadPlugin(pvp);
      bot.pvp.attack(mob);

      const interval = setInterval(() => {
        if (!mob.isValid || mob.health <= 0 || bot.entity.position.distanceTo(mob.position) > 16) {
          clearInterval(interval);
          bot.pvp.stop();
          busy = false;
          bot.chat('✅ خلصت القتال.');
        }
      }, 1000);
    }
  });

  bot.on('physicsTick', () => {
    // أي كود يتحرك كل تك
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
  const delay = 20000; // 20 ثانية
  console.log(`⏳ محاولة إعادة الاتصال بعد ${delay / 1000} ثانية...`);
  setTimeout(() => {
    console.log('🔄 إعادة تشغيل البوت...');
    startBot();
  }, delay);
}

process.on('uncaughtException', (err) => {
  console.log('💥 خطأ غير متوقع:', err.message);
  reconnect();
});

process.on('unhandledRejection', (err) => {
  console.log('💥 Promise مرفوضة:', err.message);
});

const app = express();
app.get('/', (req, res) => res.send('✅ Bot شغال 24/7!'));
app.listen(3000, () => console.log('🌐 WebServer شغال على بورت 3000'));

startBot();
