"use client"

import { Streamdown } from "streamdown"
import { code } from "@streamdown/code"
import { mermaid } from "@streamdown/mermaid"
import { cjk } from "@streamdown/cjk"
import { cn } from "@/lib/utils"

export type MarkdownProps = {
  children: string
  className?: string
  isAnimating?: boolean
}

export function Markdown({ children, className, isAnimating }: MarkdownProps) {
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <Streamdown
        plugins={{ code, mermaid, cjk }}
        isAnimating={isAnimating}
      >
        {children}
      </Streamdown>
    </div>
  )
}
