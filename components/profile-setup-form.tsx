"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useFirebase } from "./firebase-provider"
import { useWeb3 } from "./web3-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Upload, User, Sparkles, Check, X, Award, Search, Plus } from "lucide-react"
import { SPECIALTY_OPTIONS } from "@/lib/constants"

interface ProfileSetupFormProps {
  isOpen: boolean
  onClose: () => void
}

export function ProfileSetupForm({ isOpen, onClose }: ProfileSetupFormProps) {
  const { account } = useWeb3()
  const { createUserProfile, uploadProfilePicture, checkUsernameAvailability } = useFirebase()
  const { toast } = useToast()
  const [username, setUsername] = useState("")
  const [profilePicture, setProfilePicture] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [errors, setErrors] = useState<{ username?: string; profilePicture?: string }>({})
  const [specialties, setSpecialties] = useState<string[]>([])
  const [specialtySearch, setSpecialtySearch] = useState("")
  const [showSpecialtyDropdown, setShowSpecialtyDropdown] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const usernameCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const specialtyInputRef = useRef<HTMLInputElement>(null)
  const specialtyDropdownRef = useRef<HTMLDivElement>(null)

  // Reset form when dialog closes
  const handleClose = () => {
    setUsername("")
    setProfilePicture(null)
    setPreviewUrl(null)
    setSpecialties([])
    setSpecialtySearch("")
    setShowSpecialtyDropdown(false)
    setErrors({})
    setUsernameAvailable(null)
    if (usernameCheckTimeoutRef.current) {
      clearTimeout(usernameCheckTimeoutRef.current)
    }
    onClose()
  }

  // Filter specialties based on search
  const filteredSpecialties = SPECIALTY_OPTIONS.filter(
    (opt) =>
      opt.toLowerCase().includes(specialtySearch.toLowerCase()) &&
      !specialties.includes(opt)
  )

  // Add specialty from search
  const addSpecialty = (specialty: string) => {
    if (!specialties.includes(specialty)) {
      setSpecialties((prev) => [...prev, specialty])
      setSpecialtySearch("")
      setShowSpecialtyDropdown(false)
    }
  }

  // Remove specialty
  const removeSpecialty = (specialty: string) => {
    setSpecialties((prev) => prev.filter((s) => s !== specialty))
  }

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        specialtyInputRef.current &&
        specialtyDropdownRef.current &&
        !specialtyInputRef.current.contains(event.target as Node) &&
        !specialtyDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSpecialtyDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Check username availability with debounce
  useEffect(() => {
    if (!username.trim() || username.trim().length < 3) {
      setUsernameAvailable(null)
      return
    }

    // Clear previous timeout
    if (usernameCheckTimeoutRef.current) {
      clearTimeout(usernameCheckTimeoutRef.current)
    }

    // Set loading state
    setIsCheckingUsername(true)
    setUsernameAvailable(null)

    // Debounce the check
    usernameCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailability(username.trim())
        setUsernameAvailable(available)
        if (!available) {
          setErrors((prev) => ({ ...prev, username: "This username is already taken" }))
        } else {
          setErrors((prev) => ({ ...prev, username: undefined }))
        }
      } catch (error) {
        console.error("Error checking username:", error)
        setUsernameAvailable(null)
      } finally {
        setIsCheckingUsername(false)
      }
    }, 500)

    return () => {
      if (usernameCheckTimeoutRef.current) {
        clearTimeout(usernameCheckTimeoutRef.current)
      }
    }
  }, [username, checkUsernameAvailability])

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
    } else if (username.trim().length < 3) {
      newErrors.username = "Username must be at least 3 characters"
    } else if (usernameAvailable === false) {
      newErrors.username = "This username is already taken"
    } else if (usernameAvailable === null && !isCheckingUsername) {
      // If we haven't checked yet, trigger a check
      return false
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0 && usernameAvailable === true
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

      // Double-check username availability before creating
      const isAvailable = await checkUsernameAvailability(username.trim())
      if (!isAvailable) {
        toast({
          title: "Username taken",
          description: "This username is already taken. Please choose another one.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Create user profile with the profile picture URL
      await createUserProfile({
        address: account,
        username: username.trim().toLowerCase(),
        displayName: username.trim(),
        profilePicture: profilePictureUrl,
        specialties,
      })

      toast({
        title: "Profile created",
        description: "Your profile has been set up successfully",
      })

      handleClose()
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden rounded-[32px] border-slate-200 bg-white/80 p-0 shadow-[0_20px_80px_rgba(99,102,241,0.15)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-[0_20px_80px_rgba(99,102,241,0.3)] sm:max-w-2xl">
        {/* Header with gradient accent */}
        <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-fuchsia-50 p-6 sm:p-8 dark:border-slate-800 dark:from-indigo-950/50 dark:via-purple-950/50 dark:to-fuchsia-950/50 flex-shrink-0">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-white/50 to-transparent dark:from-slate-900/50" />
          
          <div className="relative space-y-3 sm:space-y-4 text-center">
            {/* Icon */}
            <div className="mx-auto flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-fuchsia-500 shadow-[0_10px_40px_rgba(99,102,241,0.4)]">
              <User className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </div>

            {/* Title */}
            <div className="space-y-1 sm:space-y-2">
              <DialogTitle className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Set Up Your Profile
              </DialogTitle>
              <p className="mx-auto max-w-md text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Create your profile to start collaborating on tasks and bounties
              </p>
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/60 px-3 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm text-slate-700 backdrop-blur dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-indigo-600 dark:text-indigo-400" />
              Complete your profile to get started
            </div>
          </div>
        </div>

        {/* Scrollable form content */}
        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 p-4 sm:p-6 lg:p-8">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center gap-3 sm:gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-white shadow-2xl dark:border-slate-900">
                {previewUrl ? (
                  <AvatarImage src={previewUrl || "/placeholder.svg"} alt="Profile preview" />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-2xl sm:text-3xl font-semibold">
                    <User className="h-12 w-12 sm:h-16 sm:w-16" />
                  </AvatarFallback>
                )}
              </Avatar>
              <Button
                type="button"
                size="icon"
                className="absolute bottom-0 right-0 h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg transition-all hover:scale-110"
                onClick={triggerFileInput}
                disabled={isLoading}
              >
                <Upload className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            {errors.profilePicture && (
              <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">{errors.profilePicture}</p>
            )}
            <p className="text-center text-xs text-slate-600 dark:text-slate-400">
              Click the upload button to add a profile picture
            </p>
          </div>

          {/* Username Section */}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Username *
            </Label>
            <div className="relative">
              <Input
                id="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  if (e.target.value.trim()) {
                    setErrors((prev) => ({ ...prev, username: undefined }))
                  }
                }}
                placeholder="Enter a unique username"
                className={`h-10 sm:h-11 rounded-xl border-slate-300 pl-4 pr-10 dark:border-slate-700 ${
                  errors.username ? "border-red-500 focus:border-red-500" : ""
                } ${
                  usernameAvailable === true ? "border-green-500 focus:border-green-500" : ""
                }`}
                disabled={isLoading}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isCheckingUsername ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : usernameAvailable === true ? (
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : usernameAvailable === false ? (
                  <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                ) : null}
              </div>
            </div>
            {errors.username && (
              <p className="text-xs text-red-600 dark:text-red-400">{errors.username}</p>
            )}
            {usernameAvailable === true && !errors.username && (
              <p className="text-xs text-green-600 dark:text-green-400">Username is available!</p>
            )}
            {username.trim().length > 0 && username.trim().length < 3 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">Username must be at least 3 characters</p>
            )}
          </div>

          {/* Specialties Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Specialties
              </Label>
            </div>

            {/* Selected Specialties */}
            {specialties.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {specialties.map((specialty) => (
                  <div
                    key={specialty}
                    className="group flex items-center gap-1.5 rounded-full border-2 border-indigo-500 bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/50"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>{specialty}</span>
                    <button
                      type="button"
                      onClick={() => removeSpecialty(specialty)}
                      disabled={isLoading}
                      className="ml-1 rounded-full p-0.5 hover:bg-white/20 transition-colors disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search Input */}
            <div className="relative" ref={specialtyInputRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  value={specialtySearch}
                  onChange={(e) => {
                    setSpecialtySearch(e.target.value)
                    setShowSpecialtyDropdown(true)
                  }}
                  onFocus={() => setShowSpecialtyDropdown(true)}
                  placeholder="Search and add specialties..."
                  className="h-10 sm:h-11 rounded-xl border-slate-300 pl-10 pr-10 dark:border-slate-700"
                  disabled={isLoading}
                />
                {specialtySearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setSpecialtySearch("")
                      setShowSpecialtyDropdown(false)
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {showSpecialtyDropdown && filteredSpecialties.length > 0 && (
                <div
                  ref={specialtyDropdownRef}
                  className="absolute z-50 mt-2 w-full max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800"
                >
                  {filteredSpecialties.map((specialty) => (
                    <button
                      key={specialty}
                      type="button"
                      onClick={() => addSpecialty(specialty)}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-indigo-50 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <Plus className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>{specialty}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* No results message */}
              {showSpecialtyDropdown && specialtySearch && filteredSpecialties.length === 0 && (
                <div
                  ref={specialtyDropdownRef}
                  className="absolute z-50 mt-2 w-full rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                >
                  No specialties found matching "{specialtySearch}"
                </div>
              )}
            </div>

            {specialties.length > 0 && (
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {specialties.length} specialty{specialties.length !== 1 ? "ies" : ""} selected
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-700 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="rounded-full px-6 w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || isCheckingUsername || usernameAvailable === false}
              className="h-11 sm:h-12 gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-6 sm:px-8 font-semibold text-white shadow-[0_10px_40px_rgba(99,102,241,0.4)] transition-all hover:scale-[1.02] hover:shadow-[0_15px_50px_rgba(99,102,241,0.5)] disabled:opacity-50 disabled:hover:scale-100 w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating Profile...
                </>
              ) : (
                <>
                  <User className="h-5 w-5" />
                  Create Profile
                </>
              )}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}