const fs = require('fs');
const path = require('path');
const { loadUserData, saveUserData } = require("../utils/data");


function createGroup(bot) {
  bot.onText(/\/создать_группу\s+(.+)/i, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const groupName = match[1].trim();

    if (!groupName) {
      bot.sendMessage(chatId, "Пожалуйста, укажите название группы.");
      return;
    }

    let userData = loadUserData();
    const existingGroup = Object.values(userData.groups || {}).find(g => g.owner === userId);
    if (existingGroup) {
      bot.sendMessage(chatId, "Вы уже являетесь владельцем группы.");
      return;
    }
    const currentGroup = Object.values(userData.groups || {}).find(g => g.members.includes(parseInt(userId)));
    if (currentGroup) {
      bot.sendMessage(chatId, "Вы уже состоите в другой группе. Покиньте текущую группу перед созданием новой.");
      return;
    }
    if (!userData[userId] || userData[userId].pidrcoin < 30) {
      bot.sendMessage(chatId, "У вас недостаточно pidrcoin для создания группы.");
      return;
    }
    const groupId = Date.now().toString(); // Используем текущее время как уникальный идентификатор
    userData.groups = userData.groups || {};
    userData.groups[groupId] = {
      name: groupName,
      owner: userId,
      members: [userId], // Владелец автоматически становится членом группы
      invitations: []
    };
    userData[userId].pidrcoin -= 30;

    saveUserData(userData);

    bot.sendMessage(chatId, `Группа '${groupName}' успешно создана. Вы стали владельцем этой группы.`);
  });
}
function inviteToGroup(bot) {
  bot.onText(/\/принять\s+(\S+)/i, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const inviteeName = match[1].trim(); // Удаляем лишние пробелы
    let userData = loadUserData();
    const group = Object.values(userData.groups || {}).find(g => g.owner === userId);
    if (!group) {
      bot.sendMessage(chatId, "Вы не являетесь владельцем ни одной группы.");
      return;
    }
    const invitee = Object.entries(userData).find(([id, data]) => data.username && data.username.toLowerCase() === inviteeName.toLowerCase());
    if (!invitee) {
      bot.sendMessage(chatId, "Пользователь не найден.");
      return;
    }

    const inviteeId = invitee[0];
    if (group.invitations.includes(inviteeId)) {
      bot.sendMessage(chatId, "Пользователь уже приглашен в эту группу.");
      return;
    }
    group.invitations.push(inviteeId);
    saveUserData(userData);
    bot.sendMessage(chatId, `Пользователь ${inviteeName} был приглашен в группу '${group.name}'.`);
  });
}



function showGroupInvitation(bot) {
    bot.onText(/\/приглашения/i, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id.toString();

      let userData = loadUserData();
      if (!userData.groups || Object.keys(userData.groups).length === 0) {
        bot.sendMessage(chatId, "В данный момент вас никуда не пригласили.");
        return;
      }
      const currentGroups = Object.values(userData.groups).filter(g => g.members.includes(parseInt(userId)));

      if (currentGroups.length > 0) {
        bot.sendMessage(chatId, "Вы уже состоите в группе.");
        return;
      }
      const keyboard = Object.entries(userData.groups).map(([groupId, group]) => {
        return [{ text: `Присоединиться к '${group.name}'`, callback_data: `join_group_${groupId}` }];
      });

      bot.sendMessage(chatId, "Выберите группу для присоединения:", createInlineKeyboard(keyboard));
    });
  }


function createInlineKeyboard(groupId) {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Присоединиться к группе', callback_data: `join_group_${groupId}` }]
      ]
    }
  };
}


function joinGroupInline(bot) {
  bot.on('callback_query', (query) => {
    const userId = query.from.id.toString();
    const chatId = query.message.chat.id;
    const data = query.data.trim();
    if (!data.startsWith('join_group_')) {
      return; // Игнорируем запросы, которые не начинаются с 'join_group_'
    }

    const groupId = data.split('_')[2].trim(); // Извлекаем ID группы

    let userData = loadUserData();
    const group = userData.groups[groupId];
    if (!group) {
      bot.sendMessage(chatId, "Группа с таким ID не найдена.");
      return;
    }
    if (!group.invitations.includes(userId)) {
      bot.sendMessage(chatId, "Вы не приглашены в эту группу.");
      return;
    }
    const currentGroup = Object.values(userData.groups || {}).find(g => g.members.includes(parseInt(userId)));
    if (currentGroup) {
      bot.sendMessage(chatId, "Вы уже состоите в другой группе. Пожалуйста, покиньте текущую группу перед присоединением к новой.");
      return;
    }
    if (!group.members.includes(userId)) {
      group.members.push(userId);
      group.invitations = group.invitations.filter(id => id !== userId);
      saveUserData(userData);

      bot.sendMessage(chatId, `Вы успешно присоединились к группе '${group.name}'.`);
    } else {
      bot.sendMessage(chatId, "Вы уже являетесь членом этой группы.");
    }
  });
}


function leaveGroup(bot) {
  bot.onText(/\/выйти\s+(.+)/i, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const groupName = match[1].trim(); // Удаляем лишние пробелы

    let userData = loadUserData();
    const group = Object.values(userData.groups || {}).find(g => g.name.trim().toLowerCase() === groupName.toLowerCase());
    if (!group) {
      bot.sendMessage(chatId, "Группа с таким именем не найдена.");
      return;
    }
    if (!group.members.includes(parseInt(userId))) {
      bot.sendMessage(chatId, "Вы не являетесь членом этой группы.");
      return;
    }
    group.members = group.members.filter(id => id !== parseInt(userId));
    saveUserData(userData);

    bot.sendMessage(chatId, `Вы успешно вышли из группы '${groupName}'.`);
  });
}

function showGroupInfo(bot) {
  bot.onText(/\/группа/i, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    let userData = loadUserData();
    const group = Object.values(userData.groups || {}).find(g => g.members.includes(parseInt(userId)));
    if (!group) {
      bot.sendMessage(chatId, "Вы не состоите ни в одной группе.");
      return;
    }
    const owner = userData[group.owner] ? (userData[group.owner].username || 'Неизвестно') : 'Неизвестно';
    const members = group.members.map(id => userData[id] ? (userData[id].username || 'Неизвестно') : 'Неизвестно');
    const invitations = group.invitations.map(id => userData[id] ? (userData[id].username || 'Неизвестно') : 'Неизвестно');

    const groupInfo = `Название группы: ${group.name}\nВладелец группы: ${owner}\nУчастники: ${members.length > 0 ? members.join(', ') : 'Нет участников'}\nПриглашенные: ${invitations.length > 0 ? invitations.join(', ') : 'Нет приглашенных'}`;

    bot.sendMessage(chatId, groupInfo);
  });
}
function handleGroupManagement(bot) {
  createGroup(bot);
  inviteToGroup(bot);
  showGroupInvitation(bot);
  joinGroupInline(bot);
  leaveGroup(bot);
  showGroupInfo(bot);
}

module.exports = handleGroupManagement;