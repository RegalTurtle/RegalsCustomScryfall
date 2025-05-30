"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // res here if we want to check the result of signIn
    const res = await signIn("credentials", {
      username,
      password,
      redirect: true,
      callbackUrl: "/", // Redirect on success, back to home page
    });

    // Optional: handle errors here
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto mt-10">
      <div>
        <label>Username:</label>
        <input type="username" onChange={(e) => setUsername(e.target.value)} required />
      </div>
      <div>
        <label>Password:</label>
        <input type="password" onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <button type="submit">Sign in</button>
    </form>
  );
}