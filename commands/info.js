function handleInfo(bot) {
  bot.onText(/\/(инфо|инфа|start)/i, (msg) => {
    const chatId = msg.chat.id;
    showMainMenu(chatId, msg.message_id);
  });

  function showMainMenu(chatId, messageId) {
    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Основное", callback_data: "section_1" },
            { text: "Крафт", callback_data: "section_2" },
          ],
          [
            { text: "Рыбалка", callback_data: "section_3" },
            { text: "Разное", callback_data: "section_4" },
          ],
        ],
      },
    };

    bot.sendMessage(chatId, "Выберите раздел:", options).then((sentMessage) => {
      const newMessageId = sentMessage.message_id;
      bot.on("callback_query", (callbackQuery) => {
        const data = callbackQuery.data;
        if (data.startsWith("section_") || data === "back") {
          handleCallbackQuery(chatId, newMessageId, data);
        }
        bot.answerCallbackQuery(callbackQuery.id);
      });
    });
  }

  function handleCallbackQuery(chatId, messageId, data) {
    if (data === "back") {
      editMessageText(chatId, messageId, "Выберите раздел:", {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Основное", callback_data: "section_1" },
              { text: "Крафт", callback_data: "section_2" },
            ],
            [
              { text: "Рыбалка", callback_data: "section_3" },
              { text: "Разное", callback_data: "section_4" },
            ],
          ],
        },
      });
    } else if (data === "section_1") {
      editMessageText(
        chatId,
        messageId,
        `Основное:\n` +
          `Ферма|работа|бизнес - заработать деньги\n\n` +
          `Мешок|баланс|балик|кошелек - посмотреть свой или чужой мешок (ответить на сообщение пользователя)\n\n` +
          `Вопросы - заработать деньги отвечая на вопросы (предложил: @quuski )\n\n` +
          `Монеты - посмотреть лидеров по деньгам\n\n` +
          `Среднее - посмотреть средний баланс всех пользователей\n\n` +
          `Улучшить - Улучшить ферму\n\n` +
          `Ракетка (цена) (кэфф) - поставить деньги на ракетку\n\n` +
          `Виагра (количество) - увеличить член 1 таблетка - 300 монет\n\n` +
          `Крипта - посмотреть свою крипту и цены на нее\n\n` +
          `Купить (количество) - купить какую либо криптовалюту\n\n` +
          `Продать (количетсво) - продать какую либо криптовалюту\n\n` +
          `Майнинг (число|все) - получить деньги с майнинг фермы (требуеться майнинг ферма (крафт 2))\n\n` +
          `Б.купить (айди) - купить пидркоины\n\n` +
          `Б.продать (пидркоины) (цена) - выставить лот на биржу\n\n` +
          `Биржа - посмотреть лоты на пидркоины\n\n` +
          `Дать (юзер) (количество) - дать другому человеку деньги\n\n`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: "Назад", callback_data: "back" }]],
          },
        },
      );
    } else if (data === "section_2") {
      editMessageText(
        chatId,
        messageId,
        `Крафт:\n` +
          `Крафт (страница) - посмотреть лидеров по деньгам\n\n` +
          `Инвентарь - инвентарь  с ресурсами\n\n` +
          `Р.продать (цена) - выставить на продажу ресурс\n\n` +
          `Р.купить ?(айди) - купить что либо на рынке\n\n` +
          `Мусорка - купить материалы для крафтов\n\n`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: "Назад", callback_data: "back" }]],
          },
        },
      );
    } else if (data === "section_3") {
      editMessageText(
        chatId,
        messageId,
        `Рыбалка:\n` +
          `Сеть - посмотреть вашу рыбу\n\n` +
          `Рынок - продать рыбу\n\n` +
          `Рыбалка - попытаться выловить рыбу\n\n` +
          `Цены - Посмотреть цены на рыбу\n\n` +
          `Авторыбалка (вкл|выкл) - включить/выключить авторыбалку (требуеться умная удочка (крафт 2))\n\n`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: "Назад", callback_data: "back" }]],
          },
        },
      );
    } else if (data === "section_4") {
      editMessageText(
        chatId,
        messageId,
        `Разное:\n` +
          `Бот (текст) - написать ии\n\n` +
          `Админы - посмотреть список админов бота\n\n` +
          `Реклама - разместить рекламу за 30.000 монет в другие группы (текст писать после отправки команды)\n\n` +
          `Золо - отправляет случайную фотку ивана золо\n\n` +
          `Я (текст) - погадать на шаре\n\n` +
          `На сколько я (текст) - погадать на шаре\n\n` +
          `Вики (текст) - найти информацию в википедии\n\n`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: "Назад", callback_data: "back" }]],
          },
        },
      );
    } else if (data === "section_5") {
      editMessageText(
        chatId,
        messageId,
        `Арифметика:\n\n` +
        `Этот бот позволяет выполнять простые арифметические операции и использовать циклы.\n\n` +
        `**Как использовать:**\n` +
        `1. **Команда для выполнения кода:**\n` +
        `   - Используйте команду \`/код <ваш код>\`, чтобы отправить код для выполнения.\n\n` +
        `2. **Примеры команд:**\n` +
        `    Я УДАЛИЛ ЧТОБ ПОТОМУ ЧТО НЕ НАДО` +
        `**Примечания:**\n` +
        `- - вывода ---еменной --с-льзуй-те -\n` +
        `- - -------------------------- вам!`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: "Назад", callback_data: "back" }]],
          },
        },
      );
    }
  }

  function editMessageText(chatId, messageId, text, options) {
    bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      ...options,
    });
  }
}

module.exports = handleInfo;
