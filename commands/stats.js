const fs = require('fs').promises; // Используем асинхронную версию модуля fs
const path = require('path');
const statsFilePath = path.join(__dirname, 'chatStats.json');
async function loadChatStats() {
  try {
    const data = await fs.readFile(statsFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return {}; // Возвращаем пустой объект, если файл не найден или ошибка при чтении
  }
}
async function saveChatStats(stats) {
  await fs.writeFile(statsFilePath, JSON.stringify(stats, null, 2));
}
function initializeChatStats(chatId, username) {
  return {
    [chatId]: {
      [username]: {
        messagesToday: 0,
        messagesLastWeek: 0,
        messagesAllTime: 0, // Статистика за все время
      },
    },
  };
}
async function updateChatStats(chatId, username) {
  const chatStats = await loadChatStats();

  if (!chatStats[chatId]) {
    chatStats[chatId] = {};
  }

  if (!chatStats[chatId][username]) {
    chatStats[chatId][username] = {
      messagesToday: 0,
      messagesLastWeek: 0,
      messagesAllTime: 0,
    };
  }
  const today = new Date();
  const dayOfYear = today.getDate();
  if (!chatStats[chatId][username].lastActiveDay || chatStats[chatId][username].lastActiveDay !== dayOfYear) {
    chatStats[chatId][username].messagesToday = 0;
  }

  chatStats[chatId][username].messagesToday += 1;
  chatStats[chatId][username].messagesAllTime += 1; // Увеличиваем общее количество сообщений
  chatStats[chatId][username].lastActiveDay = dayOfYear;
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  const weekDay = weekAgo.getDate();

  if (!chatStats[chatId][username].lastActiveWeek || chatStats[chatId][username].lastActiveWeek !== weekDay) {
    chatStats[chatId][username].messagesLastWeek = 0;
  }

  chatStats[chatId][username].messagesLastWeek += 1;
  chatStats[chatId][username].lastActiveWeek = weekDay;

  await saveChatStats(chatStats);
}
async function getUserStats(chatId, username) {
  const chatStats = await loadChatStats();
  if (!chatStats[chatId] || !chatStats[chatId][username]) {
    return 'Нет данных о сообщениях для этого пользователя.';
  }

  const stats = chatStats[chatId][username];
  return `Пользователь ${username}: Сегодня - ${stats.messagesToday} сообщений, за неделю - ${stats.messagesLastWeek} сообщений, за все время - ${stats.messagesAllTime} сообщений.`;
}
async function getTopStats(chatId, period) {
  const chatStats = await loadChatStats();
  if (!chatStats[chatId]) {
    return 'Нет данных о сообщениях для этой группы.';
  }

  const stats = Object.entries(chatStats[chatId])
    .map(([username, stat]) => {
      let messages = 0;
      switch (period) {
        case 'день':
          messages = stat.messagesToday;
          break;
        case 'неделя':
          messages = stat.messagesLastWeek;
          break;
        case 'вся':
          messages = stat.messagesAllTime;
          break;
      }
      return { username, messages };
    })
    .sort((a, b) => b.messages - a.messages);

  if (stats.length === 0) {
    return 'Нет статистики по пользователям.';
  }

  return stats.slice(0, 10).map(
    (entry, idx) => `${idx + 1}. Пользователь ${entry.username}: ${entry.messages} сообщений`
  ).join('\n');
}
async function handleGroupMessage(bot, msg) {
  const chatId = msg.chat.id.toString();
  const username = msg.from.username || 'аноним'; // Если нет username, используем 'аноним'
  await updateChatStats(chatId, username);
}
async function handleGetStats(bot, msg) {
  const chatId = msg.chat.id.toString();
  const statsReport = await getUserStats(chatId, msg.from.username || 'аноним');
  bot.sendMessage(chatId, statsReport);
}
async function handleGetTopStats(bot, msg, period) {
  const chatId = msg.chat.id.toString();
  const topStats = await getTopStats(chatId, period);
  bot.sendMessage(chatId, topStats);
}
function handleStats(bot) {
  console.log("Initializing event handlers...");
  bot.on('message', (msg) => {
    handleGroupMessage(bot, msg);
  });
  bot.onText(/\/статистика/i, (msg) => {
    handleGetStats(bot, msg);
  });
  bot.onText(/\/топ (день|неделя|вся)/i, (msg, match) => {
    const period = match[1].toLowerCase();
    handleGetTopStats(bot, msg, period);
  });
}
module.exports = handleStats;
