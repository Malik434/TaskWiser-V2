"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useFirebase } from "@/components/firebase-provider";
import { useWeb3 } from "@/components/web3-provider";
import type { UserProfile } from "@/lib/types";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { SPECIALTY_OPTIONS } from "@/lib/specialties";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ProfileSetupForm({ onSuccess }: { onSuccess: (profile: UserProfile) => void }) {
  const { createUserProfile, getUserProfileById, uploadProfilePicture } = useFirebase();
  const { account } = useWeb3();
  const { toast } = useToast();

  const [username, setUsername] = useState("");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string }>({});

  const validateForm = (): boolean => {
    const newErrors: { username?: string } = {};
    if (!username.trim()) {
      newErrors.username = "Username is required";
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const toggleSpecialty = (value: string) => {
    setSelectedSpecialties((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setProfilePictureFile(file);
    setProfilePicturePreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!account) {
      toast({ title: "Error", description: "Wallet not connected", variant: "destructive" });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      let profilePictureUrl = "";
      if (profilePictureFile) {
        try {
          profilePictureUrl = await uploadProfilePicture(profilePictureFile, account);
        } catch (uploadErr) {
          console.error("Error uploading profile picture:", uploadErr);
          toast({ title: "Warning", description: "Profile picture upload failed; continuing without it." });
        }
      }

      const profilePayload: Omit<UserProfile, "id" | "createdAt" | "updatedAt"> = {
        address: account,
        username,
        specialties: selectedSpecialties,
        profilePicture: profilePictureUrl,
      };

      const newId = await createUserProfile(profilePayload);
      if (!newId) {
        throw new Error("Failed to create profile");
      }
      const created = await getUserProfileById(newId);
      if (!created) {
        throw new Error("Failed to fetch created profile");
      }
      toast({ title: "Success", description: "Profile created successfully" });
      onSuccess(created);
    } catch (error) {
      console.error("Error creating profile:", error);
      toast({ title: "Error", description: "Failed to create profile", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-[640px]">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            if (e.target.value.trim()) {
              setErrors((prev) => ({ ...prev, username: undefined }));
            }
          }}
          placeholder="Enter a username"
          className={errors.username ? "border-destructive" : ""}
        />
        {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
      </div>

      <div className="space-y-3">
        <Label>Profile Picture</Label>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          {profilePicturePreview ? (
            <img
              src={profilePicturePreview}
              alt="Profile preview"
              className="h-16 w-16 rounded-full object-cover border"
            />
          ) : (
            <div className="h-16 w-16 rounded-full border flex items-center justify-center text-xs text-muted-foreground">
              No image
            </div>
          )}
          <Input type="file" accept="image/*" onChange={handleFileChange} />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Specialties</Label>
        <ScrollArea className="h-44 md:h-56 rounded-md border p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SPECIALTY_OPTIONS.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedSpecialties.includes(opt)}
                  onCheckedChange={() => toggleSpecialty(opt)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Profile"
          )}
        </Button>
      </div>
    </form>
  );
}