'use client'
import {Button} from "@/components/ui/button";
import {useState} from "react";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";


export default function Home() {
    const {data: session} = authClient.useSession();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    const onSubmit = async () => {
        authClient.signUp.email({
            name,
            email,
            password
        },
            {
                onError: () => {
                    window.alert("Error occurred");
                },
                onSuccess: () => {
                    window.alert("User created successfully");
                }
            })
    }
    if (session) {
        return (
            <div className={'p-4 flex flex-col gap-4 max-w-md mx-auto'}>
                <Label className="text-2xl">Welcome, {session.user.name}</Label>
                <Button onClick={() => authClient.signOut()}>Sign Out</Button>
            </div>
        )
    }

  return (
      <div className={'p-4 flex flex-col gap-4 max-w-md mx-auto'}>
            <Label className="text-2xl">Create User</Label>
          <Input placeholder={name} value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder={email} value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder={password} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button onClick={onSubmit}>Create User</Button>
      </div>
  )
}
