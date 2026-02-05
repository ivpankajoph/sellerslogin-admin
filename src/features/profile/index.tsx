import { motion } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/password-input"
import api from "@/lib/axios"
import { setUser } from "@/store/slices/authSlice"
import { Check, Pencil, Upload, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { ChangeEvent } from "react"
import { useDispatch, useSelector } from "react-redux"

export default function ProfilePage() {
  const dispatch = useDispatch()
  const user = useSelector((state: any) => state.auth.user)
  const isVendor = user?.role === "vendor"
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  })
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState("")
  const [passwordError, setPasswordError] = useState("")

  useEffect(() => {
    if (!user?.id) return
    const loadProfile = async () => {
      try {
        const res = await api.get("/profile")
        const fetched =
          res.data?.user ||
          res.data?.vendor ||
          res.data?.data ||
          res.data?.admin ||
          res.data
        if (fetched) dispatch(setUser({ ...user, ...fetched }))
      } catch (error) {
        console.error("Failed to load profile", error)
      }
    }
    loadProfile()
  }, [dispatch, user?.id])

  useEffect(() => {
    if (!user) return
    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
    })
    setAvatarPreview(user.avatar || null)
  }, [user])

  const handleInputChange =
    (key: "name" | "email" | "phone") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }))
    }

  const handlePasswordChange =
    (key: "currentPassword" | "newPassword" | "confirmPassword") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setPasswordForm((prev) => ({ ...prev, [key]: event.target.value }))
    }

  const handleAvatarSelect = (event: ChangeEvent<HTMLInputElement>) => {
    setErrorMessage("")
    setSuccessMessage("")
    const file = event.target.files?.[0]
    if (!file) return
    const isValid = /image\/(jpeg|png|webp)/i.test(file.type)
    if (!isValid) {
      setErrorMessage("Please upload a JPG, PNG, or WEBP image.")
      return
    }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const resetForm = () => {
    if (!user) return
    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
    })
    setAvatarPreview(user.avatar || null)
    setAvatarFile(null)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setErrorMessage("")
      setSuccessMessage("")
      const payload = new FormData()
      if (!isVendor) {
        if (form.name) payload.append("name", form.name)
        if (form.email) payload.append("email", form.email)
        if (form.phone) payload.append("phone", form.phone)
      }
      if (avatarFile) payload.append("avatar", avatarFile)

      const res = await api.put("/profile", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      const updatedUser =
        res.data?.user ||
        res.data?.vendor ||
        res.data?.data ||
        res.data?.admin ||
        res.data
      if (updatedUser) dispatch(setUser({ ...user, ...updatedUser }))
      setSuccessMessage("Profile updated successfully.")
      setIsEditing(false)
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        "Failed to update profile. Please try again."
      setErrorMessage(message)
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordUpdate = async () => {
    setPasswordMessage("")
    setPasswordError("")

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordError("Please enter your current and new password.")
      return
    }

    if (passwordForm.newPassword.length < 7) {
      setPasswordError("Password must be at least 7 characters long.")
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Passwords do not match.")
      return
    }

    try {
      setPasswordSaving(true)
      await api.put("/profile/password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      })
      setPasswordMessage("Password updated successfully.")
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        "Failed to update password. Please try again."
      setPasswordError(message)
    } finally {
      setPasswordSaving(false)
    }
  }

  return (
    <motion.div
      className="min-h-screen px-4 py-8 flex flex-col items-center bg-[radial-gradient(circle_at_top,#e2e8f0,transparent_55%),linear-gradient(180deg,#f8fafc,rgba(248,250,252,0.6))]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Card className="w-full max-w-3xl border bg-white/95 backdrop-blur-md shadow-xl rounded-3xl">
        <CardHeader className="flex flex-col items-center space-y-2 pb-4">
          <div className="relative">
            <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
              <AvatarImage src={avatarPreview || undefined} alt="profile" />
              <AvatarFallback>{user?.name?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <Button
              size="icon"
              variant="secondary"
              className="absolute bottom-0 right-0 rounded-full p-2 shadow-md"
              onClick={() => isEditing && fileInputRef.current?.click()}
              disabled={!isEditing}
            >
              <Upload className="w-4 h-4" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarSelect}
            />
          </div>

          <CardTitle className="text-2xl font-semibold mt-2">
            {user?.name || "Profile"}
          </CardTitle>
          <p className="text-slate-500 text-sm">{user?.email || ""}</p>
          <Badge variant="outline" className="border-slate-300 text-slate-600">
            Pro Member
          </Badge>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-500">
              {isVendor
                ? "Update your profile photo."
                : "Edit your profile details and save changes."}
            </div>
            <div className="flex justify-center sm:justify-end gap-2">
              {!isEditing ? (
                <Button
                  variant="outline"
                  className="border-slate-300"
                  onClick={() => {
                    setErrorMessage("")
                    setSuccessMessage("")
                    setIsEditing(true)
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" /> {isVendor ? "Change Photo" : "Edit"}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="border-slate-300"
                    onClick={() => {
                      resetForm()
                      setIsEditing(false)
                      setErrorMessage("")
                      setSuccessMessage("")
                    }}
                    disabled={saving}
                  >
                    <X className="w-4 h-4 mr-2" /> Cancel
                  </Button>
                  <Button
                    className="bg-slate-900 hover:bg-slate-800 text-white"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    <Check className="w-4 h-4 mr-2" />{" "}
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </>
              )}
            </div>
          </div>

          {errorMessage ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}
          {successMessage ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          {!isVendor ? (
            <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <Input
              value={form.name}
              onChange={handleInputChange("name")}
              placeholder="Your name"
              className="border-slate-200 bg-white"
              disabled={!isEditing}
            />
            <Input
              value={form.email}
              onChange={handleInputChange("email")}
              placeholder="Your email"
              className="border-slate-200 bg-white"
              disabled={!isEditing}
            />
            <Input
              value={form.phone}
              onChange={handleInputChange("phone")}
              placeholder="Your phone"
              className="border-slate-200 bg-white"
              disabled={!isEditing}
            />
            </motion.div>
          ) : null}

          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mt-2 space-y-3 rounded-2xl border border-slate-200 bg-white/70 p-4"
          >
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-slate-700">Change Password</p>
              <p className="text-xs text-slate-500">
                Update your password for this account. Use at least 7 characters.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <PasswordInput
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange("currentPassword")}
                placeholder="Current password"
                className="border-slate-200 bg-white"
              />
              <PasswordInput
                value={passwordForm.newPassword}
                onChange={handlePasswordChange("newPassword")}
                placeholder="New password"
                className="border-slate-200 bg-white"
              />
              <PasswordInput
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange("confirmPassword")}
                placeholder="Confirm new password"
                className="border-slate-200 bg-white"
              />
              <div className="flex items-center">
                <Button
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                  onClick={handlePasswordUpdate}
                  disabled={passwordSaving}
                >
                  {passwordSaving ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </div>
            {passwordError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
                {passwordError}
              </div>
            ) : null}
            {passwordMessage ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-700">
                {passwordMessage}
              </div>
            ) : null}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
