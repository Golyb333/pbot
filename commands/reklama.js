const { loadUserData, saveUserData } = require("../utils/data");
const fs = require("fs");

const advertisementCooldowns = new Map();
const advertisementState = new Map(); // Хранит состояние рекламы для пользователей

function handleAdvertisement(bot) {
  bot.onText(/\/реклама/, (msg) => {
    const chatId = msg.chat.id.toString();
    const userId = msg.from.id.toString();
    let userData = loadUserData();
    if (!userData.groups) {
      userData.groups = {};
    }

    if (!userData.groups[chatId]) {
      const chatName = msg.chat.title || msg.chat.username || "Неизвестная группа";
      userData.groups[chatId] = { id: chatId, name: chatName, advertisementEnabled: true }; // По умолчанию реклама включена
      saveUserData(userData);
    }

    advertisementState.set(userId, { active: true, chatId: chatId });
    bot.sendMessage(chatId, `Режим рекламы активирован. Пожалуйста, отправьте текст рекламы в следующем сообщении.`);
  });
  bot.on('message', (msg) => {
    const userId = msg.from.id.toString();
    const chatId = msg.chat.id.toString();
    const text = msg.text;
    if (advertisementState.has(userId) && advertisementState.get(userId).active) {
      advertisementState.delete(userId); // Деактивируем режим рекламы после получения текста

      const now = Date.now();
      const advertisementCost = 30000;
      const cooldownPeriod = 12 * 60 * 60 * 1000; // 12 часов в миллисекундах

      let userData = loadUserData();

      if (!userData[userId] || userData[userId].balance < advertisementCost) {
        bot.sendMessage(chatId, "У вас недостаточно средств для размещения рекламы. Требуется 30,000 монет.");
        return;
      }

      if (advertisementCooldowns.has(userId) && now - advertisementCooldowns.get(userId) < cooldownPeriod) {
        const timeLeft = Math.ceil((cooldownPeriod - (now - advertisementCooldowns.get(userId))) / 1000);
        const hours = Math.floor(timeLeft / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);
        const seconds = timeLeft % 60;
        bot.sendMessage(chatId, `Вы можете снова разместить рекламу через ${hours}ч ${minutes}м ${seconds}с.`);
        return;
      }

      userData[userId].balance -= advertisementCost;
      advertisementCooldowns.set(userId, now);
      saveUserData(userData);
      const formattedMessage = `<b>Реклама от @${msg.from.username}:</b>\n<blockquote>${text}</blockquote>`;
      const groups = userData.groups || {};
      for (const groupId in groups) {
        const group = groups[groupId];
        if (group.advertisementEnabled) {
          const groupChatId = group.id.toString();
          bot.sendMessage(groupChatId, formattedMessage, { parse_mode: 'HTML' });
        }
      }

      bot.sendMessage(chatId, "Ваша реклама была успешно размещена.");
    }
  });
}

module.exports = handleAdvertisement;
