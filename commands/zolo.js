const fs = require('fs');
const path = require('path');
const { loadUserData, saveUserData } = require("../utils/data");
const zoloDir = path.join(__dirname, '../zolo');
let zoloPhotos = fs.readdirSync(zoloDir);
let recentPhotos = [];
if (!fs.existsSync(zoloDir)) {
  fs.mkdirSync(zoloDir);
}

function handleIvanZolo(bot) {
  bot.onText(/\/золо/, (msg) => {
    const chatId = msg.chat.id;
    if (zoloPhotos.length === 0) {
      bot.sendMessage(chatId, 'Нет доступных фотографий Ивана Золо.');
      return;
    }
    let availablePhotos = zoloPhotos.filter(photo => !recentPhotos.includes(photo));
    if (availablePhotos.length === 0) {
      availablePhotos = zoloPhotos;
    }

    const randomPhoto = availablePhotos[Math.floor(Math.random() * availablePhotos.length)];
    const photoPath = path.join(zoloDir, randomPhoto);
    bot.sendPhoto(chatId, photoPath);
    recentPhotos.push(randomPhoto);
    if (recentPhotos.length > 3) {
      recentPhotos.shift();
    }
  });
  bot.onText(/\/добавить/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    if (!isAdmin(userId)) {
      bot.sendMessage(chatId, 'У вас нет прав для выполнения этой команды.');
      return;
    }
    bot.sendMessage(chatId, 'Отправьте фотографию, которую хотите добавить.');
    bot.once('photo', (photoMsg) => {
      const photo = photoMsg.photo[photoMsg.photo.length - 1]; // Выбор фотографии с наибольшим разрешением
      const photoId = photo.file_id;
      bot.sendMessage(chatId, 'Введите название для фотографии:');
      bot.once('message', (titleMsg) => {
        const title = titleMsg.text.trim();
        const photoName = title ? `${title}.jpg` : `${Date.now()}.jpg`;
        bot.getFileLink(photoId).then((fileUrl) => {
          const photoStream = fs.createWriteStream(path.join(zoloDir, photoName));
          const request = require('request');
          request(fileUrl).pipe(photoStream).on('close', () => {
            zoloPhotos = fs.readdirSync(zoloDir);
            bot.sendMessage(chatId, `Фотография успешно добавлена с названием: ${photoName}`);
          });
        });
      });
    });
  });
  bot.onText(/\/удалить/, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    if (!isAdmin(userId)) {
      bot.sendMessage(chatId, 'У вас нет прав для выполнения этой команды.');
      return;
    }
    const photoButtons = zoloPhotos.map((photo) => ({
      text: photo,
      callback_data: `delete_photo_${photo}`,
    }));

    bot.sendMessage(chatId, 'Выберите фотографию для удаления:', {
      reply_markup: {
        inline_keyboard: [photoButtons],
      },
    });
  });
  bot.on('callback_query', (query) => {
    const data = query.data;

    if (data.startsWith('delete_photo_')) {
      const photoName = data.replace('delete_photo_', '');
      const photoPath = path.join(zoloDir, photoName);
      fs.unlinkSync(photoPath);
      zoloPhotos = fs.readdirSync(zoloDir);

      bot.answerCallbackQuery(query.id, { text: `Фотография ${photoName} успешно удалена.` });
    }
  });
  function isAdmin(userId) {
    const admins = [1504349040]; // Список ID админов
    return admins.includes(userId);
  }
}

module.exports = handleIvanZolo;
