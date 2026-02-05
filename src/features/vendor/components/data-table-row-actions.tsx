/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { Trash2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Swal from "sweetalert2";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import api from "@/lib/axios";
import { fetchAllVendors } from "@/store/slices/admin/vendorSlice";
import type { AppDispatch } from "@/store";

export function DataTableRowActions({ row }: any) {
  const dispatch = useDispatch<AppDispatch>()
  const vendor = row.original;

  // ✅ Verify Vendor Function
  const handleVerify = async () => {
    Swal.fire({
      title: "Verify Vendor?",
      text: `Are you sure you want to verify ${vendor.name}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Verify",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#16a34a", // green
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await api.put(`/vendors/verify/${vendor._id}`);
          const data = res.data || {};
          if (res.status >= 200 && res.status < 300) {
            toast.success(data.message || "Vendor verified successfully!");
            Swal.fire("Verified!", `${vendor.name} has been verified.`, "success");
          } else {
            throw new Error(data.message || "Failed to verify vendor.");
          }
        } catch (error: any) {
          Swal.fire("Error", error.message || "Something went wrong.", "error");
        }
      }
    });
  };

  // ❌ Reject Vendor Function
  const handleReject = async () => {
    Swal.fire({
      title: "Reject Vendor?",
      text: `Are you sure you want to reject ${vendor.name}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Reject",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626", // red
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await api.put(`/vendors/reject/${vendor._id}`);
          const data = res.data || {};
          if (res.status >= 200 && res.status < 300) {
            toast.success(data.message || "Vendor rejected successfully!");
            Swal.fire("Rejected!", `${vendor.name} has been rejected.`, "success");
          } else {
            throw new Error(data.message || "Failed to reject vendor.");
          }
        } catch (error: any) {
          Swal.fire("Error", error.message || "Something went wrong.", "error");
        }
      }
    });
  };

  const handleDelete = async () => {
    Swal.fire({
      title: "Delete Vendor?",
      html:
        "This will permanently delete the vendor, products, templates, tickets, notifications, and template users.<br/><br/><strong>Transactions and wallet records will be kept.</strong>",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await api.delete(`/vendors/delete/${vendor._id}`);
          const data = res.data || {};
          if (res.status >= 200 && res.status < 300) {
            toast.success(data.message || "Vendor deleted successfully!");
            Swal.fire("Deleted!", `${vendor.name} has been deleted.`, "success");
            dispatch(fetchAllVendors());
          } else {
            throw new Error(data.message || "Failed to delete vendor.");
          }
        } catch (error: any) {
          Swal.fire("Error", error.message || "Something went wrong.", "error");
        }
      }
    });
  };

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="data-[state=open]:bg-muted flex h-8 w-8 p-0"
          >
            <DotsHorizontalIcon className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-[180px]">
          {/* ✅ Verify Vendor */}
          <DropdownMenuItem onClick={handleVerify}>
            Verify Vendor
            <DropdownMenuShortcut>
              <CheckCircle size={16} className="text-green-600" />
            </DropdownMenuShortcut>
          </DropdownMenuItem>

          {/* ❌ Reject Vendor */}
          <DropdownMenuItem onClick={handleReject} className="text-red-500">
            Reject Vendor
            <DropdownMenuShortcut>
              <XCircle size={16} className="text-red-500" />
            </DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* 🗑️ Delete (Optional) */}
          <DropdownMenuItem className="text-red-500" onClick={handleDelete}>
            Delete
            <DropdownMenuShortcut>
              <Trash2 size={16} />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
