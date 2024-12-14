function handleArithmetic(bot) {
  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim(); // Обработка только текстовых сообщений

    if (!text) return; // Игнорируем сообщения без текста

    try {
      if (isMathExpression(text)) {
        const result = evaluateExpression(text);
        bot.sendMessage(chatId, `Результат: ${result}`);
      } else if (isWhileLoop(text)) {
        const result = evaluateWhileLoop(text);
        bot.sendMessage(chatId, `Результат: ${result}`);
      }
    } catch (error) {
      bot.sendMessage(chatId, "Ошибка: " + error.message);
    }
  });
}

function isMathExpression(text) {
  return /^[\d\s+\-*/().%]+$/.test(text) && /[\d]+[\s+\-*/().%]+[\d]+/.test(text);
}

function isWhileLoop(text) {
  return /^while\s*\(\s*\d+\s*\)\s*\{\s*[\d\s+\-*/().%]+\s*\}$/.test(text);
}

function evaluateExpression(expression) {
  const maxNumber = 1e15; // Максимально допустимое число
  if (/\d{11,}/.test(expression)) {
    throw new Error("Число слишком большое!");
  }
  const expressionWithPercent = expression.replace(/(\d+(\.\d+)?)%/g, '($1/100)');
  return Function(`'use strict'; return (${expressionWithPercent})`)();
}

function evaluateWhileLoop(text) {
  const match = text.match(/^while\s*\(\s*(\d+)\s*\)\s*\{\s*([\d\s+\-*/().%]+)\s*\}$/);
  if (!match) throw new Error("Некорректный формат цикла while");

  const repetitions = parseInt(match[1], 10);
  const expression = match[2];
  const maxRepetitions = 1000; // Максимальное количество повторений
  if (repetitions > maxRepetitions) {
    throw new Error("Количество повторений слишком велико!");
  }

  let result = 0;
  for (let i = 0; i < repetitions; i++) {
    result += evaluateExpression(expression);
  }

  return result;
}

module.exports = handleArithmetic;
