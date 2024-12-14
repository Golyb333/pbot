const { loadUserData } = require("../utils/data");
const path = require("path");
const fs = require("fs");

function formatNumber(number) {
  return number.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function handleBalance(bot) {
  bot.onText(/\/(мешок|балик|баланс|мешьочек|кошелек|кошелёк|мещьочек|месси|мешочоч|мешокок|мешочек|меш)\s*(@?\w+)?/i, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();

    let targetUserId = userId; // По умолчанию информация о пользователе, отправившем команду
    if (match[2]) {
      const username = match[2].replace(/^@/, '');
      let userData = loadUserData();
      targetUserId = Object.keys(userData).find(id => userData[id].username === username) || userId;
    } else if (msg.reply_to_message) {
      targetUserId = msg.reply_to_message.from.id.toString();
    }

    let userData = loadUserData();

    if (!userData[targetUserId]) {
      userData[targetUserId] = {};
    }

    const balance = Math.floor(userData[targetUserId].balance) || 0;
    const username = userData[targetUserId].username || "пользователя";
    const armLength = userData[targetUserId].armLength || 0;
    const upgrades = userData[targetUserId].upgrades || 0;
    const pidrcoin = userData[targetUserId].pidrcoin || 0;
    const reputation = userData[targetUserId].reputation || 0;
    const description = userData[targetUserId].description || "Нету описания";
    const referrerId = userData[targetUserId].referrer;

    let referralInfo = "";
    if (referrerId && userData[referrerId]) {
      const referrerUsername = userData[referrerId].username || "неизвестный пользователь";
      referralInfo = `Пригласил: @${referrerUsername}`;
    } else {
      referralInfo = "Никто не приглашал";
    }

    bot.sendMessage(
      chatId,
      `В мешке <b>@${username}</b>:\n${formatNumber(balance)} монет.\n${formatNumber(pidrcoin)} пидркоинов.\nДлина члена ${armLength} см.\nУровень фермы: ${upgrades}.\nРепутация: ${reputation}.\n${referralInfo}\nОписание:\n<blockquote>${description}</blockquote>`, { parse_mode: 'HTML' }
    );
  });
}

module.exports = handleBalance;
