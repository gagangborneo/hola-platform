/** Konfigurasi adapter backup; worker saja yang memanggilnya. */
import { PgRcloneBackupAdapter } from '../providers/backup.ts'

export const backup = new PgRcloneBackupAdapter()
