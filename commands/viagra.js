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

function handleViagra(bot) {
  bot.onText(/\/виагра (\d+)/i, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const tablets = parseInt(match[1]);

    if (isNaN(tablets) || tablets <= 0) {
      bot.sendMessage(chatId, "Пожалуйста, введите корректное количество виагры.");
      return;
    }

    const tabletCost = 300; // Стоимость одной таблетки
    const totalCost = tablets * tabletCost;

    let userData = loadUserData();

    if (!userData[userId]) {
      userData[userId] = { balance: 0, armLength: 0 };
    }

    if (userData[userId].balance < totalCost) {
      bot.sendMessage(chatId, "У вас недостаточно средств для покупки виагры.");
      return;
    }

    userData[userId].balance -= totalCost;
    userData[userId].armLength += tablets * 2;

    saveUserData(userData);

    logAction({
      userId: userId,
      username: userData[userId].username || 'unknown',
      action: 'Viagra',
      amount: totalCost,
      balance: userData[userId].balance,
      additionalInfo: `${tablets}`
    });

    bot.sendMessage(chatId, `Вы успешно купили ${tablets} виагры и увеличили длину члена на ${tablets * 2} см.`);
  });
}

module.exports = handleViagra;
