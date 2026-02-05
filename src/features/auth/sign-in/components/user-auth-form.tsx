
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2, LogIn } from "lucide-react";
import Swal from "sweetalert2"; // ✅ import swal
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, AppState } from "@/store";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { cn } from "@/lib/utils";
import { loginAdmin } from "@/store/slices/authSlice";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z
    .string()
    .min(7, "Password must be at least 7 characters long"),
});

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string;
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((state: AppState) => state?.auth);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    const resultAction = await dispatch(
      loginAdmin({
        email: data.email,
        password: data.password,
      })
    );

    if (resultAction.payload?.success) {
      Swal.fire({
        icon: "success",
        title: resultAction.payload?.message || "Login successful",
        showConfirmButton: false,
        timer: 1500,
      });
      navigate({ to: redirectTo || "/" });

    }
    else {
      const errorMessage =
        resultAction.payload?.message ||
        (typeof resultAction.payload === "string" ? resultAction.payload : null) ||
        "Something went wrong!";
      Swal.fire({
        icon: "error",
        title: "Login failed",
        text: errorMessage,
      });
      return;
    }
  };


  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn("grid gap-3", className)}
        {...props}
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="name@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="relative">
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
              <Link
                to="/forgot-password"
                className="text-muted-foreground absolute end-0 -top-0.5 text-sm font-medium hover:opacity-75"
              >
                Forgot password?
              </Link>
            </FormItem>
          )}
        />

        <Button className="mt-2" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <LogIn />}
          Sign in
        </Button>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
        
        </div>

      </form>
    </Form>
  );
}
