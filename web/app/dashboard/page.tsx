import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DashboardPage() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Release Health</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Quick summary cards will live here (builds, tests, alerts).</p>
        </CardContent>
      </Card>
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Security Findings</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Latest HIGH/MEDIUM findings snapshot.</p>
        </CardContent>
      </Card>
    </div>
  )
}
