import { toPng } from 'html-to-image';

// Group color mapping - using dark colors for QR code readability
const GROUP_COLORS = [
  '#1e40af', // Dark blue
  '#7c2d12', // Dark brown
  '#374151', // Dark gray
  '#059669', // Dark green
];
const GROUP_COLORS_LIGHT = [
  '#dbeafe', // Light blue
  '#fef3c7', // Light brown
  '#f3f4f6', // Light gray
  '#d1fae5', // Light green
];

function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = `hsl(${hash % 360}, 40%, 50%)`;
  return color;
}

export const getGroupColor = (group: string) => {
  const idx = GROUP_COLORS.findIndex((g, i) => i === GROUP_COLORS.indexOf(g));
  if (idx >= 0 && idx < GROUP_COLORS.length) {
    return GROUP_COLORS[idx];
  }
  // For additional groups, generate a color
  return hashColor(group);
};

export const getGroupColorLight = (group: string) => {
  const idx = GROUP_COLORS_LIGHT.findIndex((g, i) => i === GROUP_COLORS_LIGHT.indexOf(g));
  if (idx >= 0 && idx < GROUP_COLORS_LIGHT.length) {
    return GROUP_COLORS_LIGHT[idx];
  }
  // For additional groups, generate a color
  return hashColor(group + 'light');
};

export const generateBoxUrl = (boxId: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://qrbox-mu.vercel.app';
  return `${baseUrl}/box/${boxId}`;
};

export const downloadQRCode = async (elementRef: HTMLElement, filename: string) => {
  try {
    const dataUrl = await toPng(elementRef, {
      width: 400,
      height: 500,
      style: {
        background: 'white',
        padding: '20px',
        borderRadius: '8px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      },
      quality: 1.0,
      pixelRatio: 2
    });

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Error downloading QR code:', error);
  }
}; 