import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, Kanban, Globe, Zap, Shield, Users } from "lucide-react"

export function LandingFeatures() {
  return (
    <section id="features" className="py-20 md:py-32">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">Key Features</div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
              Everything You Need for Web3 Task Management
            </h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Task Wiser combines the best of blockchain technology with modern task management to create a seamless
              experience for DAOs and Web3 teams.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <Wallet className="h-6 w-6 text-primary" />
              <CardTitle className="mt-2">Wallet Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Connect your Web3 wallet seamlessly and manage tasks with your blockchain identity. Support for
                MetaMask, WalletConnect, and more.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <Kanban className="h-6 w-6 text-primary" />
              <CardTitle className="mt-2">Kanban Board</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Visualize your workflow with our intuitive Kanban board. Drag and drop tasks between columns and track
                progress in real-time.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <Globe className="h-6 w-6 text-primary" />
              <CardTitle className="mt-2">DAO Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Connect with hundreds of DAOs, explore their bounties, and contribute to projects that match your skills
                and interests.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <Zap className="h-6 w-6 text-primary" />
              <CardTitle className="mt-2">Smart Contracts</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Automate payments and task verification with smart contracts. Set up escrow for bounties and release
                funds when work is approved.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <Shield className="h-6 w-6 text-primary" />
              <CardTitle className="mt-2">Reputation System</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Build your on-chain reputation as you complete tasks. Showcase your skills and experience to attract
                more opportunities.
              </CardDescription>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <Users className="h-6 w-6 text-primary" />
              <CardTitle className="mt-2">Team Collaboration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Collaborate with team members in real-time. Assign tasks, leave comments, and track progress together,
                all secured by blockchain.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
