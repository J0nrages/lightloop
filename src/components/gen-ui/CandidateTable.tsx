import { z } from 'zod'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

export const CandidateSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  score: z.number(),
  status: z.enum(['new', 'interviewing', 'offered', 'rejected']),
})

export const CandidateTableSchema = z.object({
  candidates: z.array(CandidateSchema),
})

export type CandidateTableProps = z.infer<typeof CandidateTableSchema>

export function CandidateTable({ candidates }: CandidateTableProps) {
  return (
    <Card className="rounded-2xl border shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="w-[200px]">Candidate</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Score</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.map((candidate) => (
            <TableRow key={candidate.id} className="hover:bg-muted/30 transition-colors">
              <TableCell className="font-medium">{candidate.name}</TableCell>
              <TableCell className="text-muted-foreground">{candidate.role}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-12 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${candidate.score * 10}%` }} 
                    />
                  </div>
                  <span className="text-xs font-mono">{candidate.score}/10</span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Badge variant={
                  candidate.status === 'offered' ? 'default' : 
                  candidate.status === 'interviewing' ? 'secondary' : 
                  'outline'
                } className="rounded-full capitalize">
                  {candidate.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
