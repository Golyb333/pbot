const { loadUserData, saveUserData } = require("../utils/data");

function handleInvent(bot) {
bot.onText(/\/инвентарь/i, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id.toString();  // Преобразуем userId в строку для корректного сохранения

  let userData = loadUserData();
  if (!userData[userId]) {
      userData[userId] = { resources: {} };
  } else if (!userData[userId].resources) {
      userData[userId].resources = {};
  }

  saveUserData(userData);  // Сохраняем данные после возможной инициализации

  const userResources = userData[userId].resources;
  const resourceList = Object.keys(userResources);

  if (resourceList.length === 0) {
      bot.sendMessage(chatId, "У вас нет никаких ресурсов.");
  } else {
      let response = "Ваш инвентарь:\n";
      resourceList.forEach(resource => {
          response += `${resource}: ${userResources[resource]}\n`;
      });
      bot.sendMessage(chatId, response);
  }
});
};

function handleShop(bot) {
  bot.onText(/\/мусорка(\s+(\d+))?/i, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const amountToBuy = match[2] ? parseInt(match[2]) : 1;  // Default to buying 1 item

    let response = "Доступные ресурсы:\n";
    const buttons = [];

    Object.keys(shopItems).forEach(resource => {
      response += `${resource}: ${shopItems[resource]} Монет за 1 единицу\n`;
      buttons.push([{ text: `Купить ${resource}`, callback_data: `res_${resource}_${amountToBuy}_${userId}` }]);
    });

    bot.sendMessage(chatId, response, {
      reply_markup: {
        inline_keyboard: buttons
      }
    }).then(sentMessage => {
    });
  });
  bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id.toString();
    const data = query.data;

    if (data.startsWith('res_')) {
      const dataParts = data.split('_');
      const resource = dataParts[1];
      const amountToBuy = parseInt(dataParts[2]);
      const requesterId = dataParts[3];

      if (userId !== requesterId) {
        bot.answerCallbackQuery(query.id, { text: "Вы не можете покупать за других.", show_alert: true });
        return;
      }

      let userData = loadUserData();
      if (!userData[userId]) {
        userData[userId] = { resources: {}, balance: 100 }; // Initial balance of 100 coins
      } else if (!userData[userId].resources) {
        userData[userId].resources = {};
        if (!userData[userId].balance) {
          userData[userId].balance = 100; // Initial balance of 100 coins if not present
        }
      }

      const totalCost = shopItems[resource] * amountToBuy;
      if (userData[userId].balance < totalCost) {
        bot.answerCallbackQuery(query.id, { text: "Не достаточно монет для совершения операции.", show_alert: true });
        return;
      }
      userData[userId].balance -= totalCost;
      if (!userData[userId].resources[resource]) {
        userData[userId].resources[resource] = 0;
      }
      userData[userId].resources[resource] += amountToBuy;

      saveUserData(userData);  // Save updated user data

      bot.answerCallbackQuery(query.id, { text: `Вы купили ${amountToBuy} единиц ${resource}. Ваш текущий баланс: ${userData[userId].balance} монет.` });
      bot.sendMessage(chatId, `Вы купили ${amountToBuy} единиц ${resource}. Ваш текущий баланс: ${userData[userId].balance} монет.`);
      bot.deleteMessage(chatId, query.message.message_id).catch(error => {
        console.error("Error deleting message:", error);
      });
    }
  });
};

