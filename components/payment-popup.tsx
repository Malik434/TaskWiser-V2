"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, DollarSign } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Task } from "@/lib/types"

interface PaymentPopupProps {
  isOpen: boolean
  onClose: () => void
  task: Task | null
  onPaymentComplete: (taskId: string) => Promise<void>
}

export function PaymentPopup({ isOpen, onClose, task, onPaymentComplete }: PaymentPopupProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  const handlePayment = async () => {
    if (!task) return

    setIsProcessing(true)

    // Step 1: Initializing transaction
    setCurrentStep(1)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Step 2: Connecting to wallet
    setCurrentStep(2)
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Step 3: Processing payment
    setCurrentStep(3)
    await new Promise((resolve) => setTimeout(resolve, 2500))

    // Step 4: Confirming transaction
    setCurrentStep(4)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Complete
    setIsComplete(true)
    setIsProcessing(false)

    // Update the task
    await onPaymentComplete(task.id)
  }

  const handleClose = () => {
    if (!isProcessing) {
      setCurrentStep(0)
      setIsComplete(false)
      onClose()
    }
  }

  const steps = [
    { id: 1, label: "Initializing transaction" },
    { id: 2, label: "Connecting to wallet" },
    { id: 3, label: "Processing payment" },
    { id: 4, label: "Confirming transaction" },
  ]

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-lg dark:bg-gray-800 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle>Process Payment</DialogTitle>
          <DialogDescription className="dark:text-gray-300">
            {isComplete
              ? "Payment has been successfully processed."
              : "Complete the payment for this task to mark it as paid."}
          </DialogDescription>
        </DialogHeader>

        {task && (
          <div className="py-4">
            <div className="mb-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <h3 className="font-medium mb-1 dark:text-white">{task.title}</h3>
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  variant="outline"
                  className="bg-green-500/20 text-green-500 border-green-500/50 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                >
                  Completed
                </Badge>
                {task.reward && task.rewardAmount && (
                  <Badge
                    variant="outline"
                    className="bg-purple-600/20 text-purple-400 border-purple-600/50 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800"
                  >
                    {task.rewardAmount} {task.reward}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground dark:text-gray-400">
                {task.description.length > 100 ? `${task.description.substring(0, 100)}...` : task.description}
              </p>
            </div>

            {isComplete ? (
              <div className="flex flex-col items-center justify-center py-4">
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-medium mb-1 dark:text-white">Payment Successful!</h3>
                <p className="text-sm text-muted-foreground text-center dark:text-gray-300">
                  The payment has been processed successfully. The task has been marked as paid.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  {steps.map((step) => (
                    <div key={step.id} className="flex items-center gap-3">
                      <div
                        className={`h-6 w-6 rounded-full flex items-center justify-center ${
                          currentStep >= step.id
                            ? currentStep === step.id
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                              : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {currentStep > step.id ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : currentStep === step.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <span className="text-xs">{step.id}</span>
                        )}
                      </div>
                      <span
                        className={
                          currentStep >= step.id
                            ? currentStep === step.id
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-green-600 dark:text-green-400"
                            : "text-gray-500 dark:text-gray-400"
                        }
                      >
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>

                {task.reward && task.rewardAmount && (
                  <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium dark:text-white">Payment Amount</p>
                        <p className="text-xs text-muted-foreground dark:text-gray-400">Token: {task.reward}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold dark:text-white">{task.rewardAmount}</p>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">
                        ≈ $
                        {task.reward === "USDC"
                          ? task.rewardAmount
                          : task.reward === "ETH"
                            ? (task.rewardAmount * 3500).toFixed(2)
                            : task.reward === "BNB"
                              ? (task.rewardAmount * 500).toFixed(2)
                              : 0}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {isComplete ? (
            <Button onClick={handleClose} className="w-full rounded-md">
              Close
            </Button>
          ) : (
            <div className="flex w-full gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isProcessing} className="flex-1 rounded-md">
                Cancel
              </Button>
              <Button onClick={handlePayment} disabled={isProcessing} className="flex-1 gradient-button rounded-md">
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Pay Now
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
