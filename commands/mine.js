const { loadUserData, saveUserData } = require("../utils/data");
const path = require("path");
const fs = require("fs");

function logAction({
  userId,
  username,
  action,
  amount,
  balance,
  additionalInfo = "",
}) {
  const logFilePath = path.join(__dirname, "logs.txt");
  const logMessage = `[${new Date().toISOString()}] User: ${username} (ID: ${userId}), Action: ${action}, Amount: ${amount}, Balance: ${balance}, ${additionalInfo}\n`;

  fs.appendFile(logFilePath, logMessage, (err) => {
    if (err) {
      console.error("Ошибка записи в лог:", err);
    }
  });
}

function handleMining(bot) {
  bot.onText(/\/майнинг(\s+(все|всё|\d+))?/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const farmNumberInput = match[2] ? match[2].trim().toLowerCase() : "1"; // Default to farm 1 if not specified

    let userData = loadUserData();
    if (!userData[userId] || !userData[userId].resources || !userData[userId].resources.майнингФерма) {
      bot.sendMessage(chatId, "У вас нет майнинг фермы для использования этой команды. Чтоб майнить, скрафтите её с помощью команды /крафт 2");
      return;
    }

    const miningFarms = userData[userId].resources.майнингФерма;
    const lastMiningTimes = userData[userId].lastMiningTimes || {};
    const currentTime = Date.now();
    const rewardPerSecond = 0.1; // За каждую секунду майнинга дается 0.1 монеты
    const maxRewardPerFarm = 5000; // Максимальная сумма, которую можно накопить с фермы

    if (farmNumberInput === "все" || farmNumberInput === "всё") {
      let totalReward = 0;  
      let farmsMined = 0;

      for (let farmNumber = 1; farmNumber <= miningFarms; farmNumber++) {
        const lastTime = lastMiningTimes[farmNumber] || currentTime;
        const timeDifference = (currentTime - lastTime) / 1000; // Разница во времени в секундах
        const accumulatedReward = Math.min(timeDifference * rewardPerSecond, maxRewardPerFarm); // Ограничиваем максимальной наградой

        if (accumulatedReward > 0) {
          totalReward += accumulatedReward;
          lastMiningTimes[farmNumber] = currentTime; // Обновляем время для этой фермы
          farmsMined++;
        }
      }

      if (farmsMined === 0) {
        bot.sendMessage(chatId, "Фермы не производят монеты, попробуйте позже.");
        return;
      }

      userData[userId].balance = (userData[userId].balance || 0) + totalReward;
      userData[userId].lastMiningTimes = lastMiningTimes;
      saveUserData(userData);

      logAction({
        userId: userId,
        username: userData[userId].username || 'unknown',
        action: 'Mining All Farms',
        amount: totalReward,
        balance: userData[userId].balance,
        additionalInfo: `Farms Mined: ${farmsMined}`
      });

      bot.sendMessage(chatId, `Вы успешно заработали ${totalReward.toFixed(2)} монет на майнинге со всех ферм.`);
    } else {
      const farmNumber = parseInt(farmNumberInput);
      if (isNaN(farmNumber) || farmNumber < 1 || farmNumber > miningFarms) {
        bot.sendMessage(chatId, "У вас нет такой майнинг фермы.");
        return;
      }

      const lastTime = lastMiningTimes[farmNumber] || currentTime;
      const timeDifference = (currentTime - lastTime) / 1000; // Разница во времени в секундах
      const accumulatedReward = Math.min(timeDifference * rewardPerSecond, maxRewardPerFarm); // Ограничиваем максимальной наградой

      if (accumulatedReward === 0) {
        bot.sendMessage(chatId, "Ферма не произвела монет за это время, попробуйте позже.");
        return;
      }

      userData[userId].balance = (userData[userId].balance || 0) + accumulatedReward;
      lastMiningTimes[farmNumber] = currentTime;
      userData[userId].lastMiningTimes = lastMiningTimes;
      saveUserData(userData);

      logAction({
        userId: userId,
        username: userData[userId].username || 'unknown',
        action: 'Mining Farm',
        amount: accumulatedReward,
        balance: userData[userId].balance,
        additionalInfo: `Farm: ${farmNumber}`
      });

      bot.sendMessage(chatId, `Вы успешно заработали ${accumulatedReward.toFixed(2)} монет на майнинге с фермы ${farmNumber}.`);
    }
  });
}

module.exports = handleMining;
