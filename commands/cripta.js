const { loadUserData, saveUserData } = require("../utils/data");
const request = require("request");
const path = require("path");
const fs = require("fs");
const fetch = require('node-fetch');

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
  const logMessage = `[${new Date().toISOString()}] User: ${username} (ID: ${userId}), Action: ${action}, Amount: ${amount}, Balance: ${balance}, ${additionalInfo}\n`;

  fs.appendFile(logFilePath, logMessage, (err) => {
    if (err) {
      console.error("Ошибка записи в лог:", err);
    }
  });
}

let coinValues = {};
function updateCoinValues() {
  const apiUrl =
    "https://api.coinlore.net/api/ticker/?id=90,80,54683,2,1,93841,45088,2713";
  request(apiUrl, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      const data = JSON.parse(body);
      if (data && Array.isArray(data)) {
        data.forEach((coin) => {
          coinValues[coin.name] = {
            price_usd: parseFloat(coin.price_usd),
            percent_change_1h: parseFloat(coin.percent_change_1h),
            percent_change_24h: parseFloat(coin.percent_change_24h),
          };
        });
      }
    } else {
      console.error("Error fetching cryptocurrency values:", error);
    }
  });
}
function handleBuyCripta(bot) {
  bot.on("callback_query", (callbackQuery) => {
    const dataParts = callbackQuery.data.split("_");
    const action = dataParts[0];
    const coin = dataParts[1];
    const amount = parseInt(dataParts[2]);
    const userId = callbackQuery.from.id;
    const originalUserId = dataParts[3];

    if (action !== "kbuy") return;

    if (userId.toString() !== originalUserId) {
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "You cannot buy coins for another user.",
        show_alert: true,
      });
      return;
    }

    let userData = loadUserData();
    if (!userData[userId]) {
      userData[userId] = { balance: 0, coins: {} };
    }

    const totalCost = amount * coinValues[coin].price_usd;

    if (userData[userId].balance < totalCost) {
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "You don't have enough coins to buy.",
        show_alert: true,
      });
      return;
    }

    userData[userId].balance -= totalCost;
    userData[userId].coins[coin] = (userData[userId].coins[coin] || 0) + amount;
    saveUserData(userData);

    logAction({
      userId: userId,
      username: userData[userId].username || 'unknown',
      action: 'Cripta bought',
      amount: totalCost,
      balance: userData[userId].balance,
      additionalInfo: `Coin: ${coin}, Amount: ${amount}`
    });

    bot.answerCallbackQuery(callbackQuery.id, {
      text: `You successfully bought ${amount} ${coin} for ${totalCost} coins.`,
    });

    bot.deleteMessage(callbackQuery.message.chat.id, callbackQuery.message.message_id);

    bot.sendMessage(
      callbackQuery.message.chat.id,
      `You successfully bought ${amount} ${coin} for ${totalCost} coins.`
    );
  });

  bot.onText(/\/купить (\d+)/i, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const amountToBuy = parseInt(match[1]);

    if (isNaN(amountToBuy) || amountToBuy <= 0) {
      bot.sendMessage(chatId, "Please enter a valid amount to buy.");
      return;
    }

    const coinButtons = Object.keys(coinValues).map((coin) => [
      {
        text: `${coin} (${coinValues[coin].price_usd} coins)`,
        callback_data: `kbuy_${coin}_${amountToBuy}_${userId}`,
      },
    ]);

    bot.sendMessage(chatId, "Choose the cryptocurrency to buy:", {
      reply_markup: {
        inline_keyboard: coinButtons,
      },
    });
  });
}
function handleSellCripta(bot) {
  bot.on("callback_query", (callbackQuery) => {
    const dataParts = callbackQuery.data.split("_");
    const action = dataParts[0];
    const coin = dataParts[1];
    const amount = parseInt(dataParts[2]);
    const userId = callbackQuery.from.id;
    const originalUserId = dataParts[3];

    if (action !== "ksell") return;

    if (userId.toString() !== originalUserId) {
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "You cannot sell coins for another user.",
        show_alert: true,
      });
      return;
    }

    let userData = loadUserData();
    if (
      !userData[userId] ||
      !userData[userId].coins ||
      !userData[userId].coins[coin] ||
      userData[userId].coins[coin] < amount
    ) {
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "You don't have enough coins to sell.",
        show_alert: true,
      });
      return;
    }

    const totalEarnings = amount * coinValues[coin].price_usd;

    userData[userId].coins[coin] -= amount;
    if (userData[userId].coins[coin] === 0) {
      delete userData[userId].coins[coin];
    }
    userData[userId].balance += totalEarnings;
    saveUserData(userData);

    logAction({
      userId: userId,
      username: userData[userId].username || 'unknown',
      action: 'Cripta sell',
      amount: totalEarnings,
      balance: userData[userId].balance,
      additionalInfo: `Coin: ${coin}, Amount: ${amount}`
    });

    bot.answerCallbackQuery(callbackQuery.id, {
      text: `You successfully sold ${amount} ${coin} for ${totalEarnings} coins.`,
    });

    bot.deleteMessage(callbackQuery.message.chat.id, callbackQuery.message.message_id);

    bot.sendMessage(
      callbackQuery.message.chat.id,
      `You successfully sold ${amount} ${coin} for ${totalEarnings} coins.`
    );
  });

  bot.onText(/\/продать (\d+)/i, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const amountToSell = parseInt(match[1]);

    if (isNaN(amountToSell) || amountToSell <= 0) {
      bot.sendMessage(chatId, "Please enter a valid amount to sell.");
      return;
    }

    const userData = loadUserData();

    if (!userData[userId] || !userData[userId].coins) {
      bot.sendMessage(chatId, "You have no cryptocurrencies to sell.");
      return;
    }

    const coinButtons = Object.keys(userData[userId].coins)
      .filter((coin) => userData[userId].coins[coin] >= amountToSell)
      .map((coin) => [
        {
          text: `${coin} (${coinValues[coin].price_usd} coins)`,
          callback_data: `ksell_${coin}_${amountToSell}_${userId}`,
        },
      ]);

    if (coinButtons.length === 0) {
      bot.sendMessage(chatId, "You don't have enough of any cryptocurrency to sell this amount.");
    } else {
      bot.sendMessage(chatId, "Choose the cryptocurrency to sell:", {
        reply_markup: {
          inline_keyboard: coinButtons,
        },
      });
    }
  });
};

