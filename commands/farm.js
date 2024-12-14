const { loadUserData, saveUserData } = require("../utils/data");
const { formatCooldownTime } = require("../utils/cooldown");
const path = require("path");
const fs = require("fs");

function formatNumber(number) {
  return number.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function logAction({
  userId,
  username,
  action,
  amount,
  balance,
  additionalInfo = "",
}) {
  const logFilePath = path.join(__dirname, "logs.txt");
  const logMessage = `[${new Date().toISOString()}] User: ${username} (ID: ${userId}), Action: ${action}, Amount: ${formatNumber(amount)}, Balance: ${formatNumber(balance)}, ${additionalInfo}\n`;

  fs.appendFile(logFilePath, logMessage, (err) => {
    if (err) {
      console.error("Ошибка записи в лог:", err);
    }
  });
}

const baseCooldown = 10800000; // 3 часа в миллисекундах
const earningsMultiplier = 1.14;
const cooldownReduction = 7 * 60 * 1000;

function handleFarm(bot) {
  bot.onText(/\/(ферма|бизнес|работа)/i, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username;

    let userData = loadUserData();

    if (!userData[userId]) {
      userData[userId] = { upgrades: 0 };
    }

    userData[userId].username = username;

    const lastUsage = userData[userId].lastUsage_farm || 0;
    const currentTime = Date.now();
    const cooldown =
      baseCooldown - (userData[userId].upgrades || 0) * cooldownReduction;

    if (currentTime - lastUsage < cooldown) {
      const remainingTime = cooldown - (currentTime - lastUsage);
      const formattedTime = formatCooldownTime(remainingTime);
      bot.sendMessage(
        chatId,
        `Подождите еще ${formattedTime}, прежде чем использовать команду снова.`
      );
    } else {
      const baseEarnings = Math.floor(Math.random() * (2000 - 1500 + 1)) + 1500;
      const earnings =
        baseEarnings *
        Math.pow(earningsMultiplier, userData[userId].upgrades || 0);
      userData[userId].balance = (userData[userId].balance || 0) + earnings;
      userData[userId].lastUsage_farm = currentTime;

      if (userData[userId].referrer) {
        const referrerId = userData[userId].referrer;
        const referralBonus = earnings * 0.1;
        if (!userData[referrerId]) {
          userData[referrerId] = {};
        }
        userData[referrerId].balance =
          (userData[referrerId].balance || 0) + referralBonus;
        bot.sendMessage(
          chatId,
          `Вы заработали ${formatNumber(earnings)} монет, а @${userData[referrerId].username} получил дивиденды в размере ${formatNumber(referralBonus)} с вас`,
          logAction({
            userId: userId,
            username: userData[userId].username || 'unknown',
            action: 'Farm Refferef to',
            amount: earnings,
            balance: userData[userId].balance,
            additionalInfo: `Referrer: ${userData[referrerId].username}, amount: ${referralBonus}, lvl: ${userData[userId].upgrades}`
          })
        );
      } else {
        bot.sendMessage(chatId, `Вы заработали ${formatNumber(earnings)} монет.`);
        logAction({
          userId: userId,
          username: userData[userId].username || 'unknown',
          action: 'Farm',
          amount: earnings,
          balance: userData[userId].balance,
          additionalInfo: `lvl: ${userData[userId].upgrades}`
        });
      }

      saveUserData(userData);
    }
  });
}

module.exports = handleFarm;
