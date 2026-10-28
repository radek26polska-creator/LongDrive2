export const getReadableTextColor = (hexColor) => {
  const color = (hexColor || '#0f172a').replace(/^#/, '');
  const normalizedColor = /^[\da-f]{3}$/i.test(color)
    ? color.split('').map((channel) => channel + channel).join('')
    : color;
  if (!/^[\da-f]{6}$/i.test(normalizedColor)) return '#f8fafc';

  const channels = [0, 2, 4].map((index) => parseInt(normalizedColor.slice(index, index + 2), 16) / 255);
  const luminance = channels
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const contrastWithWhite = 1.05 / (luminance + 0.05);
  const contrastWithBlack = (luminance + 0.05) / 0.05;
  return contrastWithWhite >= contrastWithBlack ? '#ffffff' : '#000000';
};
