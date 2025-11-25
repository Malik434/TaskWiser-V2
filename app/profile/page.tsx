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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, User, ArrowLeft } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SPECIALTY_OPTIONS } from "@/lib/constants";

export default function ProfilePage() {
  const { account, isConnected } = useWeb3()
  const { getUserProfile, updateUserProfile, uploadProfilePicture } = useFirebase()
  const { toast } = useToast()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [discordUsername, setDiscordUsername] = useState("")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ displayName?: string; email?: string }>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isClient, setIsClient] = useState(false)
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const router = useRouter()


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
        setDisplayName(profile.displayName ?? profile.username ?? "")
        setDiscordUsername(profile.discordUsername ?? "")
        setEmail(profile.email ?? "")
        setSelectedSpecialties(profile.specialties || [])
      } else {
        setDisplayName("")
        setDiscordUsername("")
        setEmail("")
        setSelectedSpecialties([])
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
    const newErrors: { displayName?: string; email?: string } = {}

    if (!displayName.trim()) {
      newErrors.displayName = "Display name is required"
    } else if (displayName.trim().length < 3) {
      newErrors.displayName = "Display name must be at least 3 characters"
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = "Enter a valid email address"
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
      const sanitizedDisplayName = displayName.trim()
      const sanitizedDiscord = discordUsername.trim()
      const sanitizedEmail = email.trim()

      await updateUserProfile(userProfile.id, {
        username: sanitizedDisplayName,
        displayName: sanitizedDisplayName,
        discordUsername: sanitizedDiscord || undefined,
        email: sanitizedEmail || undefined,
        specialties: selectedSpecialties,
      })

      setUserProfile({
        ...userProfile,
        username: sanitizedDisplayName,
        displayName: sanitizedDisplayName,
        discordUsername: sanitizedDiscord || undefined,
        email: sanitizedEmail || undefined,
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
    <div className="flex min-h-screen dark-container">
      <Sidebar />
      <div className="flex-1">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-sm px-4 dark-header sm:h-16 sm:px-6">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold sm:text-xl md:ml-0 ml-12">Edit Profile</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <div className="hidden sm:block">
              <WalletConnect />
            </div>
          </div>
        </header>

        <main className="animate-in fade-in duration-500 p-3 sm:p-4 md:p-6 pb-10">
          <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-muted-foreground sm:text-sm">Account Settings</p>
                <h2 className="text-xl font-semibold sm:text-2xl">Profile</h2>
              </div>
            </div>

            {!isClient ? (
              <Card className="p-6 text-center dark-card sm:p-10">
                <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-primary sm:h-6 sm:w-6" />
                <p className="text-sm text-muted-foreground sm:text-base">Initializing profile...</p>
              </Card>
            ) : !isConnected ? (
              <Card className="p-6 text-center dark-card sm:p-10">
                <p className="text-sm text-muted-foreground sm:text-base">Connect your wallet to view and edit your profile.</p>
                <div className="mt-4 flex justify-center">
                  <WalletConnect />
                </div>
              </Card>
            ) : isLoading ? (
              <Card className="p-6 text-center dark-card sm:p-10">
                <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-primary sm:h-6 sm:w-6" />
                <p className="text-sm text-muted-foreground sm:text-base">Loading your profile...</p>
              </Card>
            ) : !userProfile ? (
              <Card className="p-6 text-center dark-card sm:p-10">
                <p className="text-sm text-muted-foreground sm:text-base">No profile found. Please set up your profile from the dashboard.</p>
                <Button variant="outline" className="mt-4 text-sm sm:text-base" onClick={() => router.push("/dashboard")}>
                  Go to Dashboard
                </Button>
              </Card>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
                  <Card className="lg:col-span-1 dark-card">
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="text-base sm:text-lg">Profile Picture</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Upload an image that represents you.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-3 p-4 pt-0 sm:gap-4 sm:p-6 sm:pt-0">
                      <div className="relative">
                        <Avatar className="h-24 w-24 border border-dashed border-muted-foreground/30 dark:border-gray-700 sm:h-28 sm:w-28">
                          {userProfile?.profilePicture ? (
                            <AvatarImage src={userProfile.profilePicture || "/placeholder.svg"} alt={userProfile.username} />
                          ) : previewUrl ? (
                            <AvatarImage src={previewUrl || "/placeholder.svg"} alt="Profile preview" />
                          ) : (
                            <AvatarFallback className="dark:bg-gray-700">
                              <User className="h-8 w-8 sm:h-10 sm:w-10" />
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="absolute bottom-0 right-0 h-8 w-8 rounded-full dark:bg-gray-700 dark:border-gray-600 sm:h-9 sm:w-9"
                          onClick={triggerFileInput}
                          disabled={isUploading}
                        >
                          {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin sm:h-4 sm:w-4" /> : <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                        </Button>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center sm:text-xs">Click the button to upload a new profile picture</p>

                      <div className="w-full space-y-2">
                        <Label htmlFor="wallet-address" className="dark:text-gray-300">
                          Wallet Address
                        </Label>
                        <Input
                          id="wallet-address"
                          value={account ?? ""}
                          disabled
                          className="bg-muted dark-input dark:text-gray-300"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-2 dark-card">
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="text-base sm:text-lg">Basic Details</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Update the information that your teammates will see.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 p-4 pt-0 sm:gap-4 sm:p-6 sm:pt-0 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="display-name" className="dark:text-gray-300">
                          Display Name
                        </Label>
                        <Input
                          id="display-name"
                          value={displayName}
                          onChange={(e) => {
                            setDisplayName(e.target.value)
                            if (e.target.value.trim()) {
                              setErrors((prev) => ({ ...prev, displayName: undefined }))
                            }
                          }}
                          placeholder="e.g. Malik Ali"
                          className={`dark-input ${errors.displayName ? "border-destructive" : ""}`}
                        />
                        {errors.displayName && <p className="text-sm text-destructive">{errors.displayName}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="discord-username" className="dark:text-gray-300">
                          Discord Username
                        </Label>
                        <Input
                          id="discord-username"
                          value={discordUsername}
                          onChange={(e) => setDiscordUsername(e.target.value)}
                          placeholder="username#0000"
                          className="dark-input"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email-address" className="dark:text-gray-300">
                          Email Address
                        </Label>
                        <Input
                          id="email-address"
                          type="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value)
                            if (errors.email) {
                              setErrors((prev) => ({ ...prev, email: undefined }))
                            }
                          }}
                          placeholder="name@example.com"
                          className={`dark-input ${errors.email ? "border-destructive" : ""}`}
                        />
                        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="dark-card">
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Specialties</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">Select your areas of expertise so project leads know where you shine.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-3">
                      {SPECIALTY_OPTIONS.map((opt) => {
                        const isSelected = selectedSpecialties.includes(opt)
                        return (
                          <label
                            key={opt}
                            className={`flex items-center gap-2 rounded-md border p-2 text-xs transition hover:border-primary/60 sm:text-sm ${
                              isSelected ? "border-primary bg-primary/5 text-primary" : "border-border bg-muted/40 dark:bg-gray-800/50"
                            }`}
                          >
                            <Checkbox checked={isSelected} onCheckedChange={() => toggleSpecialty(opt)} />
                            <span className="truncate">{opt}</span>
                          </label>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isLoading} className="w-full min-w-0 text-sm dark:bg-primary dark:hover:bg-primary/90 sm:w-auto sm:min-w-[140px] sm:text-base">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin sm:h-4 sm:w-4" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}