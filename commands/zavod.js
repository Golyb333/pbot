// const { loadUserData, saveUserData } = require("../utils/data");
// const path = require("path");
// const fs = require("fs");
// const { Markup } = require('node-telegram-bot-api');

// function formatNumber(number) {
//   return number.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// }

// function logAction({
//   userId,
//   username,
//   action,
//   amount,
//   balance,
//   additionalInfo = "",
// }) {
//   const logFilePath = path.join(__dirname, "logs.txt");
//   const logMessage = `[${new Date().toISOString()}] User: ${username} (ID: ${userId}), Action: ${action}, Amount: ${formatNumber(amount)}, Balance: ${formatNumber(balance)}, ${additionalInfo}\n`;

//   fs.appendFile(logFilePath, logMessage, (err) => {
//     if (err) {
//       console.error("Ошибка записи в лог:", err);
//     }
//   });
// }

// // Базовые настройки дохода и цены на завод
// const factoryEarningsPerHour = 500; // Базовый доход в час
// const factoryPrice = 2000;

// const mainFactories = ["Металлургический", "Электронный", "Машиностроительный"];
// const supportFactories = ["Автомобильный", "Текстильный"];
// let factoryIdCounter = 1; // Counter for unique factory IDs

// const upgradePaths = {
//     "Металлургический": {
//         path1: { name: "Скорость Плавки", cost: 1500, multiplier: 1.2, description: "Увеличивает скорость плавки." },
//         path2: { name: "Эффективность Сырья", cost: 2000, multiplier: 1.5, description: "Улучшает качество сырья." },
//     },
//     "Электронный": {
//         path1: { name: "Новые Технологии", cost: 1600, multiplier: 1.25, description: "Внедряет новые технологии." },
//         path2: { name: "Автоматизация", cost: 2500, multiplier: 1.6, description: "Автоматизирует процессы." },
//     },
//     "Машиностроительный": {
//         path1: { name: "Ускоренные Процессы", cost: 1700, multiplier: 1.3, description: "Ускоряет производственные процессы." },
//         path2: { name: "Нанотехнологии", cost: 3000, multiplier: 1.7, description: "Внедряет нанотехнологии для улучшения продукции." },
//     },
//     "Автомобильный": {
//         path1: { name: "Сборочная Линия", cost: 1800, multiplier: 1.3, description: "Создает более эффективные сборочные линии." },
//         path2: { name: "Оптимизация Рабочих", cost: 2200, multiplier: 1.4, description: "Оптимизирует рабочие процессы." },
//     },
//     "Текстильный": {
//         path1: { name: "Модернизация Оборудования", cost: 1400, multiplier: 1.15, description: "Модернизирует оборудование для повышения эффективности." },
//         path2: { name: "Расширение Продукции", cost: 2100, multiplier: 1.35, description: "Расширяет ассортимент продукции." },
//     },
// };


// // Объединяем информацию о заводах и их взаимодействии
// const factoryRelations = {
//   "Металлургический": ["Электронный", "Машиностроительный"],
//   "Электронный": ["Машиностроительный", "Электронный"],
//   "Машиностроительный": [],
//   "Автомобильный": ["Электронный"],
//   "Текстильный": [],
// };

// function generateFactoryName() {
//   const randomIndex = Math.floor(Math.random() * (mainFactories.length + supportFactories.length));
//   return randomIndex < mainFactories.length
//     ? `${mainFactories[randomIndex]} завод`
//     : `${supportFactories[randomIndex - mainFactories.length]} завод`;
// }

// function handleFactory(bot) {
//   bot.onText(/\/купить_завод/i, (msg) => {
//     const chatId = msg.chat.id;
//     const userId = msg.from.id;
//     const username = msg.from.username;

//     let userData = loadUserData();

//     // Ensure user data is initialized properly
//     if (!userData[userId]) {
//       userData[userId] = { factories: [], balance: 0, username: username };
//     }

//     // Initialize factories array if undefined
//     if (!userData[userId].factories) {
//       userData[userId].factories = [];
//     }

