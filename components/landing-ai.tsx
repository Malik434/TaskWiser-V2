import { Card, CardContent } from "@/components/ui/card"
import { Brain, Bot, Sparkles, LineChart } from "lucide-react"
import Image from "next/image"

export function LandingAI() {
  return (
    <section id="ai" className="py-20 md:py-32 bg-gradient-to-b from-background/50 to-background">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">AI Integration</div>
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Supercharge Your Workflow with AI</h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Task Wiser leverages cutting-edge AI to help you work smarter, not harder. Our AI assistant helps you
              prioritize tasks, find relevant bounties, and optimize your workflow.
            </p>
          </div>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Smart Task Prioritization</h3>
                <p className="text-muted-foreground">
                  Our AI analyzes your work patterns and deadlines to suggest the optimal order for tackling your tasks.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold">AI Task Assistant</h3>
                <p className="text-muted-foreground">
                  Get help breaking down complex tasks, generating task descriptions, and estimating completion time.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Bounty Matching</h3>
                <p className="text-muted-foreground">
                  Our AI matches your skills and interests with available bounties across the Web3 ecosystem.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <LineChart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Performance Analytics</h3>
                <p className="text-muted-foreground">
                  Get AI-powered insights into your productivity patterns and suggestions for improvement.
                </p>
              </div>
            </div>
          </div>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative aspect-video overflow-hidden rounded-t-lg">
                <Image
                  src="/images/ai-assistant.png"
                  alt="AI Assistant Interface"
                  className="object-cover"
                  width={600}
                  height={400}
                />
              </div>
              <div className="p-6">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">AI Chat Assistant</h3>
                  <p className="text-muted-foreground">
                    Our AI assistant helps you manage tasks, find information, and optimize your workflow through
                    natural language conversation.
                  </p>
                </div>
                <div className="mt-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                      <span className="text-xs font-bold text-white">AI</span>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-sm">How can I help you manage your tasks today?</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                      <span className="text-xs font-bold">You</span>
                    </div>
                    <div className="rounded-lg bg-secondary p-3">
                      <p className="text-sm">Find me high-priority bounties in smart contract development</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                      <span className="text-xs font-bold text-white">AI</span>
                    </div>
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-sm">
                        I've found 5 high-priority smart contract bounties that match your skills. The highest paying
                        one is from ZetaChain offering 2 ETH for implementing a new staking contract...
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
