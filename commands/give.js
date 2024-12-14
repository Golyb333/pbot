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

function handleGive(bot) {
  bot.onText(/\/дать(?:\s+(\S+))?\s+(\d+)/i, (msg, match) => {
    const chatId = msg.chat.id;
    const fromUserId = msg.from.id;
    const toUserIdentifier = match[1];
    const amount = parseInt(match[2]);

    if (isNaN(amount) || amount <= 0) {
      bot.sendMessage(chatId, `Чтобы дать деньги, используйте команду /дать (пользователь) (количество).`);
      return;
    }

    let userData = loadUserData();
    let toUserId;

    if (toUserIdentifier) {
      if (toUserIdentifier.startsWith('@')) {
        const username = toUserIdentifier.slice(1);
        const userEntry = Object.entries(userData).find(([id, data]) => data.username === username);
        if (userEntry) {
          toUserId = userEntry[0];
        }
      } else {
        toUserId = toUserIdentifier;
      }
    } else if (msg.reply_to_message) {
      toUserId = msg.reply_to_message.from.id.toString();
    } else {
      bot.sendMessage(chatId, `Чтобы дать деньги, ответьте на сообщение пользователя или используйте команду /дать (пользователь) (количество).`);
      return;
    }

    if (!toUserId || !userData[toUserId]) {
      bot.sendMessage(chatId, `Пользователь не найден.`);
      return;
    }

    if (!userData[fromUserId] || userData[fromUserId].balance < amount) {
      bot.sendMessage(chatId, `У вас недостаточно средств для перевода.`);
      return;
    }

    userData[fromUserId].balance -= amount;
    userData[toUserId].balance += amount;

    saveUserData(userData);

    logAction({
      userId: fromUserId,
      username: userData[fromUserId].username || 'unknown',
      action: 'Give',
      amount: amount,
      balance: userData[fromUserId].balance,
      additionalInfo: `To: ${userData[toUserId].username || 'unknown'} (ID: ${toUserId})`
    });

    bot.sendMessage(chatId, `Вы успешно перевели ${amount} монет пользователю @${userData[toUserId].username || 'unknown'}.`);
  });
}

module.exports = handleGive;
