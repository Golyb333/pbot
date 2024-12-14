const fs = require("fs");
const path = require("path");

const messagesFilePath = path.resolve(__dirname, "../messages.json");

function loadMessages() {
  try {
    const data = fs.readFileSync(messagesFilePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading messages data:", error);
    return {};
  }
}

function saveMessages(data) {
  try {
    fs.writeFileSync(messagesFilePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error saving messages data:", error);
  }
}

module.exports = { loadMessages, saveMessages };
