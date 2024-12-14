const path = require("path");
const fs = require("fs");

const groupsDataPath = path.join(__dirname, "groupsData.json");

function saveGroupsData(groupsData) {
  fs.writeFileSync(groupsDataPath, JSON.stringify(groupsData, null, 2));
}

function loadGroupsData() {
  if (!fs.existsSync(groupsDataPath)) {
    return {};
  }
  const data = fs.readFileSync(groupsDataPath);
  return JSON.parse(data);
}
function logAction({
  userId,
  username,
  action,
  additionalInfo = "",
}) {
  const logFilePath = path.join(__dirname, "logs.txt");
  const logMessage = `[${new Date().toISOString()}] User: ${username} (ID: ${userId}), Action: ${action}, ${additionalInfo}\n`;

  fs.appendFile(logFilePath, logMessage, (err) => {
    if (err) {
      console.error("Log writing error:", err);
    }
  });
}

function handleStress(bot) {
  bot.onText(/\/стресс/i, (msg) => {
    const chatId = msg.chat.id;

    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Посмотреть группы", callback_data: "view_groups" }],
          [{ text: "Управление пользователями", callback_data: "manage_users" }]
        ]
      }
    };

    bot.sendMessage(chatId, "Выберите действие:", options);
  });

  bot.on("callback_query", (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const username = callbackQuery.from.username;

    if (data === "view_groups") {
      const groupsData = loadGroupsData();
      const groupInfo = Object.entries(groupsData)
        .map(([groupId, groupData]) => {
          const users = groupData.users.map(user => `@${user.username} (ID: ${user.id})`).join("\n");
          return `Группа: ${groupId}\nПользователи:\n${users}`;
        })
        .join("\n\n");

      bot.sendMessage(chatId, groupInfo || "Нет данных о группах.");
    } else if (data === "manage_users") {
      bot.sendMessage(chatId, "Введите команду /adduser <username> или /removeuser <username>");
    }
  });

  bot.onText(/\/adduser (\w+)/i, (msg, match) => {
    const chatId = msg.chat.id;
    const username = match[1];
    const groupId = chatId.toString();
    const groupsData = loadGroupsData();

    if (!groupsData[groupId]) {
      groupsData[groupId] = { users: [] };
    }

    if (!groupsData[groupId].users.find(user => user.username === username)) {
      groupsData[groupId].users.push({ id: Date.now(), username });
      saveGroupsData(groupsData);
      bot.sendMessage(chatId, `Пользователь @${username} добавлен в группу.`);
    } else {
      bot.sendMessage(chatId, `Пользователь @${username} уже существует в группе.`);
    }
  });

  bot.onText(/\/removeuser (\w+)/i, (msg, match) => {
    const chatId = msg.chat.id;
    const username = match[1];
    const groupId = chatId.toString();
    const groupsData = loadGroupsData();

    if (groupsData[groupId]) {
      const userIndex = groupsData[groupId].users.findIndex(user => user.username === username);

      if (userIndex > -1) {
        groupsData[groupId].users.splice(userIndex, 1);
        saveGroupsData(groupsData);
        bot.sendMessage(chatId, `Пользователь @${username} удален из группы.`);
      } else {
        bot.sendMessage(chatId, `Пользователь @${username} не найден в группе.`);
      }
    } else {
      bot.sendMessage(chatId, `Группа не найдена.`);
    }
  });
}

module.exports = handleStress;