function handleCraft(bot) {
  bot.onText(/\/крафт(\s+(\d+))?/i, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const pageNumber = parseInt(match[2]) || 1; // Default to page 1 if no page number is provided
    const itemsPerPage = 5;

    const craftingKeys = Object.keys(craftingRecipes);
    const totalPages = Math.ceil(craftingKeys.length / itemsPerPage);

    if (pageNumber < 1 || pageNumber > totalPages) {
      bot.sendMessage(chatId, "Неверный номер страницы.");
      return;
    }

    let response = `Доступные рецепты для крафта (Страница ${pageNumber}/${totalPages}):\n`;
    const start = (pageNumber - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = craftingKeys.slice(start, end);

    const buttons = pageItems.map(item => [{
      text: `Создать ${item}`,
      callback_data: `craft_${item}_${userId}`
    }]);

    pageItems.forEach(item => {
      response += `${item}: ${craftingRecipes[item].description}\n`;
    });

    bot.sendMessage(chatId, response, {
      reply_markup: {
        inline_keyboard: buttons
      }
    }).then(sentMessage => {
    });
  });

  bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id.toString();
    const data = query.data;

    if (data.startsWith('craft_')) {
      const dataParts = data.split('_');
      const itemName = dataParts[1];
      const requesterId = dataParts[2];

      if (userId !== requesterId) {
        bot.answerCallbackQuery(query.id, { text: "Вы не можете крафтить за других пользователей.", show_alert: true });
        return;
      }

      let userData = loadUserData();

      if (!userData[userId]) {
        userData[userId] = { resources: {}, balance: 100 }; // Initial user data
      } else if (!userData[userId].resources) {
        userData[userId].resources = {};
      }

      const recipe = craftingRecipes[itemName];

      if (!recipe) {
        bot.answerCallbackQuery(query.id, { text: "Выбран некорректный рецепт для крафта.", show_alert: true });
        return;
      }

      let canCraft = true;
      let missingResources = [];

      Object.keys(recipe.cost).forEach(resource => {
        const requiredAmount = recipe.cost[resource];
        if (!userData[userId].resources[resource] || userData[userId].resources[resource] < requiredAmount) {
          canCraft = false;
          missingResources.push(`${resource} (нужно ${requiredAmount})`);
        }
      });

      if (!canCraft) {
        bot.answerCallbackQuery(query.id, { text: `Недостаточно следующих ресурсов для крафта: ${missingResources.join(', ')}`, show_alert: true });
        return;
      }

      Object.keys(recipe.cost).forEach(resource => {
        const requiredAmount = recipe.cost[resource];
        userData[userId].resources[resource] -= requiredAmount;
        if (userData[userId].resources[resource] <= 0) {
          delete userData[userId].resources[resource];
        }
      });

      if (!userData[userId].resources[itemName]) {
        userData[userId].resources[itemName] = 0;
      }
      userData[userId].resources[itemName]++;
      username = userData[userId].username || 'unknown';

      saveUserData(userData);

      bot.answerCallbackQuery(query.id, { text: `Вы успешно создали ${itemName}!`});
      bot.sendMessage(chatId, `Вы успешно создали ${itemName}!`);

      bot.deleteMessage(chatId, query.message.message_id).catch(error => {
        console.error("Error deleting message:", error);
      });
    }
  });
};

function handleResourceSelling(bot) {
  bot.onText(/\/р\.продать (\d+)/i, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const price = parseFloat(match[1]);

    if (isNaN(price) || price <= 0) {
      bot.sendMessage(chatId, "Пожалуйста, введите корректную цену.");
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

    if (
      !userData[userId] ||
      !userData[userId].resources ||
      Object.keys(userData[userId].resources).length === 0
    ) {
      bot.sendMessage(chatId, "У вас нет ресурсов для продажи.");
      return;
    }

    const buttons = Object.keys(userData[userId].resources).map(
      (resourceName) => {
        return [
          {
            text: `${resourceName}`,
            callback_data: `sell_${resourceName}_${userId}_${price}`,
          },
        ];
      },
    );

    bot
      .sendMessage(chatId, "Выберите ресурс для продажи:", {
        reply_markup: {
          inline_keyboard: buttons,
        },
      })
      .catch((error) => {
        console.error("Ошибка отправки сообщения:", error);
      });
  });
  bot.on("callback_query", (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id.toString();
    const data = query.data;

    if (data.startsWith("sell_")) {
      const dataParts = data.split("_");
      const resourceName = dataParts[1];
      const sellerId = dataParts[2];
      const price = parseFloat(dataParts[3]);

      if (userId !== sellerId) {
        bot.answerCallbackQuery(query.id, {
          text: "Вы не можете продавать ресурсы за других пользователей.",
          show_alert: true,
        });
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

      if (
        !userData[userId].resources[resourceName] ||
        userData[userId].resources[resourceName] <= 0
      ) {
        bot.sendMessage(chatId, "У вас нет такого ресурса для продажи.");
        return;
      }

      userData[userId].resources[resourceName]--;



      const resourceId = g2UID();

      if (!userData.market) {
        userData.market = {};
      }

      userData.market[resourceId] = {
        sellerId: userId,
        resourceName: resourceName,
        price: price,
      };

      saveUserData(userData);

      bot.sendMessage(
        chatId,
        `Вы успешно выставили "${resourceName}" на продажу за ${price} монет.`,
      );

      bot.deleteMessage(chatId, query.message.message_id).catch((error) => {
        console.error("Ошибка удаления сообщения:", error);
      });
    }
  });
}

function g2UID() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // Генерация случайного числа от 100000 до 999999
}

