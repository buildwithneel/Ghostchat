export const getUserColor = (username) => {
  if (!username) return 'hsl(0, 0%, 50%)';
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  const saturation = 70 + (hash % 20); // 70-90%
  const lightness = 60 + (hash % 20); // 60-80%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export const getInitials = (name) => {
  if (!name) return '?';
  return name.slice(0, 2).toUpperCase();
};
