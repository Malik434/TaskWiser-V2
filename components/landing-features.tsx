import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, Kanban, Globe, Zap, Shield, Users } from "lucide-react"

export function LandingFeatures() {
  return (
    <section id="features" className="py-20 md:py-32">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary dark:bg-primary/20">Key Features</div>
            <h2 className="text-3xl font-bold tracking-tighter text-slate-900 sm:text-5xl dark:text-slate-50">
              Everything You Need for Web3 Task Management
            </h2>
            <p className="max-w-[900px] text-slate-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-slate-400">
              Task Wiser combines the best of blockchain technology with modern task management to create a seamless
              experience for DAOs and Web3 teams.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-slate-200 bg-white shadow-md transition-all hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="pb-2">
              <Wallet className="h-6 w-6 text-primary" />
              <CardTitle className="mt-2 text-slate-900 dark:text-slate-100">Wallet Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Connect your Web3 wallet seamlessly and manage tasks with your blockchain identity. Support for
                MetaMask, WalletConnect, and more.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white shadow-md transition-all hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="pb-2">
              <Kanban className="h-6 w-6 text-primary" />
              <CardTitle className="mt-2 text-slate-900 dark:text-slate-100">Kanban Board</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Visualize your workflow with our intuitive Kanban board. Drag and drop tasks between columns and track
                progress in real-time.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white shadow-md transition-all hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="pb-2">
              <Globe className="h-6 w-6 text-primary" />
              <CardTitle className="mt-2 text-slate-900 dark:text-slate-100">DAO Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Connect with hundreds of DAOs, explore their bounties, and contribute to projects that match your skills
                and interests.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white shadow-md transition-all hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="pb-2">
              <Zap className="h-6 w-6 text-primary" />
              <CardTitle className="mt-2 text-slate-900 dark:text-slate-100">Smart Contracts</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Automate payments and task verification with smart contracts. Set up escrow for bounties and release
                funds when work is approved.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white shadow-md transition-all hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="pb-2">
              <Shield className="h-6 w-6 text-primary" />
              <CardTitle className="mt-2 text-slate-900 dark:text-slate-100">Reputation System</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Build your on-chain reputation as you complete tasks. Showcase your skills and experience to attract
                more opportunities.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="border-slate-200 bg-white shadow-md transition-all hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="pb-2">
              <Users className="h-6 w-6 text-primary" />
              <CardTitle className="mt-2 text-slate-900 dark:text-slate-100">Team Collaboration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-600 dark:text-slate-400">
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
