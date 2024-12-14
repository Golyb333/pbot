const { loadUserData, saveUserData } = require("../utils/data");
const path = require("path");
const fs = require("fs");
const moment = require("moment-timezone");

function formatNumber(number) {
  return number.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function logBigWin(userId, username, amount, balance) {
  const bigWinsFilePath = path.join(__dirname, "bigWins.json");
  let bigWins = [];
  if (fs.existsSync(bigWinsFilePath)) {
    try {
      const data = fs.readFileSync(bigWinsFilePath, "utf-8");
      bigWins = JSON.parse(data);
      if (!Array.isArray(bigWins)) {
        bigWins = [];
      }
    } catch (error) {
      console.error("Ошибка чтения файла bigWins.json:", error);
      bigWins = [];
    }
  }
  bigWins.push({
    userId,
    username,
    amount,
    balance,
    timestamp: moment().tz('Europe/Moscow').format('MM-DD HH:mm:ss') // Время по московскому времени
  });
  if (bigWins.length > 10) {
    bigWins = bigWins.slice(-10);
  }
  try {
    fs.writeFileSync(bigWinsFilePath, JSON.stringify(bigWins, null, 2));
  } catch (error) {
    console.error("Ошибка записи в файл bigWins.json:", error);
  }
}

function logAction({ userId, username, action, amount, balance, additionalInfo = "" }) {
  const logFilePath = path.join(__dirname, "logs.txt");
  const logMessage = `[${moment().tz('Europe/Moscow').format('YYYY-MM-DD HH:mm:ss')}] User: ${username} (ID: ${userId}), Action: ${action}, Amount: ${amount}, Balance: ${balance}, ${additionalInfo}\n`;

  fs.appendFile(logFilePath, logMessage, (err) => {
    if (err) {
      console.error("Ошибка записи в лог:", err);
    }
  });
  if (action === 'Casino Win') {
    if ((balance < 10000 && amount >= 0.5 * balance) || (balance >= 20000 && amount >= 0.2 * balance)) {
      logBigWin(userId, username, amount, balance);
    }
  }
}

function updateCasinoBalance() {
  const oneHour = 3600000;
  const lastUpdateTime = Date.now() - oneHour;
  let userData = loadUserData();

  if (!userData.casino) {
    userData.casino = { balance: 0, lastUpdate: 0 };
  }
  if (userData.casino.lastUpdate < lastUpdateTime) {
    userData.casino.balance += 5000;
    userData.casino.lastUpdate = Date.now(); // Обновляем время последнего обновления
    saveUserData(userData);
    console.log("Баланс казино пополнен на 5000");
  }
}

  const MAX_BET_AMOUNT = 15000000;
  const COOLDOWN_TIME = 15 * 1000;

  function handleCasino(bot) {
    bot.onText(/\/(казино|казик)(\s+(\d+(\.\d+)?))?/i, (msg, match) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const betAmount = match[2] ? parseFloat(match[2]) : null;

      let userData = loadUserData();

      if (!userData.casino) {
        userData.casino = { balance: 0 };
      }

      if (!userData[userId]) {
        userData[userId] = { balance: 0, lastCasinoTime: 0 };
      }

      if (betAmount === null) {
        bot.sendMessage(chatId, `Баланс казино: ${formatNumber(userData.casino.balance)} монет.`);
        return;
      }

      if (isNaN(betAmount) || betAmount <= 0) {
        bot.sendMessage(chatId, "Пожалуйста, введите корректную сумму для ставки.");
        return;
      }

      if (betAmount > MAX_BET_AMOUNT) {
        bot.sendMessage(chatId, `Максимальная ставка составляет ${formatNumber(MAX_BET_AMOUNT)} монет.`);
        return;
      }

      if (userData.casino.balance < betAmount) {
        bot.sendMessage(chatId, "У казино недостаточно средств для этой ставки.");
        return;
      }

      if (userData[userId].balance < betAmount) {
        bot.sendMessage(chatId, "У вас недостаточно средств для этой ставки.");
        return;
      }

      const currentTime = Date.now();
      if (currentTime - userData[userId].lastCasinoTime < COOLDOWN_TIME) {
        const timeLeft = Math.ceil((COOLDOWN_TIME - (currentTime - userData[userId].lastCasinoTime)) / 1000);
        bot.sendMessage(chatId, `Вы можете играть в казино снова через ${timeLeft} секунд.`);
        return;
      }

      userData[userId].lastCasinoTime = currentTime;

      const buttons = [];
      const mines = [];
      const gridSize = 20; // Количество кнопок в игре
      const numMines = 11; // Количество мин
      while (mines.length < numMines) {
        let randomIndex = Math.floor(Math.random() * gridSize);
        if (!mines.includes(randomIndex)) {
          mines.push(randomIndex);
        }
      }

      for (let i = 0; i < gridSize; i++) {
        buttons.push({
          text: "X",
          callback_data: JSON.stringify({ type: mines.includes(i) ? "mine" : "safe", index: i }),
        });
      }
      bot.sendMessage(chatId, `Выберите кнопку:\nСтавка:  ${formatNumber(betAmount)} монет`, {
        reply_markup: {
          inline_keyboard: chunks(buttons, 5), // Разбиваем кнопки на строки по 5 кнопок
        },
      }).then((sentMessage) => {
        const messageId = sentMessage.message_id;
        function handleCallbackQuery(query) {
          const data = JSON.parse(query.data);
          const fromUserId = query.from.id;

          if (data.type !== "mine" && data.type !== "safe") {
            return;
          }

          if (fromUserId !== userId) {
            bot.answerCallbackQuery(query.id, {
              text: "Эта игра предназначена для другого игрока.",
              show_alert: true,
            });
            return;
          }

          let resultMessage = "";

          if (data.type === "safe") {
            if (mines.includes(data.index)) {
              userData[userId].balance -= betAmount;
              userData.casino.balance += betAmount;
              resultMessage = `Вы попали на мину! Вы потеряли ${formatNumber(betAmount)} монет.`;
              logAction({
                userId: userId,
                username: msg.from.username || 'unknown',
                action: 'Casino Lose',
                amount: betAmount,
                result: 'mine',
                balance: userData[userId].balance,
                casinoBalance: userData.casino.balance
              });
            } else {
              userData[userId].balance += betAmount;
              userData.casino.balance -= betAmount;
              resultMessage = `Вы выиграли! Ваш выигрыш составил ${formatNumber(betAmount)} монет.`;
              logAction({
                userId: userId,
                username: msg.from.username || 'unknown',
                action: 'Casino Win',
                amount: betAmount,
                result: 'safe',
                balance: userData[userId].balance,
                casinoBalance: userData.casino.balance
              });
            }
          } else if (data.type === "mine") {
            userData[userId].balance -= betAmount;
            userData.casino.balance += betAmount;
            resultMessage = `Вы попали на мину! Вы потеряли  ${formatNumber(betAmount)} монет.`;
            logAction({
              userId: userId,
              username: msg.from.username || 'unknown',
              action: 'Casino Lose',
              amount: betAmount,
              result: 'mine',
              balance: userData[userId].balance,
              casinoBalance: userData.casino.balance
            });
          }
          let gameResultMessage = `Результат игры:\n\n`;
          for (let i = 0; i < gridSize; i++) {
            gameResultMessage += mines.includes(i) ? "💥" : "✅";

            if ((i + 1) % 5 === 0) {
              gameResultMessage += "\n";
            }
          }
          gameResultMessage += `\n\n${resultMessage}\nВаш баланс: ${formatNumber(userData[userId].balance)}\nБаланс казино: ${formatNumber(userData.casino.balance)} монет.`;
          bot.sendMessage(chatId, gameResultMessage).then(() => {
            bot.deleteMessage(chatId, messageId).catch((error) => {
              if (error.response && error.response.body && error.response.body.description) {
                if (error.response.body.description.includes("message to delete not found")) {
                } else {
                  console.error("Error while deleting game message:", error.response.body.description);
                }
              } else {
                console.error("Unknown error while deleting game message:", error);
              }
            });
          }).catch((error) => {
            console.error("Error while sending game result message:", error);
          }).finally(() => {
            bot.removeListener("callback_query", handleCallbackQuery);
            saveUserData(userData); // Сохраняем данные пользователя после каждой игры
          });
        }
        bot.on("callback_query", handleCallbackQuery);
      }).catch((error) => {
        console.error("Error while sending game message:", error);
      });
      function chunks(array, size) {
        let results = [];
        while (array.length) {
          results.push(array.splice(0, size));
        }
        return results;
      }
    });
  bot.onText(/\/заносы/i, (msg) => {
    const chatId = msg.chat.id;
    const bigWinsFilePath = path.join(__dirname, "bigWins.json");

    if (fs.existsSync(bigWinsFilePath)) {
      try {
        const data = fs.readFileSync(bigWinsFilePath, "utf-8");
        const bigWins = JSON.parse(data);

        if (!Array.isArray(bigWins)) {
          throw new Error("Invalid data format");
        }

        let message = "Последние 10 крупных выигрышей:\n\n";
        bigWins.forEach((win, index) => {
          message += `${index + 1}. Пользователь: ${win.username || 'unknown'}, Выигрыш: ${win.amount} монет, Баланс: ${win.balance}, Время: ${win.timestamp}\n`;
        });

        bot.sendMessage(chatId, message);
      } catch (error) {
        console.error("Ошибка чтения файла bigWins.json:", error);
        bot.sendMessage(chatId, "Произошла ошибка при загрузке данных о крупных выигрышах.");
      }
    } else {
      bot.sendMessage(chatId, "Нет зарегистрированных крупных выигрышей.");
    }
  });

  
    const MAX_MULTIPLIER = 1000;
    const INITIAL_CRASH_CHANCE = 0.22; // Начальная вероятность
    const INCREMENT = 0.1; // Шаг увеличения множителя
    const UPDATE_INTERVAL = 200; // Интервал обновления сообщения в миллисекундах
    const COOLDOWN_PERIOD = 5000; // Таймер задержки в миллисекундах

    bot.onText(/\/ракетка (\d+(?:\.\d)?) (\d+(?:\.\d)?)/i, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const betAmount = parseFloat(match[1]);
        const targetMultiplier = parseFloat(match[2]);

        let userData = loadUserData();

        if (!userData.casino) {
            userData.casino = { balance: 0 };
        }

        if (!userData[userId]) {
            userData[userId] = { balance: 0, lastPlay: 0 }; // Добавляем свойство lastPlay
        }

        const currentTime = Date.now();
        const lastPlayTime = userData[userId].lastPlay || 0;

        if (currentTime - lastPlayTime < COOLDOWN_PERIOD) {
            const remainingTime = Math.ceil((COOLDOWN_PERIOD - (currentTime - lastPlayTime)) / 1000);
            bot.sendMessage(chatId, `Вы можете играть снова через ${remainingTime} секунд.`);
            return;
        }

        if (betAmount < 100) {
            bot.sendMessage(chatId, "Минимальная ставка составляет 100 монет.");
            return;
        }

        if (targetMultiplier < 1.1 || targetMultiplier > MAX_MULTIPLIER) {
            bot.sendMessage(chatId, `Коэффициент должен быть в пределах от 1.1 до ${MAX_MULTIPLIER}.`);
            return;
        }

        if (userData.casino.balance < betAmount) {
            bot.sendMessage(chatId, "У казино недостаточно средств для этой ставки.");
            return;
        }

        if (userData[userId].balance < betAmount) {
            bot.sendMessage(chatId, "У вас недостаточно средств для этой ставки.");
            return;
        }

        userData[userId].lastPlay = currentTime; // Обновляем время последнего запуска

        let currentMultiplier = 0;
        let rocketCrashed = false;
        const crashChance = (multiplier) => {
            if (multiplier <= 0.1) {
                return INITIAL_CRASH_CHANCE; // Начальная вероятность 22% при 0.1x
            } else if (multiplier <= 1) {
                return 0.01 + ((multiplier - 0.074) * 0.074);
            } else if (multiplier <= 1.3) {
                return 0.04;
            } else if (multiplier <= 20) {
                return Math.min(0.25, 0.03 + ((multiplier - 1) * 0.03));
            } else {
                let adjustedMultiplier = multiplier - 20;
                return Math.min(0.5, 0.2 + (adjustedMultiplier * 0.02));
            }
        };
        let sentMessage = await bot.sendMessage(chatId, `Ракетка запущена!`);
        const messageId = sentMessage.message_id;

      const interval = setInterval(() => {
          if (rocketCrashed || currentMultiplier >= targetMultiplier) {
              clearInterval(interval);
              let resultMessage = `Ракетка достигла ${currentMultiplier.toFixed(1)}x. `;
              if (rocketCrashed) {
                  userData[userId].balance -= betAmount;
                  userData.casino.balance += betAmount; // Добавлено: баланс казино увеличивается
                  resultMessage += `Ракетка сломалась! Вы потеряли ${formatNumber(betAmount)} монет.`;
                  logAction({
                      userId: userId,
                      username: msg.from.username || 'unknown',
                      action: 'Rocket Crash',
                      amount: betAmount,
                      balance: userData[userId].balance
                  });
              } else {
                  const winAmount = betAmount * targetMultiplier;
                  userData[userId].balance += winAmount - betAmount;
                  userData.casino.balance -= winAmount - betAmount; // Добавлено: баланс казино уменьшается
                  resultMessage += `Вы выиграли ${winAmount.toFixed(1)} монет!`;
                  logAction({
                      userId: userId,
                      username: msg.from.username || 'unknown',
                      action: 'Rocket Win',
                      amount: winAmount,
                      balance: userData[userId].balance
                  });
              }
              bot.sendMessage(chatId, resultMessage);
              saveUserData(userData);
          } else {
              const rand = Math.random();
              currentMultiplier += INCREMENT;

              if (rand < crashChance(currentMultiplier)) {
                  rocketCrashed = true;
              }
          }
      }, UPDATE_INTERVAL)
    });
}

