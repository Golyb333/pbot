const { loadUserData, saveUserData } = require("../utils/data");

const fishingCooldown = 5 * 60 * 1000;
let marketPrices = {}; // Цены на рынке

const fishTypes = {
  треска: { minWeight: 1.0, maxWeight: 2.0, minPrice: 55, maxPrice: 70 },
  красноперка: { minWeight: 0.5, maxWeight: 1.5, minPrice: 60, maxPrice: 80 },
  карась: { minWeight: 0.8, maxWeight: 1.2, minPrice: 45, maxPrice: 65 },
  лещ: { minWeight: 1.5, maxWeight: 2.5, minPrice: 70, maxPrice: 90 },
  щука: { minWeight: 3.0, maxWeight: 5.0, minPrice: 100, maxPrice: 125 },
  окунь: { minWeight: 0.5, maxWeight: 1.0, minPrice: 30, maxPrice: 50 },
  сом: { minWeight: 3.0, maxWeight: 5.0, minPrice: 110, maxPrice: 130 },
  сельдь: { minWeight: 0.3, maxWeight: 0.7, minPrice: 20, maxPrice: 35 },
  карп: { minWeight: 1.0, maxWeight: 2.0, minPrice: 50, maxPrice: 70 },
  язь: { minWeight: 0.7, maxWeight: 1.5, minPrice: 40, maxPrice: 60 },
  плотва: { minWeight: 0.3, maxWeight: 0.8, minPrice: 25, maxPrice: 45 },
  "белый амур": { minWeight: 1.5, maxWeight: 3.0, minPrice: 90, maxPrice: 110 },
  лосось: { minWeight: 2.0, maxWeight: 7.0, minPrice: 150, maxPrice: 200 },
  кета: { minWeight: 1.0, maxWeight: 3.0, minPrice: 80, maxPrice: 100 },
  горбуша: { minWeight: 0.4, maxWeight: 1.0, minPrice: 30, maxPrice: 55 },
  кальмар: { minWeight: 0.3, maxWeight: 1.5, minPrice: 60, maxPrice: 85 },
};

function handlePrices(bot) {
  bot.onText(/\/цены/i, (msg) => {
    const chatId = msg.chat.id;
    let priceList = "Текущие рыночные цены:\n";
    Object.keys(fishTypes).forEach((fish) => {
      const { minPrice, maxPrice } = fishTypes[fish];
      priceList += `${fish}: ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)} монет\n`;
    });
    bot.sendMessage(chatId, priceList + "\nЦены обновляются каждые 25 минут");
  });
};

function updateMarketPrices() {
  Object.keys(fishTypes).forEach((fish) => {
    const { minPrice, maxPrice } = fishTypes[fish];
    const currentPrice = getRandomFloat(minPrice, maxPrice);
    marketPrices[fish] = currentPrice;
  });
}

function handleFishing(bot) {
  bot.onText(/\/(рыбалка|рыбалко|рыба)/i, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
  
    let userData = loadUserData();
    if (!userData[userId]) {
      userData[userId] = { inventory: {}, lastFishingTime: 0 };
    }
  
    if (!userData[userId].inventory) {
      userData[userId].inventory = {};
    }
  
    const now = Date.now();
    const lastFishingTime = userData[userId].lastFishingTime || 0;
  
    if (now - lastFishingTime >= fishingCooldown) {
      userData[userId].lastFishingTime = now;
      const chance = Math.random() * 100;
      if (chance <= 65) {
        const fishNames = Object.keys(fishTypes);
        const fishName = fishNames[Math.floor(Math.random() * fishNames.length)];
        const fishData = fishTypes[fishName];
        const weight = getRandomFloat(fishData.minWeight, fishData.maxWeight);
  
        if (!userData[userId].inventory[fishName]) {
          userData[userId].inventory[fishName] = { count: 0, totalWeight: 0 };
        }
        userData[userId].inventory[fishName].count++;
        userData[userId].inventory[fishName].totalWeight += weight;
  
        bot.sendMessage(
          chatId,
          `Поздравляем! Вы поймали ${fishName} весом ${weight.toFixed(2)} кг и она добавлена в вашу сеть.`,
        );
      } else {
        bot.sendMessage(chatId, "К сожалению, вы ничего не поймали.");
      }
  
      saveUserData(userData);
    } else {
      const waitTime = Math.ceil(
        (fishingCooldown - (now - lastFishingTime)) / 1000 / 60,
      );
      bot.sendMessage(
        chatId,
        `Вы уже рыбачили недавно. Пожалуйста, подождите еще ${waitTime} минут.`,
      );
    }
  });
};

