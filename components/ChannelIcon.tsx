import { MessagesSquare, Megaphone, Briefcase, Ticket } from 'lucide-react'
import AggieRingIcon from '@/components/AggieRingIcon'

interface ChannelIconProps {
  slug: string
  size?: number
  className?: string
}

export default function ChannelIcon({ slug, size = 20, className }: ChannelIconProps) {
  const props = { size, className }
  switch (slug) {
    case 'general':    return <MessagesSquare {...props} />
    case 'promotions': return <Megaphone {...props} />
    case 'jobs':       return <Briefcase {...props} />
    case 'tickets':    return <Ticket {...props} />
    case 'aggie-ring': return <AggieRingIcon className={className} style={{ width: size, height: size }} />
    default:           return null
  }
}
