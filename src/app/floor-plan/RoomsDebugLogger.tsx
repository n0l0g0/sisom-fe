'use client';

import { useEffect } from 'react';
import type { Room } from '@/services/api';

interface Props {
  rooms: Room[];
}

export default function RoomsDebugLogger({ rooms }: Props) {
  useEffect(() => {
    // Client-side log to verify rooms visible in this page
    // eslint-disable-next-line no-console
    console.log(
      '[sisom-fe] RoomsDebugLogger (client):',
      rooms.length,
      'rooms ->',
      rooms.map((r) => r.number).join(', '),
    );
  }, [rooms]);

  return null;
}

