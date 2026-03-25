import { cn } from '@/lib/utils'

export function PrnLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 50"
      className={cn('w-auto fill-current', className)}
    >
      <text
        y="35"
        fontFamily="Arial, sans-serif"
        fontSize="28"
        fontWeight="bold"
        className="tracking-tight"
      >
        PRN Diagnósticos
      </text>
    </svg>
  )
}
