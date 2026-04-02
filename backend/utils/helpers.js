// Generate a random 6-8 char room ID
const generateRoomId = () => {
  return Math.random().toString(36).substring(2, 9).toUpperCase();
};

// Generate a random Ghost username
const generateUsername = () => {
  const num = Math.floor(1000 + Math.random() * 9000); // 4 digit number
  return `Ghost_${num}`;
};

module.exports = {
  generateRoomId,
  generateUsername
};
