const mineflayer = require('mineflayer');
const cmd = require('mineflayer-cmd').plugin;
const fs = require('fs');
const express = require('express');

// Config
let rawdata = fs.readFileSync('config.json');
let data = JSON.parse(rawdata);

let host = data["ip"];
let port = data["port"];
let username = data["name"];
let nightskip = data["auto-night-skip"];

var bot;
var connected = 0;
var actions = ['forward','back','left','right'];

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

  bot.on('login', () => {
    console.log("✅ Logged In");
    bot.chat("Hello, I am AFK bot 🤖");
  });

  bot.on('spawn', () => {
    connected = 1;
    console.log("🎮 Bot spawned!");
  });

  bot.on('death', () => {
    bot.emit("respawn");
    console.log("☠️ Bot died, respawning...");
  });

  setInterval(() => {
    if (!connected) return;

    let action = actions[Math.floor(Math.random() * actions.length)];
    bot.setControlState(action,true);
    setTimeout(()=>bot.setControlState(action,false),2000);

    let now = Date.now();
    if(!bot.lastChat || now - bot.lastChat > 5*60*1000){
      bot.chat("AFK ✅");
      bot.lastChat = now;
    }

    if(nightskip === "true" && bot.time.timeOfDay >= 13000){
      bot.chat("/time set day");
    }

  },10000);

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

// Express server لدعم Render/Replit keep-alive
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => res.send("AFK Bot is running ✅"));
app.listen(PORT, () => console.log(`🌐 Express server running on port ${PORT}`));
