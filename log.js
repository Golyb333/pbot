const fs = require("fs");
const path = require("path");

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
