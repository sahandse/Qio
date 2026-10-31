import type { ComponentType } from 'react'
import type { PageId } from '@shared/types'
import {
  BallIcon,
  BellIcon,
  CalendarIcon,
  LyricsIcon,
  MusicIcon,
  NoteIcon,
  ShelfIcon,
  SparklesIcon,
  TimerIcon,
  TodoIcon,
  ToolsIcon,
  WaterIcon
} from '../components/Icons'

interface PageMeta {
  title: string
  Icon: ComponentType<{ size?: number }>
}

/** One name and one icon per rail page, shared by the notch and the layout settings. */
export const PAGE_META: Record<PageId, PageMeta> = {
  calendar: { title: 'تقویم', Icon: CalendarIcon },
  music: { title: 'آهنگ', Icon: MusicIcon },
  lyrics: { title: 'متن آهنگ', Icon: LyricsIcon },
  focus: { title: 'تمرکز', Icon: TimerIcon },
  water: { title: 'آب', Icon: WaterIcon },
  football: { title: 'بازی‌ها', Icon: BallIcon },
  shelf: { title: 'قفسه', Icon: ShelfIcon },
  todo: { title: 'کارها', Icon: TodoIcon },
  alerts: { title: 'اعلان‌ها', Icon: BellIcon },
  notes: { title: 'یادداشت', Icon: NoteIcon },
  tools: { title: 'ابزارها', Icon: ToolsIcon },
  ai: { title: 'هوش مصنوعی', Icon: SparklesIcon }
}
