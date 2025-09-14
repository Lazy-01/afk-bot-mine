const mineflayer = require('mineflayer');
const cmd = require('mineflayer-cmd').plugin;
const fs = require('fs');
const express = require('express');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalBlock, GoalNear } = goals;

// قراءة الإعدادات من config.json
let rawdata = fs.readFileSync('config.json');
let data = JSON.parse(rawdata);

let host = data["ip"];
let port = data["port"];
let username = data["name"];

var bot;
var connected = 0;
var actions = ['forward', 'back', 'left', 'right'];

function createBot() {
  console.log(`🔄 Connecting to ${host}:${port} as ${username} (v1.21.8)`);

  bot = mineflayer.createBot({
    host: host,
    port: port,
    username: username,
    version: "1.21.8",
    auth: "offline"
  });

  bot.loadPlugin(cmd);
  bot.loadPlugin(pathfinder);

  bot.on('login', () => {
    console.log("✅ Logged In");
    bot.chat("AFK bot 🤖 online!");
  });

  bot.on('spawn', () => {
    connected = 1;
    console.log("🎮 Bot spawned!");
  });

  bot.on('death', () => {
    bot.emit("respawn");
    console.log("☠️ Bot died, respawning...");
  });

  // أوامر البوت
  bot.on('chat', (username, message) => {
    if (username === bot.username) return;
    const args = message.split(' ');

    // أمر goto x y z
    if (args[0] === 'goto' && args.length === 4) {
      const x = parseInt(args[1]);
      const y = parseInt(args[2]);
      const z = parseInt(args[3]);

      if (isNaN(x) || isNaN(y) || isNaN(z)) {
        bot.chat("❌ استعمل: goto <x> <y> <z>");
        return;
      }

      const mcData = require('minecraft-data')(bot.version);
      const movements = new Movements(bot, mcData);
      bot.pathfinder.setMovements(movements);

      bot.pathfinder.setGoal(new GoalBlock(x, y, z));
      bot.chat(`🚶 رايح على: ${x}, ${y}, ${z}`);

      bot.once('goal_reached', () => {
        bot.chat("✅ وصلت للمكان المطلوب!");
      });
    }

    // أمر come يجي لعندك
    if (message === 'come') {
      const player = bot.players[username]?.entity;
      if (!player) {
        bot.chat("❌ مش شايفك!");
        return;
      }
      const mcData = require('minecraft-data')(bot.version);
      const movements = new Movements(bot, mcData);
      bot.pathfinder.setMovements(movements);

      bot.pathfinder.setGoal(new GoalNear(player.position.x, player.position.y, player.position.z, 1));
      bot.chat(`🚶 جاي لعندك يا ${username}`);
    }

    // أمر stop يوقف التحرك
    if (message === 'stop') {
      bot.pathfinder.stop();
      bot.chat("⛔ وقفت الحركة");
    }
  });

  // حلقة AFK + النوم
  setInterval(async () => {
    if (!connected) return;

    // حركة بسيطة كل فترة
    let action = actions[Math.floor(Math.random() * actions.length)];
    bot.setControlState(action, true);
    setTimeout(() => bot.setControlState(action, false), 1000);

    // يكتب AFK كل 5 دقائق
    let now = Date.now();
    if (!bot.lastChat || now - bot.lastChat > 5 * 60 * 1000) {
      bot.chat("✅ AFK bot still here!");
      bot.lastChat = now;
    }

    // ينام إذا جاء الليل
    if (bot.time.timeOfDay >= 13000 && bot.time.timeOfDay <= 23000) {
      try {
        const bed = bot.findBlock({
          matching: block => bot.isABed(block)
        });
        if (bed && !bot.isSleeping) {
          await bot.sleep(bed);
          console.log("🛏️ Bot is sleeping...");
        }
      } catch (err) {
        console.log("❌ Sleep error:", err.message);
      }
    }

    // يصحى إذا جاء النهار
    if (bot.time.timeOfDay < 13000 && bot.isSleeping) {
      try {
        await bot.wake();
        console.log("🌞 Bot woke up");
      } catch (err) {
        console.log("⚠️ Wake error:", err.message);
      }
    }

  }, 10000);

  bot.on('end', () => {
    console.log("❌ Bot disconnected, reconnecting in 30s...");
    connected = 0;
    setTimeout(() => createBot(), 30000);
  });

  bot.on('error', (err) => {
    console.log("⚠️ Error:", err.message);
  });
}

// بدء التشغيل بعد 15 ثانية
console.log("⌛ Waiting 15s before connecting...");
setTimeout(() => createBot(), 15000);

// Express server (لـ Replit/Render/UptimeRobot)
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => res.send("AFK Bot is running ✅"));
app.listen(PORT, () => console.log(`🌐 Express server running on port ${PORT}`));
// Express server لدعم Render/Replit keep-alive
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => res.send("AFK Bot is running ✅"));
app.listen(PORT, () => console.log(`🌐 Express server running on port ${PORT}`));
