"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useFirebase } from "./firebase-provider"
import { useWeb3 } from "./web3-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Upload, User } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

interface ProfileSetupFormProps {
  isOpen: boolean
  onClose: () => void
}

const SPECIALTY_OPTIONS = [
  "Writing",
  "Development",
  "Design",
  "Translation",
  "Community",
  "Video",
]

export function ProfileSetupForm({ isOpen, onClose }: ProfileSetupFormProps) {
  const { account } = useWeb3()
  const { createUserProfile, uploadProfilePicture } = useFirebase()
  const { toast } = useToast()
  const [username, setUsername] = useState("")
  const [profilePicture, setProfilePicture] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ username?: string; profilePicture?: string }>({})
  const [specialties, setSpecialties] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({ ...prev, profilePicture: "Please upload an image file" }))
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, profilePicture: "Image must be less than 5MB" }))
        return
      }

      setProfilePicture(file)
      setPreviewUrl(URL.createObjectURL(file))
      setErrors((prev) => ({ ...prev, profilePicture: undefined }))
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const validateForm = (): boolean => {
    const newErrors: { username?: string; profilePicture?: string } = {}

    if (!username.trim()) {
      newErrors.username = "Username is required"
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const toggleSpecialty = (value: string) => {
    setSpecialties((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!account) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to continue",
        variant: "destructive",
      })
      return
    }

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      let profilePictureUrl = ""

      if (profilePicture) {
        try {
          profilePictureUrl = await uploadProfilePicture(profilePicture, account)
        } catch (error) {
          console.error("Error uploading profile picture:", error)
          // Use a default image if upload fails
          profilePictureUrl = `/placeholder.svg?height=200&width=200`
        }
      } else {
        // Use default image if no profile picture was selected
        profilePictureUrl = `/placeholder.svg?height=200&width=200`
      }

      // Create user profile with the profile picture URL
      await createUserProfile({
        address: account,
        username,
        profilePicture: profilePictureUrl,
        specialties,
      })

      toast({
        title: "Profile created",
        description: "Your profile has been set up successfully",
      })

      onClose()
    } catch (error) {
      console.error("Error setting up profile:", error)
      toast({
        title: "Error",
        description: "Failed to set up profile",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set up your profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                {previewUrl ? (
                  <AvatarImage src={previewUrl || "/placeholder.svg"} alt="Profile preview" />
                ) : (
                  <>
                    <AvatarFallback>
                      <User className="h-12 w-12" />
                    </AvatarFallback>
                  </>
                )}
              </Avatar>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                onClick={triggerFileInput}
              >
                <Upload className="h-4 w-4" />
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            {errors.profilePicture && <p className="text-sm text-destructive">{errors.profilePicture}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                if (e.target.value.trim()) {
                  setErrors((prev) => ({ ...prev, username: undefined }))
                }
              }}
              placeholder="Enter a username"
              className={errors.username ? "border-destructive" : ""}
            />
            {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
          </div>

          <div className="space-y-3">
            <Label>Specialties</Label>
            <div className="grid grid-cols-2 gap-2">
              {SPECIALTY_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={specialties.includes(opt)}
                    onCheckedChange={() => toggleSpecialty(opt)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Profile"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}