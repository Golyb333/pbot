const { loadUserData, saveUserData } = require("../utils/data");
const { formatCooldownTime } = require("../utils/cooldown");

const initialUpgradeCost = 5000;
const upgradeMultiplier = 1.5;
const earningsMultiplier = 1.14;
const cooldownReduction = 7 * 60 * 1000;
const baseCooldown = 10800000; // 3 часа в миллисекундах

function handleUpgrade(bot) {
  bot.onText(/\/улучшить/i, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    let userData = loadUserData();

    if (!userData[userId]) {
      userData[userId] = { balance: 0, upgrades: 0 };
    }

    const currentUpgradeLevel = userData[userId].upgrades || 0;
    const upgradeCost = initialUpgradeCost * Math.pow(upgradeMultiplier, currentUpgradeLevel);
    const currentEarningsMultiplier = Math.pow(earningsMultiplier, currentUpgradeLevel);
    const currentCooldown = baseCooldown - currentUpgradeLevel * cooldownReduction;

    const upgradeMessage = `Уровень фермы: ${currentUpgradeLevel}
    Текущий доход: x${currentEarningsMultiplier.toFixed(2)}
    Текущий кулдаун: ${formatCooldownTime(currentCooldown)}
    Стоимость следующего улучшения: ${upgradeCost.toFixed(2)} монет`;

    bot.sendMessage(chatId, upgradeMessage, {
      reply_markup: {
        inline_keyboard: [[{ text: "Улучшить", callback_data: "upgrade_farm" }]],
      },
    });
  });

  bot.on("callback_query", (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const userId = query.from.id;
    const data = query.data;

    if (data === "upgrade_farm") {
      let userData = loadUserData();

      if (!userData[userId]) {
        userData[userId] = { balance: 0, upgrades: 0 };
      }

      const currentUpgradeLevel = userData[userId].upgrades || 0;
      const upgradeCost = initialUpgradeCost * Math.pow(upgradeMultiplier, currentUpgradeLevel);

      if (userData[userId].balance < upgradeCost) {
        bot.answerCallbackQuery(query.id, {
          text: `У вас недостаточно средств для улучшения. Необходимо ${upgradeCost.toFixed(2)} монет.`,
          show_alert: true,
        });
        return;
      }

      userData[userId].balance -= upgradeCost;
      userData[userId].upgrades = (userData[userId].upgrades || 0) + 1;

      const newUpgradeLevel = userData[userId].upgrades;
      const newUpgradeCost = initialUpgradeCost * Math.pow(upgradeMultiplier, newUpgradeLevel);
      const newEarningsMultiplier = Math.pow(earningsMultiplier, newUpgradeLevel);
      const newCooldown = baseCooldown - newUpgradeLevel * cooldownReduction;

      const upgradeMessage = `Уровень фермы: ${newUpgradeLevel}
      Текущий доход: x${newEarningsMultiplier.toFixed(2)}
      Текущий кулдаун: ${formatCooldownTime(newCooldown)}
      Стоимость следующего улучшения: ${newUpgradeCost.toFixed(2)} монет`;
      bot.deleteMessage(chatId, messageId).then(() => {
        bot.sendMessage(chatId, upgradeMessage, {
          reply_markup: {
            inline_keyboard: [[{ text: "Улучшить", callback_data: "upgrade_farm" }]],
          },
        });
      });

      saveUserData(userData);
      
      bot.answerCallbackQuery(query.id);
    }
  });
}

module.exports = handleUpgrade;
