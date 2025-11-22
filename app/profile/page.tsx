"use client";

import { useEffect, useState, useRef } from "react";
import { Sidebar } from "@/components/sidebar";
import { WalletConnect } from "@/components/wallet-connect";
import { ThemeToggle } from "@/components/theme-toggle";
import { useWeb3 } from "@/components/web3-provider";
import { useFirebase } from "@/components/firebase-provider";
import type { UserProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, User, ArrowLeft } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { account, isConnected } = useWeb3()
  const { getUserProfile, updateUserProfile, uploadProfilePicture } = useFirebase()
  const { toast } = useToast()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [username, setUsername] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ username?: string }>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isClient, setIsClient] = useState(false)
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const router = useRouter()

  const SPECIALTY_OPTIONS = [
    "Frontend",
    "Backend",
    "Full Stack",
    "Smart Contracts",
    "DevOps",
    "UI/UX",
    "Data Science",
    "AI/ML",
    "QA",
    "Security",
    "Product Management",
    "Community",
    "Technical Writing",
    "Documentation",
    "Marketing",
    "Growth",
    "DAO Operations",
    "Treasury",
    "Legal",
    "Research",
    "Partnerships",
    "Content",
    "Social Media",
    "Analytics",
    "Mobile",
    "Cloud",
    "Protocol Design",
    "Governance",
    "Translation",
    "Video",
  ]

  // This effect ensures we only check wallet connection status on the client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (account) {
      fetchUserProfile()
    }
  }, [account])

  const fetchUserProfile = async () => {
    if (!account) return

    setIsLoading(true)
    try {
      const profile = await getUserProfile(account)
      if (profile) {
        setUserProfile(profile)
        setUsername(profile.username)
        setSelectedSpecialties(profile.specialties || [])
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !account || !userProfile?.id) return

    setIsUploading(true)
    try {
      const url = await uploadProfilePicture(file, account)
      setPreviewUrl(url)
      await updateUserProfile(userProfile.id, { profilePicture: url })
      setUserProfile({ ...userProfile, profilePicture: url })
      toast({ title: "Success", description: "Profile picture updated" })
    } catch (error) {
      console.error("Error uploading profile picture:", error)
      toast({ title: "Error", description: "Failed to upload picture", variant: "destructive" })
    } finally {
      setIsUploading(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const validateForm = (): boolean => {
    const newErrors: { username?: string } = {}

    if (!username.trim()) {
      newErrors.username = "Username is required"
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const toggleSpecialty = (value: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!account || !userProfile?.id) {
      toast({
        title: "Error",
        description: "Wallet not connected or profile not found",
        variant: "destructive",
      })
      return
    }

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      await updateUserProfile(userProfile.id, {
        username,
        specialties: selectedSpecialties,
      })

      setUserProfile({
        ...userProfile,
        username,
        specialties: selectedSpecialties,
      })

      toast({
        title: "Success",
        description: "Profile updated successfully",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-[hsl(210,40%,98%)] to-[hsl(250,40%,98%)] dark:bg-[#121212]">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-gray-200 dark:border-[#333] bg-white/80 dark:bg-[#121212] backdrop-blur-sm px-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-bold">Edit Profile</h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <WalletConnect />
          </div>
        </header>

        <main className="animate-in fade-in duration-500">
          <div className="container mx-auto p-4">
            {!isClient ? (
              <div className="py-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : !isConnected ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">Connect your wallet to view and edit your profile.</p>
              </div>
            ) : isLoading ? (
              <div className="py-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : !userProfile ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">No profile found. Please set up your profile from the dashboard.</p>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-24 w-24 dark:border dark:border-gray-700">
                      {userProfile?.profilePicture ? (
                        <AvatarImage src={userProfile.profilePicture || "/placeholder.svg"} alt={userProfile.username} />
                      ) : previewUrl ? (
                        <AvatarImage src={previewUrl || "/placeholder.svg"} alt="Profile preview" />
                      ) : (
                        <AvatarFallback className="dark:bg-gray-700">
                          <User className="h-12 w-12" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="absolute bottom-0 right-0 h-8 w-8 rounded-full transition-all duration-200 dark:bg-gray-700 dark:border-gray-600"
                      onClick={triggerFileInput}
                      disabled={isUploading}
                    >
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </Button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </div>
                  <p className="text-sm text-muted-foreground dark:text-gray-400">Click the button to upload a new profile picture</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="wallet-address" className="dark:text-gray-300">Wallet Address</Label>
                    <Input id="wallet-address" value={account} disabled className="bg-muted dark-input dark:text-gray-300" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username" className="dark:text-gray-300">Username</Label>
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
                      className={`dark-input ${errors.username ? "border-destructive" : ""}`}
                    />
                    {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
                  </div>

                  <div className="space-y-3">
                    <Label className="dark:text-gray-300">Specialties</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {SPECIALTY_OPTIONS.map((opt) => (
                        <label key={opt} className="flex items-center gap-2 text-sm">
                          <Checkbox checked={selectedSpecialties.includes(opt)} onCheckedChange={() => toggleSpecialty(opt)} />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isLoading} className="dark:bg-primary dark:hover:bg-primary/90">
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}