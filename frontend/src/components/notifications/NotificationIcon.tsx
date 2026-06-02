import { 
  Bell, 
  Clock, 
  AlertTriangle, 
  Users, 
  Trophy, 
  Award, 
  Megaphone, 
  Shield,
  type LucideIcon
} from 'lucide-react'

export type NotificationType = 
  | 'DEADLINE_REMINDER'
  | 'DEADLINE_WARNING'
  | 'TEAM_INVITE'
  | 'SCORE_PUBLISHED'
  | 'CERTIFICATE_ISSUED'
  | 'ANNOUNCEMENT'
  | 'SYSTEM_ALERT'

interface NotificationConfig {
  icon: LucideIcon
  color: string
  bgColor: string
  label: string
}

export const notificationConfig: Record<NotificationType, NotificationConfig> = {
  DEADLINE_REMINDER: {
    icon: Clock,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    label: 'Deadline Reminder',
  },
  DEADLINE_WARNING: {
    icon: AlertTriangle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    label: 'Deadline Warning',
  },
  TEAM_INVITE: {
    icon: Users,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Team Invitation',
  },
  SCORE_PUBLISHED: {
    icon: Trophy,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    label: 'Scores Released',
  },
  CERTIFICATE_ISSUED: {
    icon: Award,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    label: 'Certificate',
  },
  ANNOUNCEMENT: {
    icon: Megaphone,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    label: 'Announcement',
  },
  SYSTEM_ALERT: {
    icon: Shield,
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-900/30',
    label: 'System Alert',
  },
}

interface NotificationIconProps {
  type: NotificationType | string
  size?: number
  className?: string
}

export function NotificationIcon({ type, size = 18, className = '' }: NotificationIconProps) {
  const config = notificationConfig[type as NotificationType] || {
    icon: Bell,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    label: 'Notification',
  }
  
  const Icon = config.icon
  
  return (
    <div 
      className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.bgColor} ${className}`}
      title={config.label}
    >
      <Icon size={size} className={config.color} />
    </div>
  )
}

export function getNotificationLabel(type: NotificationType | string): string {
  return notificationConfig[type as NotificationType]?.label || 'Notification'
}
