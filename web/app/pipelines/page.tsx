import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const rows = [
  { name: 'Web App CI', repo: 'github.com/acme/web', status: 'Passing' },
  { name: 'API Gateway CI', repo: 'github.com/acme/api', status: 'Running' },
  { name: 'Runner CI', repo: 'github.com/acme/runner', status: 'Failed' },
]

export default function PipelinesPage() {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle>Pipelines</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Repository</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.name}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.repo}</TableCell>
                  <TableCell>{r.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
