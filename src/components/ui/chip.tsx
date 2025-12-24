import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface ChipProps {
  value: string
  onRemove?: () => void
  className?: string
}

export function Chip({ value, onRemove, className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border bg-secondary px-2.5 py-0.5 text-sm",
        className
      )}
    >
      {value}
      {onRemove && (
        <button
          onClick={onRemove}
          className="rounded-full hover:bg-muted-foreground/20"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}

interface ChipInputProps {
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  className?: string
}

export function ChipInput({ values, onChange, placeholder, className }: ChipInputProps) {
  const [input, setInput] = React.useState("")

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault()
      if (!values.includes(input.trim())) {
        onChange([...values, input.trim()])
      }
      setInput("")
    } else if (e.key === "Backspace" && !input && values.length > 0) {
      onChange(values.slice(0, -1))
    }
  }

  const handleRemove = (index: number) => {
    onChange(values.filter((_, i) => i !== index))
  }

  return (
    <div
      className={cn(
        "flex min-h-10 w-full flex-wrap items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className
      )}
    >
      {values.map((value, index) => (
        <Chip key={index} value={value} onRemove={() => handleRemove(index)} />
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={values.length === 0 ? placeholder : ""}
        className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}
