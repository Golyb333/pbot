const { loadUserData, saveUserData } = require("./utils/data");

// Инициализация данных пользователя
function initializeUserData(userId, username, referrer) {
  return {
    balance: 0,
    lastUsage_farm: null,
    username: username,
    armLength: 0,
    inventory: {},
    lastFishingTime: null,
    upgrades: 0,
    resources: {},
    autoFishing: false,
    lastCheckTime: null,
    coins: {},
    pidrcoin: 0,
    lastMiningTimes: {},
    ...(referrer && referrer !== userId ? { referrer } : {})
  };
}

// Инициализация данных группы
function initializeGroupData(groupId, groupName) {
  return {
    id: groupId,
    name: groupName,
    advertisementEnabled: true
  };
}

// Обработка сообщения из группы
function handleGroupMessage(bot, msg) {
  const groupId = msg.chat.id.toString();
  const groupName = msg.chat.title;

  // Загружаем текущие данные
  const userData = loadUserData();
  const groupData = userData.groups || {};

  // Проверяем, существует ли группа в данных
  if (!groupData[groupId]) {
    console.log(`Adding new group: ${groupName} (ID: ${groupId})`);
    groupData[groupId] = initializeGroupData(groupId, groupName);

    // Сохраняем обновленные данные
    userData.groups = groupData;
    saveUserData(userData);
  }
}

// Обработка нового пользователя
function handleNewMember(bot, msg, userData, newMember, inviter) {
  if (newMember.is_bot) return;

  const userId = newMember.id.toString();
  const username = newMember.username || "unknown";
  const inviterId = inviter.id.toString();

  if (!userData[userId]) {
    userData[userId] = initializeUserData(userId, username, inviterId);

    if (userData[inviterId] && !userData[inviterId].is_bot) {
      bot.sendMessage(
        msg.chat.id,
        `${username} был добавлен в чат. ${inviter.username} получает за это 5000 монет.`
      );

      userData[inviterId].balance += 5000;
    } else {
      bot.sendMessage(msg.chat.id, `Добро пожаловать, ${username}! Рады видеть вас в чате.`);
    }
  }
}

// Основная функция
function handleUserInitialization(bot) {
  console.log("Initializing event handlers...");

  bot.on("message", (msg) => {
    // Проверяем, что сообщение из группы
    if (msg.chat.type === "group" || msg.chat.type === "supergroup") {
      handleGroupMessage(bot, msg);

      if (msg.new_chat_members) {
        const userData = loadUserData();
        msg.new_chat_members.forEach((newMember) =>
          handleNewMember(bot, msg, userData, newMember, msg.from)
        );
        saveUserData(userData);
      }
    }
  });

  bot.onText(/\/add/, (msg) => {
    const groupId = msg.chat.id.toString();
    const groupName = msg.chat.title;

    const userData = loadUserData();
    const groupData = userData.groups || {};

    if (!groupData[groupId]) {
      groupData[groupId] = initializeGroupData(groupId, groupName);
      userData.groups = groupData;
      saveUserData(userData);
      bot.sendMessage(msg.chat.id, `Группа "${groupName}" была успешно добавлена.`);
    } else {
      bot.sendMessage(msg.chat.id, `Группа "${groupName}" уже зарегистрирована.`);
    }
  });
}

module.exports = handleUserInitialization;
