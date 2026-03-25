import { Button } from '@/components/ui/button'
import { Info as InfoIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface InfoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick?: () => void
  ariaLabel?: string
  icon?: React.ReactNode
  variant?: 'ghost' | 'outline' | 'default' | 'link' | 'destructive' | 'secondary'
  size?: 'icon' | 'sm' | 'default'
  className?: string
}

export function InfoButton({
  onClick,
  ariaLabel = "Mais informações do paciente",
  icon = <InfoIcon className="w-4 h-4" />,
  variant = "ghost",
  size = "icon",
  className,
  ...props
}: InfoButtonProps) {
  return (
    <Button
      onClick={onClick}
      aria-label={ariaLabel}
      variant={variant}
      size={size}
      className={cn(
        "text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 transition-colors",
        className
      )}
      {...props}
    >
      {icon}
    </Button>
  )
}

export default InfoButton
