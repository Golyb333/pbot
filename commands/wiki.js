function handleWiki(bot) {
bot.onText(/\/вики (.+)/i, async (msg, match) => {
  const chatId = msg.chat.id;
  const query = match[1];

  const url = `https://ru.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Ошибка при получении данных: ${response.statusText}`);
    }
    const data = await response.json();
    if (
      data.type === "https://mediawiki.org/wiki/HyperSwitch/errors/not_found"
    ) {
      bot.sendMessage(
        chatId,
        `Информация о "${query}" не найдена на Википедии.`,
      );
    } else {
      const title = data.title;
      const extract = data.extract;
      const pageUrl = data.content_urls.desktop.page;

      const message = `<b>${title}</b>\n${extract}\n\n<a href="${pageUrl}">Читать далее на Википедии</a>`;
      bot.sendMessage(chatId, message, { parse_mode: "HTML" });
    }
  } catch (error) {
    console.error("Ошибка при получении данных из Википедии:", error);
    bot.sendMessage(chatId, "Чё высрал хуила?");
  }
});
};

module.exports = handleWiki;