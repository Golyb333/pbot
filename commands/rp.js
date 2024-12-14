const { loadUserData, saveUserData } = require("../utils/data");
const path = require("path");
const fs = require("fs");
const Jimp = require("jimp");

const targetUserId = '974187132';
const cooldowns = new Map(); // Хранилище для отслеживания кулдаунов
const sanVariants = /748265335/i;
const userCompressionSettings = {}; // Хранилище для степени сжатия каждого пользователя
const reputationFilePath = path.join(__dirname, "reputation.json");
const tempDir = path.join(__dirname, "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

function loadReputationData() {
  try {
    if (!fs.existsSync(reputationFilePath)) {
      return {};
    }
    const data = fs.readFileSync(reputationFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Ошибка загрузки репутационных данных:", error.message);
    return {};
  }
}

function saveReputationData(data) {
  try {
    fs.writeFileSync(reputationFilePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Ошибка сохранения репутационных данных:", error.message);
  }
}

function updateBalance(bot, chatId) {
  const data = loadUserData();
  if (!data[targetUserId]) {
    data[targetUserId] = { balance: 0 };
  }
  data[targetUserId].balance += 15;
  saveUserData(data);
  bot.sendMessage(chatId, "@karkarich1223 получил 15 монет");
}

function logAction({
  userId,
  username,
  action,
  amount,
  balance,
  additionalInfo = "",
}) {
  const logFilePath = path.join(__dirname, "logs.txt");
  const logMessage = `[${new Date().toISOString()}] User: ${username} (ID: ${userId}), Action: ${action}, Amount: ${amount}, Balance: ${balance}, ${additionalInfo}\n`;

  fs.appendFile(logFilePath, logMessage, (err) => {
    if (err) {
      console.error("Ошибка записи в лог:", err);
    }
  });
}

function handleCommands(bot) {
  bot.onText(/\/я\s+(.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const responses = ["Да", "Нет", "Возможно", "Конечно", "Никогда"];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    bot.sendMessage(chatId, randomResponse);
  });

  bot.onText(/\/на сколько я\s+(.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const question = match[1];
    const percentage = Math.floor(Math.random() * 101); // Процент от 0 до 100
    const responseText = `Я думаю, вы ${question} на ${percentage}%`;
    bot.sendMessage(chatId, responseText);
  });

  bot.onText(/\/описание\s+(.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const description = match[1];

    const userData = loadUserData();

    if (description.length > 200) {
      bot.sendMessage(chatId, "Описание не должно превышать 200 символов.");
      return;
    }
    if (!userData[userId]) {
      userData[userId] = {};
    }

    userData[userId].description = description;

    saveUserData(userData);

    bot.sendMessage(chatId, "Ваше описание успешно сохранено.");
  });


  bot.onText(/\/шакалить\s+(\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const compressionLevel = parseInt(match[1]);

    if (compressionLevel < 1 || compressionLevel > 10) {
      bot.sendMessage(chatId, "Пожалуйста, укажите степень сжатия от 1 до 10.");
      return;
    }

    userCompressionSettings[userId] = compressionLevel;
    bot.sendMessage(chatId, `Степень сжатия установлена на ${compressionLevel}. Теперь отправьте фото.`);
  });

  bot.onText(/(\+реп|\-реп)/, (msg, match) => {
    const chatId = msg.chat.id;
    const fromUserId = msg.from.id;
    const toUserId = msg.reply_to_message && msg.reply_to_message.from.id;
    const action = match[1];

    let userData = loadUserData();
    let reputationData = loadReputationData();
    if (!userData[fromUserId]) {
      userData[fromUserId] = { balance: 0, reputation: 0 };
    }
    if (!userData[toUserId]) {
      userData[toUserId] = { balance: 0, reputation: 0 };
    }
    if (!reputationData[fromUserId]) {
      reputationData[fromUserId] = [];
    }

    if (reputationData[fromUserId].includes(toUserId)) {
      bot.sendMessage(chatId, "Вы уже изменяли репутацию этого пользователя.");
      return;
    }
    reputationData[fromUserId].push(toUserId);

    if (action === "+реп") {
      userData[toUserId].reputation = (userData[toUserId].reputation || 0) + 1;
      bot.sendMessage(chatId, `Вы повысили репутацию пользователя @${msg.reply_to_message.from.username}.`);
    } else if (action === "-реп") {
      userData[toUserId].reputation = (userData[toUserId].reputation || 0) - 1;
      bot.sendMessage(chatId, `Вы понизили репутацию пользователя @${msg.reply_to_message.from.username}.`);
    }
    saveUserData(userData);
    saveReputationData(reputationData);
  });
  
  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    const now = Date.now();

    if (sanVariants.test(text)) {
      if (cooldowns.has(userId) && now - cooldowns.get(userId) < 15000) {
        bot.sendMessage(chatId, "Пожалуйста, подождите 15 секунд перед повторным использованием.");
        return;
      }
      updateBalance(bot, chatId);
      cooldowns.set(userId, now);
    }
    if (msg.photo && userCompressionSettings[userId]) {
      const photo = msg.photo[msg.photo.length - 1]; // Получаем наибольшее по размеру фото
      const fileId = photo.file_id;

      bot.getFileLink(fileId).then((fileUrl) => {
        Jimp.read(fileUrl).then((image) => {
          const compressionLevel = userCompressionSettings[userId];
          const quality = 1 + (compressionLevel - 1) * 6;

          image.quality(quality).getBuffer(Jimp.MIME_JPEG, (err, buffer) => {
            if (err) {
              console.error("Ошибка обработки изображения:", err);
              bot.sendMessage(chatId, "Произошла ошибка при обработке изображения.");
              return;
            }

            const filePath = path.join(tempDir, `${userId}.jpg`);
            fs.writeFile(filePath, buffer, (err) => {
              if (err) {
                console.error("Ошибка сохранения изображения:", err);
                bot.sendMessage(chatId, "Произошла ошибка при сохранении изображения.");
                return;
              }

              bot.sendPhoto(chatId, filePath, {
                caption: "Ваше шакаленное изображение:"
              }).then(() => {
                fs.unlink(filePath, (err) => {
                  if (err) console.error("Ошибка удаления временного файла:", err);
                });
              });
            });
          });
        }).catch((err) => {
          console.error("Ошибка чтения изображения:", err);
          bot.sendMessage(chatId, "Произошла ошибка при чтении изображения.");
        });
      }).catch((err) => {
        console.error("Ошибка получения ссылки на файл:", err);
        bot.sendMessage(chatId, "Произошла ошибка при получении изображения.");
      });
    }
  });
}

module.exports = handleCommands;