//     if (userData[userId].balance < factoryPrice) {
//       bot.sendMessage(chatId, `Недостаточно средств. Цена одного завода: ${formatNumber(factoryPrice)} монет.`);
//       return;
//     }

//     const newFactoryName = generateFactoryName();
//     const factoryId = factoryIdCounter++; // Assign a unique ID
//     userData[userId].factories.push({
//       id: factoryId, // Unique ID for the factory
//       name: newFactoryName,
//       lastEarningsUpdate: Date.now(),
//       earningsPerHour: factoryEarningsPerHour,
//       upgrade: null,
//       type: mainFactories.includes(newFactoryName.split(" ")[0]) ? "main" : "support",
//     });
//     userData[userId].balance -= factoryPrice;

//     bot.sendMessage(chatId, `Вы купили новый завод: ${newFactoryName}. Теперь у вас ${userData[userId].factories.length} заводов.`);
//     logAction({
//       userId: userId,
//       username: userData[userId].username || 'unknown',
//       action: 'Factory Purchase',
//       amount: -factoryPrice,
//       balance: userData[userId].balance,
//       additionalInfo: `New Factory: ${newFactoryName} (ID: ${factoryId})`
//     });

//     saveUserData(userData);
//   });


// bot.on('callback_query', (callbackQuery) => {
//     const chatId = callbackQuery.message.chat.id;
//     const userId = callbackQuery.from.id;
//     const data = callbackQuery.data.split(':');

//     if (data[0] === 'upgrade') {
//         const factoryId = parseInt(data[1]);
//         const pathKey = data[2];

//         let userData = loadUserData();
//         const factory = userData[userId]?.factories.find(f => f.id === factoryId); // Find factory by ID

//         if (!factory) {
//             bot.sendMessage(chatId, "Такого завода не существует.");
//             return;
//         }

//         const upgrade = upgradePaths[factory.name.split(" ")[0]][pathKey];

//         if (!upgrade) {
//             bot.sendMessage(chatId, "Неверный путь улучшения.");
//             return;
//         }

//         if (factory.upgrade) {
//             bot.sendMessage(chatId, "Этот завод уже улучшен. Выберите другой завод для улучшения.");
//             return;
//         }

//         if (userData[userId].balance < upgrade.cost) {
//             bot.sendMessage(chatId, `Недостаточно средств для улучшения. Требуется: ${formatNumber(upgrade.cost)} монет.`);
//             return;
//         }

//         userData[userId].balance -= upgrade.cost;
//         factory.earningsPerHour *= upgrade.multiplier;
//         factory.upgrade = upgrade.name;

//         bot.sendMessage(chatId, `Вы улучшили ${factory.name} по пути "${upgrade.name}". Текущий доход: ${formatNumber(factory.earningsPerHour)} монет в час.`)
//             .then(() => {
//                 bot.deleteMessage(chatId, callbackQuery.message.message_id); // Delete the upgrade message
//             });

//         logAction({
//             userId: userId,
//             username: userData[userId].username || 'unknown',
//             action: 'Factory Upgrade',
//             amount: -upgrade.cost,
//             balance: userData[userId].balance,
//             additionalInfo: `Upgraded ${factory.name} with ${upgrade.name}`
//         });

//         saveUserData(userData);
//         bot.answerCallbackQuery(callbackQuery.id); // Acknowledge the callback
//     }
// });



//   // Handle inline button clicks for upgrades
//   bot.on('callback_query', (callbackQuery) => {
//     const chatId = callbackQuery.message.chat.id;
//     const userId = callbackQuery.from.id;
//     const data = callbackQuery.data.split(':');

//     if (data[0] === 'upgrade') {
//       const factoryId = parseInt(data[1]);
//       const pathKey = data[2];

//       let userData = loadUserData();
//       const factory = userData[userId]?.factories.find(f => f.id === factoryId); // Find factory by ID

//       if (!factory) {
//         bot.sendMessage(chatId, "Такого завода не существует.");
//         return;
//       }