const MAX_HOLD_MULTIPLIER = 3.2;
const COOLDOWN_PERIOD = 5000; // Таймер задержки в миллисекундах

function handleHoldCommand(bot) {
    bot.onText(/\/холд (\d+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id;
        const betAmount = parseFloat(match[1]);

        let userData = loadUserData();

        if (!userData.casino) {
            userData.casino = { balance: 0 };
        }

        if (!userData[userId]) {
            userData[userId] = { balance: 0, lastPlay: 0 }; // Добавляем свойство lastPlay
        }

        const currentTime = Date.now();
        const lastPlayTime = userData[userId].lastPlay || 0;

        if (currentTime - lastPlayTime < COOLDOWN_PERIOD) {
            const remainingTime = Math.ceil((COOLDOWN_PERIOD - (currentTime - lastPlayTime)) / 1000);
            bot.sendMessage(chatId, `Вы можете играть снова через ${remainingTime} секунд.`);
            return;
        }

        if (betAmount <= 0) {
            bot.sendMessage(chatId, "Пожалуйста, введите корректную сумму для ставки.");
            return;
        }

        if (userData.casino.balance < betAmount) {
            bot.sendMessage(chatId, "У казино недостаточно средств для этой ставки.");
            return;
        }

        if (userData[userId].balance < betAmount) {
            bot.sendMessage(chatId, "У вас недостаточно средств для этой ставки.");
            return;
        }

        userData[userId].lastPlay = currentTime; // Обновляем время последнего запуска
        const slotMessage = await bot.sendDice(chatId, { emoji: '🎰' });
        setTimeout(async () => {
            const diceValue = slotMessage.dice.value;
            let multiplier = 0;
            let resultMessage = "🎰\n";
            if (diceValue === 64) {
                multiplier = 2;
            } else if (diceValue <= 63) {
                multiplier = 0;
            }
            if (multiplier > 0) {
                const winAmount = betAmount * multiplier;
                userData[userId].balance += winAmount - betAmount;
                userData.casino.balance -= winAmount - betAmount;
                resultMessage += `🎉 Поздравляем! Вы выиграли ${multiplier}x вашей ставки! 🎉\n`;
            } else {
                userData[userId].balance -= betAmount;
                userData.casino.balance += betAmount;
                resultMessage += "К сожалению, вы не выиграли в этот раз.\n";
            }

            resultMessage += `Ваш баланс: ${userData[userId].balance}\nБаланс казино: ${userData.casino.balance}`;
            logAction({
                userId: userId,
                username: msg.from.username || 'unknown',
                action: multiplier > 0 ? 'Hold Win' : 'Hold Lose',
                amount: betAmount,
                balance: userData[userId].balance,
                casinoBalance: userData.casino.balance
            });
            saveUserData(userData);
            bot.sendMessage(chatId, resultMessage);
        }, 3000); // Задержка в 3 секунды для отображения результата
    });

    bot.onText(/\/тестхолд/, async (msg) => {
        const chatId = msg.chat.id;
        const slotMessage = await bot.sendDice(chatId, { emoji: '🎰' });
        setTimeout(() => {
            const diceValue = slotMessage.dice.value;
            bot.sendMessage(chatId, `Результат: ${diceValue}`);
        }, 3000); // Задержка в 3 секунды для отображения результата
    });
}

module.exports = { handleCasino, updateCasinoBalance, handleHoldCommand };