import React from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'

export const QuizSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  correctAnswerIndex: z.number().optional(),
})

export type QuizProps = z.infer<typeof QuizSchema>

export function Quiz({ question, options }: QuizProps) {
  const [selected, setSelected] = React.useState<number | null>(null)

  return (
    <Card className="max-w-md mx-auto rounded-2xl shadow-sm border animate-in fade-in zoom-in-95 duration-500">
      <CardHeader>
        <CardTitle className="text-lg">Skill Assessment</CardTitle>
        <CardDescription>{question}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {options.map((option, i) => (
          <Button 
            key={i} 
            variant={selected === i ? "default" : "outline"} 
            className="justify-start text-left h-auto py-3 px-4 rounded-xl transition-all"
            onClick={() => setSelected(i)}
          >
            <span className="mr-3 text-muted-foreground font-mono">{String.fromCharCode(65 + i)}</span>
            {option}
          </Button>
        ))}
      </CardContent>
      <CardFooter className="justify-between border-t p-4">
        <p className="text-xs text-muted-foreground">Select the best answer to proceed.</p>
        <Button disabled={selected === null} size="sm">Submit</Button>
      </CardFooter>
    </Card>
  )
}
