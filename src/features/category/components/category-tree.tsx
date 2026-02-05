import { useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";

import { uploadImage } from "@/features/vendor-template/helper/fileupload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Subcategory = {
  id?: string;
  _id?: string;
  name: string;
  slug?: string;
  description?: string | null;
  image_url?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string[] | null;
};

type Category = {
  id?: string;
  _id?: string;
  name: string;
  slug?: string;
  description?: string | null;
  image_url?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string[] | null;
  mainCategory?: {
    _id?: string;
    name?: string;
    slug?: string;
    image_url?: string | null;
    description?: string | null;
    metaTitle?: string | null;
    metaDescription?: string | null;
    metaKeywords?: string[] | null;
  };
  subcategories?: Subcategory[];
};

type EditTarget = {
  type: "main" | "category" | "subcategory";
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
};

const ImageThumb = ({
  src,
  alt,
  size = 36,
}: {
  src?: string | null;
  alt?: string;
  size?: number;
}) => {
  if (!src) {
    return <div className="rounded-md border bg-muted/40" style={{ width: size, height: size }} />;
  }

  return (
    <img
      src={src}
      alt={alt ?? ""}
      width={size}
      height={size}
      className="rounded-md border object-cover"
      style={{ width: size, height: size }}
    />
  );
};

export function CategoryTree({
  categories,
  onRefresh,
  canEdit = false,
}: {
  categories: Category[];
  onRefresh?: () => void;
  canEdit?: boolean;
}) {
  const token = useSelector((state: RootState) => state.auth?.token);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [formState, setFormState] = useState({
    description: "",
    metaTitle: "",
    metaDescription: "",
    imageUrl: "",
  });
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openEdit = (target: EditTarget) => {
    if (!canEdit) return;
    setEditTarget(target);
    setFormState({
      description: target.description || "",
      metaTitle: target.metaTitle || "",
      metaDescription: target.metaDescription || "",
      imageUrl: target.image_url || "",
    });
    setPreview(target.image_url || null);
  };

  const closeEdit = () => {
    setEditTarget(null);
    setPreview(null);
    setSaving(false);
  };

  const handleImageChange = async (file?: File | null) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    const url = await uploadImage(file, "category_images");
    if (url) {
      setFormState((prev) => ({ ...prev, imageUrl: url }));
    }
  };

  const handleSave = async () => {
    if (!editTarget || !canEdit) return;
    try {
      setSaving(true);
      const payload =
        editTarget.type === "subcategory"
          ? {
              description: formState.description,
              image_url: formState.imageUrl || undefined,
              metaTitle: formState.metaTitle,
              metaDescription: formState.metaDescription,
            }
          : {
              description: formState.description,
              image_url: formState.imageUrl || undefined,
              meta_title: formState.metaTitle,
              meta_description: formState.metaDescription,
            };

      const endpoint =
        editTarget.type === "main"
          ? `${import.meta.env.VITE_PUBLIC_API_URL}/v1/maincategories/update/${editTarget.id}`
          : editTarget.type === "category"
            ? `${import.meta.env.VITE_PUBLIC_API_URL}/v1/categories/update/${editTarget.id}`
            : `${import.meta.env.VITE_PUBLIC_API_URL}/v1/subcategories/update/${editTarget.id}`;

      await axios.put(endpoint, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      onRefresh?.();
      closeEdit();
    } finally {
      setSaving(false);
    }
  };

  const getHeaders = () =>
    token ? { Authorization: `Bearer ${token}` } : undefined;

  const handleDelete = async (type: "main" | "category" | "subcategory", id: string) => {
    if (!canEdit) return;
    if (!id) return;
    const message =
      type === "main"
        ? "Delete this main category? All child categories and subcategories will be deleted."
        : type === "category"
          ? "Delete this category? All its subcategories will be deleted."
          : "Delete this subcategory?";
    const ok = window.confirm(message);
    if (!ok) return;
    try {
      setDeletingId(id);
      const url =
        type === "main"
          ? `${import.meta.env.VITE_PUBLIC_API_URL}/v1/maincategories/delete/${id}`
          : type === "category"
            ? `${import.meta.env.VITE_PUBLIC_API_URL}/v1/categories/delete/${id}`
            : `${import.meta.env.VITE_PUBLIC_API_URL}/v1/subcategories/${id}`;
      await axios.delete(url, { headers: getHeaders() });
      onRefresh?.();
    } finally {
      setDeletingId(null);
    }
  };
  const groups = categories.reduce<Record<string, { main: Category["mainCategory"]; items: Category[] }>>(
    (acc, category) => {
      const main = category.mainCategory;
      const key = main?._id || main?.name || "unassigned";
      if (!acc[key]) {
        acc[key] = { main, items: [] };
      }
      acc[key].items.push(category);
      return acc;
    },
    {}
  );

  const grouped = Object.values(groups).sort((a, b) => {
    const nameA = a.main?.name || "Unassigned";
    const nameB = b.main?.name || "Unassigned";
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="space-y-5">
      {grouped.map((group, index) => {
        const mainName = group.main?.name || "Unassigned";
        const mainSlug = group.main?.slug || "";
        const totalSubcategories = group.items.reduce(
          (sum, item) => sum + (item.subcategories?.length || 0),
          0
        );
        const mainKey = String(group.main?._id || mainName || index);
        const isExpanded = expanded[mainKey] ?? false;
        return (
          <Card
            key={`${mainName}-${index}`}
            className="border border-border/70 bg-gradient-to-br from-indigo-50/60 via-white to-sky-50/70"
          >
            <CardHeader className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() =>
                  setExpanded((prev) => ({
                    ...prev,
                    [mainKey]: !(prev[mainKey] ?? true),
                  }))
                }
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-indigo-200/60 bg-white/70 px-4 py-3 text-left shadow-sm transition hover:border-indigo-300"
              >
                <div className="flex items-center gap-3">
                  <ImageThumb src={group.main?.image_url} alt={mainName} size={48} />
                  <div>
                    <CardTitle className="text-lg">{mainName}</CardTitle>
                    {mainSlug ? (
                      <div className="text-xs text-muted-foreground">{mainSlug}</div>
                    ) : null}
                    <Badge className="mt-2 w-fit bg-indigo-100 text-indigo-700">
                      Main Category
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="w-fit bg-sky-100 text-sky-700">
                    {group.items.length} categories
                  </Badge>
                  <Badge className="w-fit bg-emerald-100 text-emerald-700">
                    {totalSubcategories} subcategories
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {isExpanded ? "Collapse" : "Expand"}
                  </span>
                </div>
              </button>
              <div className="flex flex-wrap items-center gap-2">
                {canEdit && group.main?._id && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    onClick={() =>
                      openEdit({
                        type: "main",
                        id: group.main?._id || "",
                        name: mainName,
                        description: group.main?.description,
                        image_url: group.main?.image_url,
                        metaTitle: group.main?.metaTitle,
                        metaDescription: group.main?.metaDescription,
                      })
                    }
                  >
                    Edit
                  </Button>
                )}
                {canEdit && group.main?._id && (
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={deletingId === group.main?._id}
                    onClick={() => handleDelete("main", group.main?._id || "")}
                  >
                    {deletingId === group.main?._id ? "Deleting..." : "Delete"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <Separator />
            {isExpanded ? (
              <CardContent className="space-y-4 pt-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.items.map((category) => {
                  const subs = category.subcategories || [];
                  const subcategoryCount = subs.length;
                  return (
                    <Dialog key={category.id || category._id || category.name}>
                      <DialogTrigger asChild>
                        <button
                          className="rounded-xl border border-slate-200/70 bg-gradient-to-br from-white via-white to-indigo-50/40 p-4 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                          type="button"
                        >
                          <div className="flex items-start gap-3">
                            <ImageThumb src={category.image_url} alt={category.name} size={40} />
                            <div className="min-w-0">
                              <div className="font-semibold">{category.name}</div>
                              {category.slug ? (
                                <div className="text-xs text-muted-foreground">{category.slug}</div>
                              ) : null}
                              <Badge className="mt-2 w-fit bg-sky-100 text-sky-700">
                                Category
                              </Badge>
                            </div>
                          </div>
                          {category.description ? (
                            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                              {category.description}
                            </p>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge className="bg-emerald-100 text-emerald-700">{subcategoryCount} subcategories</Badge>
                            {canEdit && category._id && (
                              <Badge className="bg-amber-100 text-amber-700 text-[10px]">
                                Click to edit
                              </Badge>
                            )}
                          </div>
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{category.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline">{subcategoryCount} subcategories</Badge>
                            <Badge variant="outline">{group.items.length} categories in {mainName}</Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="text-[10px] uppercase bg-sky-100 text-sky-700">
                              Category
                            </Badge>
                            {canEdit && category._id && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-sky-200 text-sky-700 hover:bg-sky-50"
                                onClick={() =>
                                  openEdit({
                                    type: "category",
                                    id: category._id || category.id || "",
                                    name: category.name,
                                    description: category.description,
                                    image_url: category.image_url,
                                    metaTitle: category.metaTitle,
                                    metaDescription: category.metaDescription,
                                  })
                                }
                              >
                                Edit details
                              </Button>
                            )}
                            {canEdit && category._id && (
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={deletingId === (category._id || category.id)}
                                onClick={() =>
                                  handleDelete("category", category._id || category.id || "")
                                }
                              >
                                {deletingId === (category._id || category.id)
                                  ? "Deleting..."
                                  : "Delete"}
                              </Button>
                            )}
                          </div>
                          {subs.length ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                              {subs.map((sub) => (
                                <div
                                  key={sub.id || sub._id || sub.name}
                                  className="rounded-md border border-border/70 bg-muted/10 px-3 py-2 text-sm"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="font-medium">{sub.name}</div>
                                    {canEdit && (sub._id || sub.id) && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-xs"
                                        onClick={() =>
                                          openEdit({
                                            type: "subcategory",
                                            id: sub._id || sub.id || "",
                                            name: sub.name,
                                            description: sub.description,
                                            image_url: sub.image_url,
                                            metaTitle: sub.metaTitle,
                                            metaDescription: sub.metaDescription,
                                          })
                                        }
                                      >
                                        Edit
                                      </Button>
                                    )}
                                    {canEdit && (sub._id || sub.id) && (
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="h-7 px-2 text-xs"
                                        disabled={deletingId === (sub._id || sub.id)}
                                        onClick={() =>
                                          handleDelete("subcategory", sub._id || sub.id || "")
                                        }
                                      >
                                        {deletingId === (sub._id || sub.id)
                                          ? "Deleting..."
                                          : "Delete"}
                                      </Button>
                                    )}
                                  </div>
                                  {sub.slug ? (
                                    <div className="text-xs text-muted-foreground">{sub.slug}</div>
                                  ) : null}
                                  <Badge className="mt-2 w-fit text-[10px] uppercase bg-fuchsia-100 text-fuchsia-700">
                                    Subcategory
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">No subcategories</div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  );
                })}
              </div>
            </CardContent>
            ) : null}
          </Card>
        );
      })}

      {canEdit ? (
        <Dialog
          open={!!editTarget}
          onOpenChange={(open) => {
            if (!open) closeEdit();
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit {editTarget?.type === "main" ? "Main Category" : editTarget?.type === "category" ? "Category" : "Subcategory"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Title (locked)</Label>
                <Input value={editTarget?.name || ""} disabled />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea
                  value={formState.description}
                  onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Add a description"
                />
              </div>
              <div className="grid gap-2">
                <Label>Meta Title</Label>
                <Input
                  value={formState.metaTitle}
                  onChange={(e) => setFormState((prev) => ({ ...prev, metaTitle: e.target.value }))}
                  placeholder="SEO meta title"
                />
              </div>
              <div className="grid gap-2">
                <Label>Meta Description</Label>
                <Textarea
                  value={formState.metaDescription}
                  onChange={(e) => setFormState((prev) => ({ ...prev, metaDescription: e.target.value }))}
                  placeholder="SEO meta description"
                />
              </div>
              <div className="grid gap-2">
                <Label>Image</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e.target.files?.[0] || null)}
                />
                {preview && (
                  <img
                    src={preview}
                    alt="Preview"
                    className="h-20 w-20 rounded-md border object-cover"
                  />
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeEdit}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
