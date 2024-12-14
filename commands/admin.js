const path = require("path");
const fs = require("fs");

const { loadUserData, saveUserData } = require("../utils/data");

const authorizedUsers = {
  "Golyb333": 3,
};

function logAction(userId, username, action, additionalInfo = "") {
  const logFilePath = path.join(__dirname, "logs.txt");
  const logMessage = `[${new Date().toISOString()}] User: ${username} (ID: ${userId}), Action: ${action}, ${additionalInfo}\n`;

  fs.appendFile(logFilePath, logMessage, (err) => {
    if (err) {
      console.error("Log writing error:", err);
    }
  });
}

function isAuthorized(username, requiredLevel) {
  return authorizedUsers[username] >= requiredLevel;
}

function sendUnauthorizedMessage(bot, chatId) {
  bot.sendMessage(chatId, "У вас недостаточно прав для выполнения этой команды.");
}

function logAndSendError(bot, chatId, err, actionDescription) {
  console.error(`Failed to ${actionDescription}: ${err}`);
  bot.sendMessage(chatId, `Не удалось выполнить действие: ${actionDescription}`);
}

function handleDeleteMessage(bot, chatId, messageId) {
  bot.deleteMessage(chatId, messageId)
    .then(() => {
      console.log(`Message with ID ${messageId} deleted`);
      logAction(chatId, '', 'Message deleted', `Deleted message with ID ${messageId}`);
    })
    .catch((err) => logAndSendError(bot, chatId, err, "delete message"));
}

function changeBalance(chatId, userId, amount, username) {
  let userData = loadUserData();
  if (!userData[userId]) {
    userData[userId] = { balance: 0 };
  }

  userData[userId].balance += parseFloat(amount);
  saveUserData(userData);

  bot.sendMessage(
    chatId,
    `Баланс пользователя ${userId} изменен на ${amount}. Новый баланс: ${userData[userId].balance}`
  );
  logAction(userId, username, 'Balance changed', `Balance updated by ${amount}`);
}

function handleDel(bot) {
  bot.onText(/удалить(?: (\d+))?/i, (msg, match) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;
    const count = match[1] ? parseInt(match[1]) : 0;

    if (!isAuthorized(username, 2)) {
      sendUnauthorizedMessage(bot, chatId);
      return;
    }

    if (msg.reply_to_message) {
      const messageId = msg.reply_to_message.message_id;
      handleDeleteMessage(bot, chatId, messageId);
      
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const prevMessageId = msg.message_id - i - 1;
          handleDeleteMessage(bot, chatId, prevMessageId);
        }
      }
    } else {
      bot.sendMessage(chatId, "Команда 'удалить' должна быть ответом на сообщение.");
    }
  });
}

function handleDat(bot) {
  bot.onText(/^\/выдать(?: (\d+)| -(\d+))/i, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username;
    const amountForUser = match[1];
    const amountToDeduct = match[2];

    if (!isAuthorized(username, 3)) {
      sendUnauthorizedMessage(bot, chatId);
      return;
    }

    if (amountToDeduct) {
      const amount = parseFloat(amountToDeduct);
      const targetUserId = msg.reply_to_message ? msg.reply_to_message.from.id : userId;

      changeBalance(chatId, targetUserId, -amount, username);
      bot.sendMessage(chatId, `У пользователя ${targetUserId} было снято ${amount} монет.`);
    } else if (amountForUser) {
      const amount = parseFloat(amountForUser);
      const targetUserId = msg.reply_to_message ? msg.reply_to_message.from.id : userId;

      changeBalance(chatId, targetUserId, amount, username);
      bot.sendMessage(chatId, `Пользователю ${targetUserId} выдано ${amount} Монет.`);
    } else {
      bot.sendMessage(chatId, "Укажите сумму для выдачи или снятия.");
    }
  });
}

