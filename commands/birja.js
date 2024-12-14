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


function handleBsell(bot) {
  bot.onText(/\/б\.продать (\d+) (\d+)/i, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const amount = parseInt(match[1]);
    const price = parseFloat(match[2]);

    if (isNaN(amount) || amount <= 0 || isNaN(price) || price <= 0) {
      bot.sendMessage(
        chatId,
        "Пожалуйста, введите корректное количество и цену.",
      );
      return;
    }

    let userData;
    try {
      userData = loadUserData();
    } catch (error) {
      console.error("Ошибка загрузки userData:", error);
      bot.sendMessage(chatId, "Произошла ошибка загрузки данных пользователя.");
      return;
    }

    if (!userData[userId]) {
      userData[userId] = { pidrcoin: 0 }; // Начальное количество pidrcoin для пользователя
    }

    if (userData[userId].pidrcoin < amount) {
      bot.sendMessage(chatId, "У вас недостаточно pidrcoin для продажи.");
      return;
    }

    const auctionId = g2UID();

    userData[userId].pidrcoin -= amount;

    if (!userData.auctions) {
      userData.auctions = {};
    }

    userData.auctions[auctionId] = {
      sellerId: userId,
      amount: amount,
      price: price,
    };

    saveUserData(userData);
    logAction({
      userId: userId,
      username: userData[userId].username || 'unknown',
      action: 'Sell pidrcoin',
      amount: amount,
      price: price,
      auctionId: auctionId,
      additionalInfo: `Auction ID: ${auctionId}`
    });

    bot.sendMessage(
      chatId,
      `Вы успешно выставили ${amount} pidrcoin за ${price} монет каждую на аукцион.`,
    );
  });
}


function g2UID() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function handleBbuy(bot) {
  bot.onText(/\/б\.купить (\d+)/i, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const auctionId = match[1];

    let userData;
    try {
      userData = loadUserData();
    } catch (error) {
      console.error("Ошибка загрузки userData:", error);
      bot.sendMessage(chatId, "Произошла ошибка загрузки данных пользователя.");
      return;
    }

    if (!userData.auctions || !userData.auctions[auctionId]) {
      bot.sendMessage(chatId, "Аукцион с указанным ID не найден.");
      return;
    }

    const auctionInfo = userData.auctions[auctionId];
    const sellerId = auctionInfo.sellerId;
    const amount = auctionInfo.amount;
    const price = auctionInfo.price;

    if (
      !userData[userId] ||
      !userData[userId].balance ||
      userData[userId].balance < price * amount
    ) {
      bot.sendMessage(
        chatId,
        "У вас недостаточно денег для покупки этого количества pidrcoin."
      );
      return;
    }
    userData[userId].balance -= price * amount;
    if (!userData[userId].pidrcoin) {
      userData[userId].pidrcoin = 0;
    }
    userData[userId].pidrcoin += amount;
    if (!userData[sellerId]) {
      userData[sellerId] = { balance: 0, pidrcoin: 0 };
    } else if (!userData[sellerId].balance) {
      userData[sellerId].balance = 0;
    }
    userData[sellerId].balance += price * amount;
    delete userData.auctions[auctionId];

    saveUserData(userData);
    logAction({
      userId: userId,
      username: userData[userId].username || 'unknown',
      action: 'Buy pidrcoin',
      amount: amount,
      price: price,
      auctionId: auctionId,
      additionalInfo: `Auction ID: ${auctionId}, Seller ID: ${sellerId}`
    });

    bot.sendMessage(
      chatId,
      `Вы успешно купили ${amount} pidrcoin за ${price} монет каждую.`
    );

    bot
      .sendMessage(
        sellerId,
        `Ваши ${amount} pidrcoin были куплены за ${price} монет каждую.`
      )
      .catch((error) => {
        console.error("Ошибка отправки сообщения продавцу:", error);
      });
  });
}



function handleB(bot) {
  bot.onText(/\/биржа(?:\s+(\d+))?/i, (msg, match) => {
    const chatId = msg.chat.id;
    let currentPage = match && match[1] ? parseInt(match[1]) : 1; // Текущая страница (по умолчанию 1)
    const perPage = 10; // Количество лотов на одной странице

    let userData;
    try {
      userData = loadUserData();
    } catch (error) {
      console.error("Ошибка загрузки userData:", error);
      bot.sendMessage(chatId, "Произошла ошибка загрузки данных пользователя.");
      return;
    }

    if (!userData.auctions || Object.keys(userData.auctions).length === 0) {
      bot.sendMessage(chatId, "На бирже нет текущих лотов.");
      return;
    }

    const auctions = userData.auctions;
    const auctionIds = Object.keys(auctions);

    const totalPages = Math.ceil(auctionIds.length / perPage);

    if (currentPage < 1 || currentPage > totalPages) {
      bot.sendMessage(chatId, `Страница ${currentPage} не существует.`);
      return;
    }

    let response = `Текущие лоты на бирже (Страница ${currentPage}/${totalPages}):\n`;

    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    const currentAuctionIds = auctionIds.slice(startIndex, endIndex);

    currentAuctionIds.forEach(id => {
      const auction = auctions[id];
      response += `ID: <code>${id}</code>, ${auction.amount} pidrcoin за ${auction.price} монет каждую\n`;
    });

    bot.sendMessage(chatId, response, { parse_mode: 'HTML' }).catch((error) => {
      console.error("Ошибка при отправке сообщения:", error);
    });
  });
}



module.exports = { handleBsell, handleBbuy, handleB };
