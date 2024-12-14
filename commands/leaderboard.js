const { loadUserData } = require("../utils/data");

function formatNumber(number) {
  return number.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function handleLeaderboard(bot) {
  bot.onText(/\/монеты/i, (msg) => {
    const chatId = msg.chat.id;

    let userData = loadUserData();

    const sortedUsers = Object.entries(userData)
      .filter(([_, data]) => data.balance !== undefined && !data.casinoJ)
      .sort(([, a], [, b]) => b.balance - a.balance)
      .slice(0, 10); // Оставляем только топ-10 пользователей

    let leaderboardMessage = "Топ пользователей по монетам:\n";
    sortedUsers.forEach(([userId, data], index) => {
      leaderboardMessage += `${index + 1}. ${data.username || "неизвестный"}: ${formatNumber(data.balance.toFixed(2))} монет\n`;
    });

    bot.sendMessage(chatId, leaderboardMessage);
  });


  bot.onText(/\/среднее/i, (msg) => {
      const chatId = msg.chat.id;

      let userData = loadUserData();
      const balances = Object.entries(userData)
          .filter(([userId, data]) => userId !== "casino")
          .map(([userId, data]) => ({
              username: data.username || "неизвестный",
              balance: data.balance || 0
          }));

      const totalBalance = balances.reduce((sum, user) => sum + user.balance, 0);
      const averageBalance = totalBalance / balances.length;

      let deviationMessage = `Средний баланс всех пользователей: ${formatNumber(averageBalance.toFixed(2))} монет.\n`;

      bot.sendMessage(chatId, deviationMessage);
  });
}


module.exports = handleLeaderboard;
