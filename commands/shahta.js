const { loadUserData, saveUserData } = require("../utils/data");
const { formatCooldownTime } = require("../utils/cooldown");
const path = require("path");
const fs = require("fs");

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

const baseCooldown = 10800000; // 3 часа в миллисекундах
const baseReward = 4535; // Базовая награда
const cooldownReduction = 7 * 60 * 1000; // Уменьшение времени ожидания

const questions = [
  { question: "Расшифруй НСО", answer: "нос" },
  { question: "Флаг чей это страны 🇧🇮", answer: "Бурунди" },
  // { question: "Флаг чей это страны 🇨🇴", answer: "Колумбии" },
  { question: "Флаг чей это страны 🇩🇰", answer: "Дании" },
  // { question: "Флаг чей это страны 🇪🇹", answer: "Эфиопии" },
  { question: "Флаг чей это страны 🇮🇹", answer: "Италии" },
  { question: "Тимоха чушпан?", answer: "Да" },
  { question: "Пидр бот был создан 12 марта", answer: "Да" },
  { question: "Создатель пидр бота @karkarich1223", answer: "Нет" },
  { question: "Флаг чей это страны 🇭🇹", answer: "Гаити" },
  { question: "Группе ОПГ ботi больше 2 лет?", answer: "Да" },
  { question: "Писю полимонишь?", answer: "Да" }
];

function calculateReward(upgrades) {
  return baseReward * (1 + 0.12 * upgrades); // Увеличение награды на 10% за каждое улучшение
}

function handleQuiz(bot) {
  bot.onText(/\/вопросы/i, (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username;

    let userData = loadUserData();

    if (!userData[userId]) {
      userData[userId] = { balance: 0, upgrades: 0 };
    }

    userData[userId].username = username;

    const lastUsage = userData[userId].lastUsage_quiz || 0;
    const currentTime = Date.now();
    const cooldown = baseCooldown - (userData[userId].upgrades || 0) * cooldownReduction;

    if (currentTime - lastUsage < cooldown) {
      const remainingTime = cooldown - (currentTime - lastUsage);
      const formattedTime = formatCooldownTime(remainingTime);
      bot.sendMessage(
        chatId,
        `Подождите еще ${formattedTime}, прежде чем использовать команду снова.`,
      );
    } else {
      const reward = calculateReward(userData[userId].upgrades);
      const questionIndex = Math.floor(Math.random() * questions.length);
      const question = questions[questionIndex];

      bot.sendMessage(chatId, question.question);

      // Временное хранилище для ожидания ответа
      const waitingForAnswer = (response) => {
        if (response.chat.id === chatId && response.from.id === userId) {
          const userAnswer = response.text.trim();
          const isCorrect = (userAnswer.toLowerCase() === question.answer.toLowerCase());

          if (isCorrect) {
            userData[userId].balance = (userData[userId].balance || 0) + reward;
            bot.sendMessage(chatId, `Поздравляем! Вы правильно ответили и получили ${reward} монет.`);
            logAction({
              userId: userId,
              username: username,
              action: 'Quiz Win',
              amount: reward,
              balance: userData[userId].balance,
            });
          } else {
            bot.sendMessage(chatId, 'К сожалению, ваш ответ неверный. Попробуйте снова.');
            logAction({
              userId: userId,
              username: username,
              action: 'Quiz Lose',
              amount: 0,
              balance: userData[userId].balance,
            });
          }

          userData[userId].lastUsage_quiz = currentTime;
          saveUserData(userData);
          
          bot.removeListener('message', waitingForAnswer);
        }
      };

      bot.on('message', waitingForAnswer);
    }
  });
}

module.exports = handleQuiz;
