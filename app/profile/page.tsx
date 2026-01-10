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
import { Loader2, Upload, User, ArrowLeft, Mail, Hash, Wallet, Sparkles, Check, Edit2, Award, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { SPECIALTY_OPTIONS } from "@/lib/constants";
import { ProtectedRoute } from "@/components/protected-route";

export default function ProfilePage() {
  const { account } = useWeb3()
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
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const router = useRouter()

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

      const updatePayload: Partial<UserProfile> = {
        username: sanitizedDisplayName,
        displayName: sanitizedDisplayName,
        specialties: selectedSpecialties,
      };

      // Only include optional fields if they have values
      // Empty fields will be omitted from the update (keeping existing values)
      if (sanitizedDiscord) {
        updatePayload.discordUsername = sanitizedDiscord;
      }

      if (sanitizedEmail) {
        updatePayload.email = sanitizedEmail;
      }

      await updateUserProfile(userProfile.id, updatePayload)

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
    <ProtectedRoute>
      <div className="flex h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          {/* Enhanced Header */}
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-3 md:ml-0 ml-12">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                    Profile Settings
                  </h1>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Manage your account information
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <ThemeToggle />
                <div className="hidden sm:block">
                  <WalletConnect />
                </div>
              </div>
            </div>
          </header>

          <main className="animate-in fade-in duration-500 p-4 sm:p-6">
            <div className="mx-auto max-w-5xl space-y-6">
              {/* Page Header */}
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  Account Settings
                </div>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                  Edit Profile
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Update your personal information and specialties
                </p>
              </div>

              {isLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-16 text-center shadow-lg dark:border-slate-800 dark:bg-slate-900/80">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
                  <p className="mt-4 text-sm font-medium text-slate-900 dark:text-slate-50">Loading your profile...</p>
                </div>
              ) : !userProfile ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-16 text-center dark:border-slate-700 dark:bg-slate-900/30">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950/50 dark:to-purple-950/50">
                    <User className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-50">No profile found</p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Please set up your profile from the dashboard</p>
                  <Button
                    variant="outline"
                    className="mt-6 gap-2 rounded-xl"
                    onClick={() => router.push("/dashboard")}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Go to Dashboard
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Profile Picture & Wallet Section */}
                  <div className="grid gap-6 lg:grid-cols-3">
                    <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-lg dark:border-slate-800 dark:bg-slate-900/80 lg:col-span-1">
                      <div className="border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-6 dark:border-slate-800 dark:from-indigo-950/30 dark:to-purple-950/30">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                              Profile Picture
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
                              Your avatar
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                      <CardContent className="flex flex-col items-center gap-6 p-6">
                        <div className="relative">
                          <Avatar className="h-32 w-32 border-4 border-white shadow-2xl dark:border-slate-900">
                            {userProfile?.profilePicture ? (
                              <AvatarImage src={userProfile.profilePicture || "/placeholder.svg"} alt={userProfile.username} />
                            ) : previewUrl ? (
                              <AvatarImage src={previewUrl || "/placeholder.svg"} alt="Profile preview" />
                            ) : (
                              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-3xl font-semibold">
                                {userProfile.username?.substring(0, 2).toUpperCase() || <User className="h-12 w-12" />}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <Button
                            type="button"
                            size="icon"
                            className="absolute bottom-0 right-0 h-10 w-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg transition-all hover:scale-110"
                            onClick={triggerFileInput}
                            disabled={isUploading}
                          >
                            {isUploading ? (
                              <Loader2 className="h-5 w-5 animate-spin text-white" />
                            ) : (
                              <Upload className="h-5 w-5 text-white" />
                            )}
                          </Button>
                          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        </div>
                        <p className="text-center text-xs text-slate-600 dark:text-slate-400">
                          Click the upload button to change your picture
                        </p>

                        <div className="w-full space-y-2">
                          <Label htmlFor="wallet-address" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Wallet Address
                          </Label>
                          <div className="relative">
                            <Wallet className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                              id="wallet-address"
                              value={account ?? ""}
                              disabled
                              className="rounded-xl border-slate-300 bg-slate-50 pl-10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Basic Details */}
                    <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-lg dark:border-slate-800 dark:bg-slate-900/80 lg:col-span-2">
                      <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-6 dark:border-slate-800 dark:from-blue-950/30 dark:to-cyan-950/30">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
                            <Edit2 className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                              Basic Information
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
                              Personal details visible to your team
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                      <CardContent className="grid gap-5 p-6 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="display-name" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Display Name *
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
                            placeholder="e.g. Charles Babbage"
                            className={`h-11 rounded-xl border-slate-300 dark:border-slate-700 ${
                              errors.displayName ? "border-red-500 focus:border-red-500" : ""
                            }`}
                          />
                          {errors.displayName && (
                            <p className="text-xs text-red-600 dark:text-red-400">{errors.displayName}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="discord-username" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Discord Username
                          </Label>
                          <div className="relative">
                            <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                              id="discord-username"
                              value={discordUsername}
                              onChange={(e) => setDiscordUsername(e.target.value)}
                              placeholder="username#0000"
                              className="h-11 rounded-xl border-slate-300 pl-10 dark:border-slate-700"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email-address" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Email Address
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
                              className={`h-11 rounded-xl border-slate-300 pl-10 dark:border-slate-700 ${
                                errors.email ? "border-red-500 focus:border-red-500" : ""
                              }`}
                            />
                          </div>
                          {errors.email && (
                            <p className="text-xs text-red-600 dark:text-red-400">{errors.email}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Specialties Section - Compact Tags */}
                  <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-lg dark:border-slate-800 dark:bg-slate-900/80">
                    <div className="border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50 p-6 dark:border-slate-800 dark:from-amber-950/30 dark:to-orange-950/30">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
                          <Award className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                            Specialties
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
                            Select your areas of expertise
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-6">
                      <div className="flex flex-wrap gap-2.5">
                        {SPECIALTY_OPTIONS.map((opt) => {
                          const isSelected = selectedSpecialties.includes(opt)
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => toggleSpecialty(opt)}
                              className={`group flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-medium transition-all hover:scale-105 ${
                                isSelected
                                  ? "border-indigo-500 bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/50"
                                  : "border-slate-300 bg-white text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                              }`}
                            >
                              {isSelected && <Check className="h-4 w-4" />}
                              <span>{opt}</span>
                            </button>
                          )
                        })}
                      </div>
                      {selectedSpecialties.length > 0 && (
                        <div className="mt-4 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                          <span>{selectedSpecialties.length} specialty{selectedSpecialties.length !== 1 ? "ies" : ""} selected</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="h-12 gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-8 font-semibold text-white shadow-[0_10px_40px_rgba(99,102,241,0.4)] transition-all hover:scale-[1.02] hover:shadow-[0_15px_50px_rgba(99,102,241,0.5)]"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Saving Changes...
                        </>
                      ) : (
                        <>
                          <Save className="h-5 w-5" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}