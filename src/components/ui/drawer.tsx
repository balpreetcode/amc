import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface DrawerProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  side?: "right" | "left"
}

interface DrawerContentProps {
  children: React.ReactNode
  className?: string
}

interface DrawerHeaderProps {
  children: React.ReactNode
  className?: string
}

interface DrawerTitleProps {
  children: React.ReactNode
  className?: string
}

interface DrawerDescriptionProps {
  children: React.ReactNode
  className?: string
}

interface DrawerFooterProps {
  children: React.ReactNode
  className?: string
}

interface DrawerCloseProps {
  children?: React.ReactNode
  className?: string
}

const DrawerContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
}>({
  open: false,
  onOpenChange: () => {},
})

export function Drawer({ open = false, onOpenChange, children, side = "right" }: DrawerProps) {
  const [internalOpen, setInternalOpen] = React.useState(open)

  const currentValue = open ?? internalOpen
  const handleChange = onOpenChange ?? setInternalOpen

  React.useEffect(() => {
    if (open !== undefined) {
      setInternalOpen(open)
    }
  }, [open])

  if (!currentValue) return null

  return (
    <DrawerContext.Provider value={{ open: currentValue, onOpenChange: handleChange }}>
      <div className="fixed inset-0 z-50 flex">
        <div
          className="fixed inset-0 bg-black/50"
          onClick={() => handleChange(false)}
        />
        <div
          className={cn(
            "fixed z-50 h-full w-[400px] border bg-background shadow-lg transition-transform",
            side === "right" ? "right-0" : "left-0"
          )}
        >
          {children}
        </div>
      </div>
    </DrawerContext.Provider>
  )
}

export function DrawerContent({ children, className }: DrawerContentProps) {
  return <div className={cn("flex h-full flex-col", className)}>{children}</div>
}

export function DrawerHeader({ children, className }: DrawerHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between border-b p-6", className)}>
      {children}
    </div>
  )
}

export function DrawerTitle({ children, className }: DrawerTitleProps) {
  return (
    <h2 className={cn("text-lg font-semibold", className)}>
      {children}
    </h2>
  )
}

export function DrawerDescription({ children, className }: DrawerDescriptionProps) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </p>
  )
}

export function DrawerFooter({ children, className }: DrawerFooterProps) {
  return (
    <div className={cn("mt-auto border-t p-6", className)}>
      {children}
    </div>
  )
}

export function DrawerClose({ children, className }: DrawerCloseProps) {
  const { onOpenChange } = React.useContext(DrawerContext)

  return (
    <button onClick={() => onOpenChange(false)} className={className}>
      {children || <X className="h-5 w-5" />}
    </button>
  )
}
