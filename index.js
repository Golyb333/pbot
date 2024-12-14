const TelegramBot = require("node-telegram-bot-api");
const { loadUserData, saveUserData } = require("./utils/data");
const token = "ENTER YOUR OWN";
const bot = new TelegramBot(token, { polling: true });
const axios = require('axios');
const cheerio = require('cheerio');
const moment = require("moment-timezone");
const yaml = require("js-yaml");
const path = require("path");
const fs = require("fs");

// Импорт команд
const handleFarm = require("./commands/farm");
const handleUpgrade = require("./commands/upgrade");
const handleInfo = require("./commands/info");
const handleGive = require("./commands/give");
const handleBalance = require("./commands/balance");
const handleLeaderboard = require("./commands/leaderboard");
const handleViagra = require("./commands/viagra");
const { handleCasino, updateCasinoBalance, handleHoldCommand, } = require("./commands/casino");
const handleArithmetic = require("./commands/arithmetic");
const { handleBuyCripta, handleSellCripta, updateCoinValues, handleCripta } = require("./commands/cripta");
const { handleDel, handleDat, handleMute, handleAdmins, handleAdminInfo, handleResetBalance } = require("./commands/admin");
const handleAI = require("./commands/ai");
const handleWiki = require("./commands/wiki");
const { handleMarket, handleCet, handleFishing, handleAutoFish, handlePrices, updateMarketPrices } = require("./commands/fishing");
const { handleBsell, handleBbuy, handleB } = require("./commands/birja");
const { handleInvent, handleShop, handleCraft, handleResourceBuying, handleResourceSelling } = require("./commands/craft");
const handleMining = require("./commands/mine")
const handleRP = require("./commands/rp");
const handleIvanZolo = require("./commands/zolo");
const handleR34 = require("./commands/porn");
const handleUserInitialization = require('./init');
const handleAntiSpam = require('./commands/spam');
const handleAdvertisement = require('./commands/reklama');
const handleQuiz = require('./commands/shahta');
const handleStress = require('./commands/stress');
const handleStats = require('./commands/stats');


 // Инициализация команд
handleFarm(bot); // ферма
handleUpgrade(bot); // улучшить
handleInfo(bot); // инфо
handleGive(bot);//  дать
handleBalance(bot); // мешок
handleLeaderboard(bot);//  монеты \ среднее
handleViagra(bot);//  виагра
handleCasino(bot);//  казино
handleArithmetic(bot); // калькулятор
handleBuyCripta(bot); // купить
handleSellCripta(bot);  //продать
handleCripta(bot); // крипта
handleDel(bot);  //удалить
handleDat(bot);  //выдать
handleAI(bot); // бот
handleWiki(bot);  //вики
handleMarket(bot); // рынок
handleCet(bot);  //сеть
handleFishing(bot);  //рыбалка
handleAutoFish(bot);// авторыбалка
handlePrices(bot); // цены
handleBsell(bot); // б.продать
handleBbuy(bot); // б.купить
handleB(bot); // биржа
handleInvent(bot); // инвентарь
handleShop(bot);//  мусорка
handleCraft(bot); // крафт
handleResourceBuying(bot);//  р.купить
handleResourceSelling(bot); // р.продать
handleMining(bot); // майнинг ToDo ДОДЕЛАТЬ!!!
handleRP(bot);//  рп команды (СКРЫТО) ToDo ДОДЕЛАТЬ!!!
handleIvanZolo(bot); // золо 
handleUserInitialization(bot); // init piece of shit
handleAntiSpam(bot);       
handleMute(bot);
handleAdmins(bot);
handleAdminInfo(bot);
handleResetBalance(bot);
handleAdvertisement(bot);
handleHoldCommand(bot);
handleQuiz(bot);
handleStress(bot);
handleStats(bot);




const handleFactory = require('./commands/zavod');
 handleFactory(bot);


handleR34(bot); // :) скрыто навсегда 100%

updateCasinoBalance();
setInterval(updateCasinoBalance, 3600000);

updateCoinValues()
setInterval(updateCoinValues, 10000);

updateMarketPrices();
setInterval(updateMarketPrices, 25 * 60 * 1000);

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});


 const rewardBotToken = "7055740903:AAEteIwO7x99gZZcKJELs6Qwst_Vmqe0a2I";
 const rewardBot = new TelegramBot(rewardBotToken, { polling: true });
 const rewardAmount = 5000;

 const rewardedUsersFilePath = path.join(__dirname, "rewarded_users.yaml");
 let rewardedUsers = {};

 if (fs.existsSync(rewardedUsersFilePath)) {
   rewardedUsers = yaml.load(fs.readFileSync(rewardedUsersFilePath, "utf8"));
 }

  Function to save rewarded users to YAML
 function saveRewardedUsers() {
   fs.writeFileSync(rewardedUsersFilePath, yaml.dump(rewardedUsers), "utf8");
 }

 rewardBot.onText(/\/start/, async (msg) => {
   const userId = msg.from.id.toString();
   const chatId = msg.chat.id;

   if (rewardedUsers[userId]) {
     rewardBot.sendMessage(chatId, "Динаху мать ебал ты уже палучал бонус а терь динаху животное баное.");
     return;
   }

   let userData = loadUserData();
   userData[userId] = userData[userId] || { balance: 0 };
   userData[userId].balance += rewardAmount;
   saveUserData(userData);
   rewardedUsers[userId] = true;
   saveRewardedUsers();

   rewardBot.sendMessage(chatId, `ПОЗАДДРАВЛяем вы палучаите 500 голдi от вiлясiка`);
 });