function handleMute(bot) {
  bot.onText(/\/мут (\d+)([см])/i, (msg, match) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;

    if (!isAuthorized(username, 2)) {
      sendUnauthorizedMessage(bot, chatId);
      return;
    }

    if (msg.reply_to_message) {
      const muteDuration = parseInt(match[1]);
      const timeUnit = match[2].toLowerCase();
      let durationInSeconds;

      if (timeUnit === 'с') {
        durationInSeconds = muteDuration;
      } else if (timeUnit === 'м') {
        durationInSeconds = muteDuration * 60;
      } else {
        bot.sendMessage(chatId, "Неверный формат команды. Используйте /мут <число><с/м>.");
        return;
      }

      const userId = msg.reply_to_message.from.id;
      const muteEndTime = Math.floor(Date.now() / 1000) + durationInSeconds;
      bot.restrictChatMember(chatId, userId, { until_date: muteEndTime })
        .then(() => {
          bot.sendMessage(chatId, `Пользователь ${userId} был замучен на ${muteDuration} ${timeUnit === 'с' ? 'секунд' : 'минут'}.`);
          logAction(userId, username, 'User muted', `Muted user ${userId} for ${muteDuration} ${timeUnit === 'с' ? 'seconds' : 'minutes'}`);
          setTimeout(() => {
            bot.restrictChatMember(chatId, userId, { until_date: 0 })  // Снимаем мут
              .then(() => {
                bot.restrictChatMember(chatId, userId, { can_send_messages: true })
                  .then(() => {
                    bot.sendMessage(chatId, `Пользователь ${userId} был размучен.`);
                    logAction(userId, username, 'User unmuted', `Unmuted user ${userId}`);
                  })
                  .catch((err) => logAndSendError(bot, chatId, err, "unmute user"));
              })
              .catch((err) => logAndSendError(bot, chatId, err, "unmute user"));
          }, durationInSeconds * 1000);  // Таймер, который сработает через durationInSeconds
        })
        .catch((err) => logAndSendError(bot, chatId, err, "mute user"));
    } else {
      bot.sendMessage(chatId, "Команда 'мут' должна быть ответом на сообщение.");
    }
  });
  bot.onText(/\/размут/i, (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;

    if (!isAuthorized(username, 2)) {
      sendUnauthorizedMessage(bot, chatId);
      return;
    }

    if (msg.reply_to_message) {
      const userId = msg.reply_to_message.from.id;
      bot.restrictChatMember(chatId, userId, { can_send_messages: true })  // Снимаем мут
        .then(() => {
          bot.sendMessage(chatId, `Пользователь ${userId} был размучен.`);
          logAction(userId, username, 'User unmuted', `Unmuted user ${userId}`);
        })
        .catch((err) => logAndSendError(bot, chatId, err, "unmute user"));
    } else {
      bot.sendMessage(chatId, "Команда 'размут' должна быть ответом на сообщение.");
    }
  });
}


function handleAdmins(bot) {
  bot.onText(/\/админы/i, (msg) => {
    const chatId = msg.chat.id;
    const adminUsernames = Object.keys(authorizedUsers)
      .map(username => `@${username} - Уровень ${authorizedUsers[username]}`)
      .join("\n");

    bot.sendMessage(chatId, `Администраторы бота:\n${adminUsernames}`);
  });
}

function handleAdminInfo(bot) {
  bot.onText(/\/а\.инфо/i, (msg) => {
    const chatId = msg.chat.id;
    const adminCommands = `
Доступные команды для администраторов:
- /удалить [количество] - Удалить сообщение и указанное количество предыдущих сообщений (Уровень 2).
- /выдать [сумма] - Выдать указанную сумму пользователю (Уровень 3).
- /мут <число><с/м> - Замутить пользователя на указанное количество секунд или минут (Уровень 2).
- /админы - Показать список администраторов.
- /а.инфо - Показать список доступных команд для администраторов.
- /обнулить <пользователь> - Обнулить баланс пользователя (Уровень 3).
`;
    bot.sendMessage(chatId, adminCommands);
  });
}

function handleResetBalance(bot) {
  bot.onText(/^\/обнулить (\w+)/i, (msg, match) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;
    const targetUsername = match[1];

    if (!isAuthorized(username, 3)) {
      sendUnauthorizedMessage(bot, chatId);
      return;
    }

    let userData = loadUserData();
    const targetUserId = Object.keys(userData).find(
      (userId) => userData[userId].username === targetUsername
    );

    if (targetUserId) {
      userData[targetUserId].balance = 0;
      saveUserData(userData);
      bot.sendMessage(chatId, `Баланс пользователя ${targetUsername} был обнулен.`);
      logAction(msg.from.id, username, 'Balance reset', `Reset balance of user ${targetUsername}`);
    } else {
      bot.sendMessage(chatId, `Пользователь ${targetUsername} не найден.`);
    }
  });
}

module.exports = {
  handleDel,
  handleDat,
  handleMute,
  handleAdmins,
  handleAdminInfo,
  handleResetBalance,
};
