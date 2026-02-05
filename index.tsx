import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useState, useRef } from "react";

const HOST = import.meta.env.VITE_HOST || "http://localhost:5000";

interface GoogleSignupButtonProps {
  onError?: (error: string) => void;
  text?: string;
  size?: "sm" | "md" | "lg";
}

export default function GoogleSignupButton({
  onError,
  text = "Continue with Google",
  size = "md",
}: GoogleSignupButtonProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Reference to hidden GoogleLogin button
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const sizeClasses = {
    sm: "py-1.5 text-sm",
    md: "py-2.5",
    lg: "py-3 text-lg",
  };

  return (
    <div className="relative w-full">
      {/* 🔵 Hidden Google Login element */}
      <div
        ref={googleButtonRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
          opacity: 0,
          height: 0,
          width: 0,
        }}
      >
        <GoogleLogin
          onSuccess={async (credentialResponse: { credential: any; }) => {
            const idToken = credentialResponse.credential;

            if (!idToken) {
              onError?.("No ID token received from Google");
              return;
            }

            setLoading(true);

            try {
              const res = await axios.post(`${HOST}/api/auth/google`, {
                token: idToken,
              });

              localStorage.setItem("token", res.data.token);
              navigate("/dashboard");
            } catch (err: any) {
              const message =
                err.response?.data?.message ||
                "Google login failed. Try again.";
              onError?.(message);
            } finally {
              setLoading(false);
            }
          }}
          onError={() => {
            onError?.("Google login failed or was cancelled.");
          }}
          useOneTap={false}
        />
      </div>

      {/* 🟢 Custom button */}
      <button
        onClick={() => {
          const div = googleButtonRef.current;
          if (div) {
            const button = div.querySelector("div[role=button]") as HTMLElement;
            button?.click();
          }
        }}
        disabled={loading}
        className={`w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition ${sizeClasses[size]} ${
          loading ? "bg-gray-100 cursor-not-allowed" : ""
        }`}
      >
        {loading ? (
          <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        ) : (
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="h-5 w-5"
          />
        )}
        {text}
      </button>
    </div>
  );
}