import React from 'react'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const SalarySliderSchema = z.object({
  min: z.number().default(50000),
  max: z.number().default(200000),
  currency: z.string().default('USD'),
  current: z.number().optional(),
})

export type SalarySliderProps = z.infer<typeof SalarySliderSchema>

export function SalarySlider({ min, max, currency, current }: SalarySliderProps) {
  const [val, setVal] = React.useState(current || (min + max) / 2)

  return (
    <Card className="rounded-2xl shadow-sm border animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-lg">Salary Range</CardTitle>
        <CardDescription>Adjust the target compensation for this role.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="py-4">
          <input 
            type="range" 
            min={min} 
            max={max} 
            step={5000}
            value={val}
            onChange={(e) => setVal(parseInt(e.target.value))}
            className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground font-mono">
            <span>{currency} {min.toLocaleString()}</span>
            <span>{currency} {max.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-2xl font-bold font-mono text-primary">
            {currency} {val.toLocaleString()}
          </div>
          <Button size="sm" className="rounded-full">Set Range</Button>
        </div>
      </CardContent>
    </Card>
  )
}
