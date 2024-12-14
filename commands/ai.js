const axios = require('axios');

function handleAI(bot) {
bot.onText(/\/бот (.+)/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const inputText = match[1];

  try {
    const response = await axios.post("https://xu.su/api/send", {
      uid: "",
      bot: "main",
      text: inputText,
    });

    // Обработка ответа
    console.error(inputText);
    const data = response.data;
    bot.sendMessage(chatId, data.text); // Отправка ответа в чат
  } catch (err) {
    console.error(`Ошибка при отправке запроса к API: ${err}`);
    bot.sendMessage(chatId, "Произошла ошибка при обращении к API.");
  }
});
};

module.exports = handleAI;