function handleCripta(bot) {
  bot.onText(/\/крипта/i, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const userData = loadUserData();

    saveUserData(userData);

    let message = "Текущие цены криптовалют:\n";

    for (const [name, value] of Object.entries(coinValues)) {
      const percentChange1h = value.percent_change_1h || 0;
      const percentChange24h = value.percent_change_24h || 0;
      const percentChange1hArrow = percentChange1h >= 0 ? "⬆️" : "⬇️";
      const percentChange24hArrow = percentChange24h >= 0 ? "⬆️" : "⬇️";
      const price = value.price_usd;

      message += `${name}: ${price} монет (${percentChange1hArrow} ${Math.abs(percentChange1h)}% 1ч) (${percentChange24hArrow} ${Math.abs(percentChange24h)}% 24ч)\n`;
    }

    message += "\nВаши криптовалюты:\n";
    let totalBalance = 0;

    if (userData[userId] && userData[userId].coins) {
      let hasCoins = false;
      for (const [name, amount] of Object.entries(userData[userId].coins)) {
        if (amount > 0 && coinValues[name]) {
          hasCoins = true;
          const value = coinValues[name].price_usd;
          const coinBalance = amount * value;
          message += `${name}: ${amount} (цена: ${coinBalance} монет)\n`;
          totalBalance += coinBalance;
        }
      }
      if (!hasCoins) {
        message += "У вас нет криптовалют.";
      }
    } else {
      message += "У вас нет криптовалют.";
    }

    bot.sendMessage(chatId, message);
  });
};

  function generatePriceChart(coin, callback) {
    const coinMapping = {
      'ton-coin': 'the-open-network',
      'shiba-inu': 'shiba-inu',
    };

    const apiCoin = coinMapping[coin] || coin; // Использовать исправленное имя или оригинальное

    const apiUrl = `https://api.coingecko.com/api/v3/coins/${apiCoin}/market_chart?vs_currency=usd&days=1`;

    request(apiUrl, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        const data = JSON.parse(body);

        if (data && data.prices) {
          const maxPoints = 50;
          const prices = data.prices.slice(-maxPoints); // Последние 24 точки данных
          const timestamps = prices.map(([timestamp]) => new Date(timestamp).toLocaleTimeString());
          const priceValues = prices.map(([, price]) => price);

          const chartData = JSON.stringify({
            type: 'line',
            data: {
              labels: timestamps,
              datasets: [
                {
                  label: `Price of ${coin}`,
                  data: priceValues,
                  borderColor: 'rgba(75, 192, 192, 1)',
                  backgroundColor: 'rgba(75, 192, 192, 0.2)',
                  borderWidth: 1,
                  fill: false,
                },
              ],
            },
            options: {
              responsive: true,
              scales: {
                x: {
                  ticks: {
                    maxRotation: 45,
                    minRotation: 45,
                  },
                },
                y: {
                  beginAtZero: true,
                },
              },
              plugins: {
                legend: {
                  display: true,
                  position: 'top',
                },
                title: {
                  display: true,
                  text: `Price Chart for ${coin}`,
                },
              },
            },
          });

          const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(chartData)}`;
          console.log('Requesting chart URL:', chartUrl); // Логирование URL

          const filePath = path.join(__dirname, `${coin}-price-chart.png`);
          fetch(chartUrl)
            .then(response => {
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              return response.buffer();
            })
            .then(buffer => {
              fs.writeFile(filePath, buffer, (err) => {
                if (err) {
                  callback(err, null);
                } else {
                  callback(null, filePath);
                }
              });
            })
            .catch(err => callback(err, null));
        } else {
          callback("No data for chart", null);
        }
      } else {
        callback("Error fetching chart data", null);
      }
    });
  }



function handlePriceChart(bot) {
  bot.onText(/\/график/i, (msg) => {
    const chatId = msg.chat.id;
    const coinButtons = Object.keys(coinValues).map((coin) => [
      {
        text: `${coin}`,
        callback_data: `chart_${coin.toLowerCase().replace(/\s+/g, "-")}`,
      },
    ]);

    bot.sendMessage(chatId, "Выберите криптовалюту для отображения графика:", {
      reply_markup: {
        inline_keyboard: coinButtons,
      },
    })
    .then(sentMessage => {
      bot.on("callback_query", (callbackQuery) => {
        const dataParts = callbackQuery.data.split("_");
        const action = dataParts[0];
        const coin = dataParts[1];

        if (action !== "chart") return;

        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;

        generatePriceChart(coin, (error, filePath) => {
          if (error) {
            bot.sendMessage(chatId, "Ошибка при создании графика: " + error);
          } else {
            bot.sendPhoto(chatId, filePath, { caption: `График цен для ${coin}` })
              .then(() => {
                fs.unlink(filePath, (err) => {
                  if (err) console.error("Ошибка при удалении файла:", err);
                });
                bot.deleteMessage(chatId, messageId)
                  .catch(err => console.error("Ошибка при удалении сообщения:", err));
              })
              .catch(err => bot.sendMessage(chatId, "Ошибка при отправке графика: " + err));
          }
        });
        bot.deleteMessage(chatId, messageId)
          .catch(err => console.error("Ошибка при удалении сообщения:", err));
      });
    });
  });
}



module.exports = { handleBuyCripta, handleSellCripta, handleCripta, handlePriceChart, updateCoinValues };