function handleCet(bot) {
  bot.onText(/\/сеть/i, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
  
    let userData = loadUserData();
  
    if (userData[userId] && userData[userId].inventory) {
      const inventory = userData[userId].inventory;
      let inventoryList = "Ваша сеть:\n";
      Object.keys(inventory).forEach((fish) => {
        inventoryList += `${inventory[fish].count} ${fish} (общий вес: ${inventory[fish].totalWeight.toFixed(2)} кг)\n`;
      });
      bot.sendMessage(chatId, inventoryList);
    } else {
      bot.sendMessage(chatId, "Ваша сеть пуста.");
    }
  });
};

let marketMessageIds = [];

function handleMarket(bot) {
  bot.onText(/\/рынок/i, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    let userData = loadUserData();

    if (userData[userId] && userData[userId].inventory) {
      const inventory = userData[userId].inventory;
      const fishButtons = Object.keys(inventory).map((fish) => [
        {
          text: `${inventory[fish].count} ${fish} (${marketPrices[fish].toFixed(2)} монет)`,
          callback_data: `fsh_${fish}_${userId}`,
        },
      ]);

      if (fishButtons.length > 0) {
        bot.sendMessage(chatId, "Выберите рыбу для продажи:", {
          reply_markup: {
            inline_keyboard: fishButtons,
          },
        }).then((sentMessage) => {
          marketMessageIds.push(sentMessage.message_id); // Store the message ID
        });
      } else {
        bot.sendMessage(chatId, "Ваша сеть пуста.");
      }
    } else {
      bot.sendMessage(chatId, "Ваша сеть пуста.");
    }
  });
  bot.on("callback_query", (callbackQuery) => {
    const dataParts = callbackQuery.data.split("_");
    const type = dataParts[0]; // should be 'fsh'
    const fish = dataParts[1];
    const originalUserId = dataParts[2];
    const userId = callbackQuery.from.id;

    if (type !== "fsh") {
      return;
    }

    if (userId.toString() !== originalUserId) {
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Вы не можете продать рыбу чужого пользователя.",
        show_alert: true,
      });
      return;
    }

    let userData = loadUserData();

    if (
      userData[userId] &&
      userData[userId].inventory &&
      userData[userId].inventory[fish]
    ) {
      const fishCount = userData[userId].inventory[fish].count;
      const fishWeight = userData[userId].inventory[fish].totalWeight;
      const totalPrice = marketPrices[fish] * fishCount;
      userData[userId].balance = (userData[userId].balance || 0) + totalPrice;
      userData[userId].inventory[fish] = { count: 0, totalWeight: 0 };
      if (userData[userId].inventory[fish].count === 0) {
        delete userData[userId].inventory[fish];
      }

      saveUserData(userData);

      bot.answerCallbackQuery(callbackQuery.id, {
        text: `Вы продали ${fishCount} ${fish} (${fishWeight.toFixed(2)} кг)\nза ${totalPrice.toFixed(2)} монет.`,
      });
      marketMessageIds.forEach((messageId) => {
        bot.deleteMessage(callbackQuery.message.chat.id, messageId).catch((error) => {
          console.error("Error deleting market message:", error);
        });
      });
      marketMessageIds = []; // Clear the message IDs array
      if (Object.keys(userData[userId].inventory).length > 0) {
        const updatedFishButtons = Object.keys(userData[userId].inventory).map((fish) => [
          {
            text: `${userData[userId].inventory[fish].count} ${fish} (${marketPrices[fish].toFixed(2)} монет)`,
            callback_data: `fsh_${fish}_${userId}`,
          },
        ]);

        bot.sendMessage(callbackQuery.message.chat.id, "Выберите рыбу для продажи:", {
          reply_markup: {
            inline_keyboard: updatedFishButtons,
          },
        }).then((sentMessage) => {
          marketMessageIds.push(sentMessage.message_id); // Store the new message ID
        });
      } else {
        bot.sendMessage(callbackQuery.message.chat.id, "Ваша сеть пуста.");
      }
    } else {
      bot.answerCallbackQuery(callbackQuery.id, {
        text: "Error occurred while selling fish.",
        show_alert: true,
      });
    }
  });
}


