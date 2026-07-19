/**
 * User Notification Module — Public API
 */

export { getUserNotificationService, UserNotificationService } from './user-notification.service';
export type {
  CreateUserNotificationInput,
  UserNotificationListQuery,
  UserNotificationListResponse,
  UserNotificationRecord,
  UserNotificationType,
  USER_NOTIFICATION_TYPES,
} from './types';
