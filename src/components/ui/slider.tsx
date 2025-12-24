import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps {
  value?: number[]
  onValueChange?: (value: number[]) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  className?: string
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      value = [0],
      onValueChange,
      min = 0,
      max = 100,
      step = 1,
      disabled = false,
      className,
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(value)
    const [isDragging, setIsDragging] = React.useState(false)

    const currentValue = value ?? internalValue
    const handleChange = onValueChange ?? setInternalValue

    const percentage = ((currentValue[0] - min) / (max - min)) * 100

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return
      setIsDragging(true)
      updateValue(e)
    }

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || !isDragging) return
      updateValue(e)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    const updateValue = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = Math.max(0, Math.min(1, x / rect.width))
      const rawValue = percentage * (max - min) + min
      const steppedValue = Math.round(rawValue / step) * step
      const clampedValue = Math.max(min, Math.min(max, steppedValue))
      handleChange([clampedValue])
    }

    React.useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value)
      }
    }, [value])

    React.useEffect(() => {
      if (isDragging) {
        window.addEventListener("mouseup", handleMouseUp)
        return () => window.removeEventListener("mouseup", handleMouseUp)
      }
    }, [isDragging])

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex h-5 w-full touch-none select-none items-center",
          className
        )}
      >
        <div
          className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        >
          <div
            className="absolute h-full bg-primary"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div
          className="absolute h-5 w-5 rounded-full border-2 border-primary bg-background shadow"
          style={{ left: `calc(${percentage}% - 10px)` }}
          onMouseDown={handleMouseDown}
        />
      </div>
    )
  }
)
Slider.displayName = "Slider"

export { Slider }