let fishingIntervals = {};

function handleAutoFish(bot) {
  bot.onText(/^\/авторыбалка (вкл|выкл)$/i, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const action = match[1].toLowerCase();
  
    let userData = loadUserData();
    if (
      !userData[userId] ||
      !userData[userId].resources ||
      !userData[userId].resources["умнаяУдочка"]
    ) {
      bot.sendMessage(chatId, "У вас нет умной удочки в инвентаре.");
      return;
    }
    if (action === "вкл") {
      if (fishingIntervals[userId]) {
        bot.sendMessage(chatId, "Авторыбалка уже включена.");
      } else {
        fishingIntervals[userId] = setInterval(() => {
          fishAutomatically(userId);
        }, fishingCooldown);
  
        userData[userId].autoFishing = true; // Сохраняем состояние авторыбалки
        userData[userId].lastCheckTime = Date.now(); // Сохраняем время последней проверки
        bot.sendMessage(chatId, "Авторыбалка включена.");
      }
    }
    if (action === "выкл") {
      if (fishingIntervals[userId]) {
        clearInterval(fishingIntervals[userId]);
        delete fishingIntervals[userId];
        userData[userId].autoFishing = false; // Сохраняем состояние авторыбалки
        bot.sendMessage(chatId, "Авторыбалка выключена.");
      } else {
        bot.sendMessage(chatId, "Авторыбалка уже выключена.");
      }
    }
  
    saveUserData(userData);
  });
};
function fishAutomatically(userId) {
  let userData = loadUserData();
  if (!userData[userId]) {
    userData[userId] = { inventory: {}, lastFishingTime: 0, lastCheckTime: 0 };
  }

  const now = Date.now();
  const lastFishingTime = userData[userId].lastFishingTime || 0;
  const lastCheckTime = userData[userId].lastCheckTime || 0;
  userData[userId].lastCheckTime = now;

  if (now - lastFishingTime >= fishingCooldown) {
    userData[userId].lastFishingTime = now;
    const chance = Math.random() * 100;
    if (chance <= 50) {
      const fishNames = Object.keys(fishTypes);
      const fishName = fishNames[Math.floor(Math.random() * fishNames.length)];
      const fishData = fishTypes[fishName];
      const weight = getRandomFloat(fishData.minWeight, fishData.maxWeight);

      if (!userData[userId].inventory[fishName]) {
        userData[userId].inventory[fishName] = { count: 0, totalWeight: 0 };
      }
      userData[userId].inventory[fishName].count++;
      userData[userId].inventory[fishName].totalWeight += weight;

      const message = `Поздравляем! Вы поймали ${fishName} весом ${weight.toFixed(2)} кг и она добавлена в ваш инвентарь.`;
    }

    saveUserData(userData);
  }
}
let userData = loadUserData();
Object.keys(userData).forEach((userId) => {
  if (userData[userId].autoFishing) {
    const now = Date.now();
    const lastCheckTime = userData[userId].lastCheckTime || now;
    const timeElapsed = now - lastCheckTime;
    if (timeElapsed > 4 * 60 * 1000) {
      const missedFishingSessions = Math.floor(timeElapsed / fishingCooldown);
      for (let i = 0; i < missedFishingSessions; i++) {
        fishAutomatically(userId);
      }
    }
    fishingIntervals[userId] = setInterval(() => {
      fishAutomatically(userId);
    }, fishingCooldown);
  }
});

function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

module.exports = { handleMarket, handleCet, handleFishing, handleAutoFish, handlePrices, updateMarketPrices };