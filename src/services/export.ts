import { Platform } from 'react-native';
import { todayISO } from '../utils/format';

// Descarga/compartido del CSV. En web se dispara una descarga del navegador;
// en iOS/Android se escribe el archivo y se abre la hoja de compartir.

export async function saveCsv(filename: string, content: string): Promise<void> {
  // El BOM hace que Excel abra el archivo en UTF-8 y no rompa los acentos
  const withBom = `﻿${content}`;

  if (Platform.OS === 'web') {
    const blob = new Blob([withBom], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  // En nativo los módulos se cargan on demand para no pesar en web
  const { File, Paths } = await import('expo-file-system');
  const Sharing = await import('expo-sharing');
  const file = new File(Paths.cache, filename);
  // Si quedó de una exportación anterior, se pisa
  if (file.exists) file.delete();
  file.create();
  file.write(withBom);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: filename });
  }
}

/** nummi-movimientos-2026-08-07.csv */
export function exportFilename(kind: string): string {
  return `nummi-${kind}-${todayISO()}.csv`;
}
