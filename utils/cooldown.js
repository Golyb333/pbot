function formatCooldownTime(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${hours}ч ${minutes}м ${seconds}с`;
}

module.exports = { formatCooldownTime };