function handleResourceBuying(bot) {
  bot.onText(/\/р\.купить(\s+(\d+))?/i, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    let userData;
    try {
      userData = loadUserData();
    } catch (error) {
      console.error("Ошибка загрузки userData:", error);
      bot.sendMessage(chatId, "Произошла ошибка загрузки данных пользователя.");
      return;
    }

    const input = match[2];

    if (input) {
      const resourceId = parseInt(input);
      if (resourceId >= 10000) {
        if (!userData.market || !userData.market[resourceId]) {
          bot.sendMessage(
            chatId,
            "Ресурс с указанным идентификатором не найден на рынке.",
          );
          return;
        }

        const resourceInfo = userData.market[resourceId];
        const sellerId = resourceInfo.sellerId;
        const resourceName = resourceInfo.resourceName;
        const price = resourceInfo.price;

        if (
          !userData[userId] ||
          !userData[userId].balance ||
          userData[userId].balance < price
        ) {
          bot.sendMessage(
            chatId,
            "У вас недостаточно денег для покупки этого ресурса.",
          );
          return;
        }
        userData[userId].balance -= price;
        if (!userData[userId].resources) {
          userData[userId].resources = {};
        }

        if (!userData[userId].resources[resourceName]) {
          userData[userId].resources[resourceName] = 0;
        }
        userData[userId].resources[resourceName]++;
        if (!userData[sellerId]) {
          userData[sellerId] = { balance: 0, resources: {} };
        } else if (!userData[sellerId].balance) {
          userData[sellerId].balance = 0;
        }
        userData[sellerId].balance += price;
        delete userData.market[resourceId];

        saveUserData(userData);

        bot.sendMessage(
          chatId,
          `Вы успешно купили "${resourceName}" за ${price} монет.`,
        );

        bot
          .sendMessage(
            sellerId,
            `Ваш ресурс "${resourceName}" был куплен за ${price} монет.`,
          )
          .catch((error) => {
            console.error("Ошибка отправки сообщения продавцу:", error);
          });
      } else {
        const pageNumber = resourceId;
        const itemsPerPage = 10;
        const marketKeys = Object.keys(userData.market);
        const totalPages = Math.ceil(marketKeys.length / itemsPerPage);

        if (pageNumber < 1 || pageNumber > totalPages) {
          bot.sendMessage(chatId, "Неверный номер страницы.");
          return;
        }

        let response = `Доступные ресурсы на рынке (Страница ${pageNumber}/${totalPages}):\n`;
        const start = (pageNumber - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageItems = marketKeys.slice(start, end);

        pageItems.forEach((id) => {
          const resource = userData.market[id];
          response += `ID: <code>${id}</code>, Ресурс: ${resource.resourceName}, Цена: ${resource.price} монет\n`;
        });

        bot.sendMessage(chatId, response, { parse_mode: 'HTML' });
      }
    } else {
      if (!userData.market || Object.keys(userData.market).length === 0) {
        bot.sendMessage(chatId, "На рынке нет доступных ресурсов.");
        return;
      }

      let response = "Доступные ресурсы на рынке:\n";
      Object.keys(userData.market).forEach((id) => {
        const resource = userData.market[id];
        response += `ID: <code>${id}</code>, Ресурс: ${resource.resourceName}, Цена: ${resource.price} монет\n`;
      });

      bot.sendMessage(chatId, response, { parse_mode: 'HTML' });
    }
  });
}



const craftingRecipes = {
  процессор: {
    description: "Материал",
    cost: {
      сталь: 3,
      камень: 2,
      инструменты: 0,
    },
  },
  аккумулятор: {
    description: "Материал",
    cost: {
      сталь: 1,
      инструменты: 0,
    },
  },
  резистор: {
    description: "Материал",
    cost: {
      сталь: 1,
      инструменты: 0,
    },
  },
  транзистор: {
    description: "Материал",
    cost: {
      сталь: 1,
      аккумулятор: 1,
      инструменты: 0,
    },
  },
  электроннаяСхема: {
    description: "Материал",
    cost: {
      сталь: 5,
      аккумулятор: 2,
      процессор: 1,
      резистор: 2,
      транзистор: 3,
      инструменты: 0,
    },
  },
  инструменты: {
    description: "Инструмент",
    cost: {
      сталь: 20,
    },
  },
  нож: {
    description: "Инструмент",
    cost: {
      сталь: 15,
      инструменты: 0,
      дерево: 5,
    },
  },
  обработанноеДерево: {
    description: "Материал",
    cost: {
      дерево: 1,
      нож: 0,
    },
  },
  умнаяУдочка: {
    description: "Позволит включить авторыбалку",
    cost: {
      электроннаяСхема: 1,
      инструменты: 0,
      обработанноеДерево: 3,
      нож: 0,
      шкура: 2,
    },
  },
  майнингФерма: {
    description: "Позволит майнить пидркоины",
    cost: {
      электроннаяСхема: 1,
      инструменты: 0,
      резистор: 4,
      транзистор: 5,
      аккумулятор: 6,
    },
  },
};

const shopItems = {
  дерево: 40,
  шкура: 45,
  камень: 30,
  сталь: 110,
};

module.exports = { handleInvent, handleShop, handleCraft, handleResourceBuying, handleResourceSelling };
