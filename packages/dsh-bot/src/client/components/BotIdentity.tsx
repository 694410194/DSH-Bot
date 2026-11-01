import type { ReactNode } from 'react';
import type { BotRecord } from '../../shared/schema.js';
import { BotAvatar } from './BotAvatar.js';
import styles from '../styles/identity.module.css';
/** Shared identity presentation for the list and both native sidebar extensions. */
export function BotIdentity({ bot, size = 32, preview, disambiguate, trailing }: {
  bot: BotRecord; size?: number; preview?: string; disambiguate?: boolean; trailing?: ReactNode;
}) {
  return <span className={styles.identity}>
    <BotAvatar bot={bot} size={size} />
    <span className={styles.body}><span className={styles.heading}><span className={styles.name}>{bot.name}</span>{trailing}</span>
      {disambiguate && <span className={styles.meta}>{bot.id}</span>}
      {preview && <span className={styles.preview} data-activity-preview="" title={preview}>{preview}</span>}
    </span>
  </span>;
}
