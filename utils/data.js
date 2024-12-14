const fs = require("fs");
const path = require("path");


const filePath = path.resolve(__dirname, "../user_data.json");

function loadUserData() {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading user data:", error);
    return {};
  }
}

function saveUserData(data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error saving user data:", error);
  }
}

module.exports = { loadUserData, saveUserData };
