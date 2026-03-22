import { MessagesSquare, Megaphone, Briefcase, Ticket, Building2 } from 'lucide-react'

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
    case 'housing':    return <Building2 {...props} />
    default:           return null
  }
}
