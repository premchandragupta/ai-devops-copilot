import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export default function PoliciesPage() {
  return (
    <Card className="max-w-2xl shadow-soft">
      <CardHeader>
        <CardTitle>Policies (Editor)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="policyName">Policy Name</Label>
          <Input id="policyName" placeholder="OWASP + Company Rules" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="rules">Rules (JSON / text placeholder)</Label>
          <Textarea id="rules" rows={8} placeholder='e.g. {"failOnHighSeverity": true}' />
        </div>
      </CardContent>
      <CardFooter>
        <Button type="button">Save (no-op)</Button>
      </CardFooter>
    </Card>
  )
}
