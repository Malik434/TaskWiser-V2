import { Card, CardContent } from "@/components/ui/card"
import { Brain, Bot, Sparkles, LineChart } from "lucide-react"
import Image from "next/image"

export function LandingAI() {
  return (
    <section id="ai" className="py-20 md:py-32">
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-full border border-slate-300 bg-slate-100 px-4 py-1 text-sm text-slate-700 backdrop-blur dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
              <Sparkles className="mr-2 inline h-3.5 w-3.5 text-primary" />
              AI Integration
            </div>
            <h2 className="text-3xl font-bold tracking-tighter text-slate-900 sm:text-5xl dark:text-slate-50">Supercharge Your Workflow with AI</h2>
            <p className="max-w-[900px] text-slate-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-slate-400">
              Task Wiser leverages cutting-edge AI to help you work smarter, not harder. Our AI assistant helps you
              prioritize tasks, find relevant bounties, and optimize your workflow.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-6 sm:mt-12 md:mt-16 md:grid-cols-2">
          <div className="flex flex-col gap-4 sm:gap-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 sm:h-10 sm:w-10 dark:bg-primary/20">
                <Brain className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 sm:text-lg md:text-xl dark:text-slate-100">Smart Task Prioritization</h3>
                <p className="text-xs text-slate-600 sm:text-sm md:text-base dark:text-slate-400">
                  Our AI analyzes your work patterns and deadlines to suggest the optimal order for tackling your tasks.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 sm:h-10 sm:w-10 dark:bg-primary/20">
                <Bot className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 sm:text-lg md:text-xl dark:text-slate-100">AI Task Assistant</h3>
                <p className="text-xs text-slate-600 sm:text-sm md:text-base dark:text-slate-400">
                  Get help breaking down complex tasks, generating task descriptions, and estimating completion time.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 sm:h-10 sm:w-10 dark:bg-primary/20">
                <Sparkles className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 sm:text-lg md:text-xl dark:text-slate-100">Bounty Matching</h3>
                <p className="text-xs text-slate-600 sm:text-sm md:text-base dark:text-slate-400">
                  Our AI matches your skills and interests with available bounties across the Web3 ecosystem.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 sm:h-10 sm:w-10 dark:bg-primary/20">
                <LineChart className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 sm:text-lg md:text-xl dark:text-slate-100">Performance Analytics</h3>
                <p className="text-xs text-slate-600 sm:text-sm md:text-base dark:text-slate-400">
                  Get AI-powered insights into your productivity patterns and suggestions for improvement.
                </p>
              </div>
            </div>
          </div>
          <Card className="overflow-hidden border-slate-200 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900">
            <CardContent className="p-0">
              <div className="relative aspect-video overflow-hidden rounded-t-lg bg-slate-100 dark:bg-slate-950">
                <Image
                  src="/images/ai-assistant.png"
                  alt="AI Assistant Interface"
                  className="object-cover"
                  width={600}
                  height={400}
                />
              </div>
              <div className="p-4 sm:p-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-900 sm:text-xl md:text-2xl dark:text-slate-100">AI Chat Assistant</h3>
                  <p className="text-xs text-slate-600 sm:text-sm md:text-base dark:text-slate-400">
                    Our AI assistant helps you manage tasks, find information, and optimize your workflow through
                    natural language conversation.
                  </p>
                </div>
                <div className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">
                  <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary sm:h-8 sm:w-8">
                      <span className="text-[10px] font-bold text-white sm:text-xs">AI</span>
                    </div>
                    <div className="rounded-lg bg-slate-100 p-2 sm:p-3 dark:bg-slate-800">
                      <p className="text-xs text-slate-700 sm:text-sm dark:text-slate-300">How can I help you manage your tasks today?</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-300 sm:h-8 sm:w-8 dark:bg-slate-700">
                      <span className="text-[10px] font-bold text-slate-700 sm:text-xs dark:text-slate-200">You</span>
                    </div>
                    <div className="rounded-lg bg-slate-200 p-2 sm:p-3 dark:bg-slate-800">
                      <p className="text-xs text-slate-700 sm:text-sm dark:text-slate-300">Find me high-priority bounties in smart contract development</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary sm:h-8 sm:w-8">
                      <span className="text-[10px] font-bold text-white sm:text-xs">AI</span>
                    </div>
                    <div className="rounded-lg bg-slate-100 p-2 sm:p-3 dark:bg-slate-800">
                      <p className="text-xs text-slate-700 sm:text-sm dark:text-slate-300">
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