//       const upgrade = upgradePaths[factory.name.split(" ")[0]][pathKey];

//       if (!upgrade) {
//         bot.sendMessage(chatId, "Неверный путь улучшения.");
//         return;
//       }

//       if (factory.upgrade) {
//         bot.sendMessage(chatId, "Этот завод уже улучшен. Выберите другой завод для улучшения.");
//         return;
//       }

//       if (userData[userId].balance < upgrade.cost) {
//         bot.sendMessage(chatId, `Недостаточно средств для улучшения. Требуется: ${formatNumber(upgrade.cost)} монет.`);
//         return;
//       }

//       userData[userId].balance -= upgrade.cost;
//       factory.earningsPerHour *= upgrade.multiplier;
//       factory.upgrade = upgrade.name;

//       bot.sendMessage(chatId, `Вы улучшили ${factory.name} по пути "${upgrade.name}". Текущий доход: ${formatNumber(factory.earningsPerHour)} монет в час.`);
//       logAction({
//         userId: userId,
//         username: userData[userId].username || 'unknown',
//         action: 'Factory Upgrade',
//         amount: -upgrade.cost,
//         balance: userData[userId].balance,
//         additionalInfo: `Upgraded ${factory.name} with ${upgrade.name}`
//       });

//       saveUserData(userData);
//       bot.answerCallbackQuery(callbackQuery.id); // Acknowledge the callback
//     }
//   });

//   bot.onText(/\/собрать/i, (msg) => {
//   const chatId = msg.chat.id;
//   const userId = msg.from.id;

//   let userData = loadUserData();
//   if (!userData[userId] || !userData[userId].factories || userData[userId].factories.length === 0) {
//     bot.sendMessage(chatId, "У вас нет заводов. Используйте /купить_завод, чтобы купить первый.");
//     return;
//   }

//   const currentTime = Date.now();
//   let totalEarnings = 0;

//   userData[userId].factories.forEach((factory) => {
//     const timePassed = (currentTime - (factory.lastEarningsUpdate || currentTime)) / (1000 * 60 * 60); // Time in hours
//     const earnings = timePassed * factory.earningsPerHour;
//     totalEarnings += earnings;
//     factory.lastEarningsUpdate = currentTime;

//     // Define factoryType based on the current factory
//     const factoryType = factory.name.split(" ")[0]; // Get the type from the factory name

//     // Check if the factory is a support type and apply the boost to main factories
//     if (factory.type === "support") {
//       const mainFactoryNames = factoryRelations[factoryType] || [];
//       mainFactoryNames.forEach((mainFactoryName) => {
//         const mainFactory = userData[userId].factories.find(f => f.name.startsWith(mainFactoryName));
//         if (mainFactory) {
//           mainFactory.earningsPerHour *= 1.1; // Apply boost from the support factory
//         }
//       });
//     }
//   });

//   userData[userId].balance += totalEarnings;

//   bot.sendMessage(chatId, `Вы собрали ${formatNumber(totalEarnings)} монет с ваших заводов.`);
//   logAction({
//     userId: userId,
//     username: userData[userId].username || 'unknown',
//     action: 'Factory Collection',
//     amount: totalEarnings,
//     balance: userData[userId].balance,
//     additionalInfo: `Factories Count: ${userData[userId].factories.length}`
//   });

//   saveUserData(userData);
// });


//   bot.onText(/\/мои_заводы/i, (msg) => {
//     const chatId = msg.chat.id;
//     const userId = msg.from.id;

//     let userData = loadUserData();

//     if (!userData[userId] || !userData[userId].factories || userData[userId].factories.length === 0) {
//       bot.sendMessage(chatId, "У вас нет заводов.");
//       return;
//     }

//     bot.sendMessage(chatId, Ваши заводы:\n${userData[userId].factories
//   .map((factory, index) => ${index + 1}. ${factory.name} - Доход: ${formatNumber(factory.earningsPerHour)} монет/час (Улучшение: ${factory.upgrade || "нет"}))
//   .join("\n")});
// }

// module.exports = handleFactory;
