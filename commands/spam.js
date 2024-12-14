const { loadUserData, saveUserData } = require("../utils/data");

const spamTracker = {};
const SPAM_THRESHOLD = 5; // Number of identical messages to be considered spam
const MUTE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

function handleAntiSpam(bot) {
  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const content = getMessageContent(msg);

    if (!spamTracker[userId]) {
      spamTracker[userId] = [];
    }

    spamTracker[userId].push({
      content,
      timestamp: Date.now(),
    });
    spamTracker[userId] = spamTracker[userId].filter(item => {
      return Date.now() - item.timestamp < MUTE_DURATION;
    });
    const identicalMessages = spamTracker[userId].filter(item => item.content === content);
    if (identicalMessages.length >= SPAM_THRESHOLD) {
      muteUser(bot, chatId, userId);
      spamTracker[userId] = []; // Clear the tracker for this user after muting
    }
  });
}

function getMessageContent(msg) {
  if (msg.text) {
    return msg.text;
  } else if (msg.sticker) {
    return `sticker:${msg.sticker.file_id}`;
  } else if (msg.animation) {
    return `gif:${msg.animation.file_id}`;
  }
  return 'unknown';
}

function muteUser(bot, chatId, userId) {
  bot.restrictChatMember(chatId, userId, {
    until_date: Date.now() / 1000 + MUTE_DURATION / 1000,
    can_send_messages: false,
    can_send_media_messages: false,
    can_send_other_messages: false,
    can_add_web_page_previews: false,
  }).then(() => {
    bot.sendMessage(chatId, `Пользователь ${userId} был замучен за спам на 5 минут.`);
  }).catch(error => {
    console.error("Ошибка при попытке замутить пользователя:", error);
  });
}

module.exports = handleAntiSpam;
