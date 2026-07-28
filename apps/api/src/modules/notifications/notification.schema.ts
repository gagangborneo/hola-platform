/** Schema endpoint inbox. */
import { cursorPaginationQuery, idParam } from '@hola/shared'

export const notificationsQuerySchema = cursorPaginationQuery
export const notificationIdParam = idParam
