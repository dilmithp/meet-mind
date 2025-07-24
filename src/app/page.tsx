'use client'
import {Button} from "@/components/ui/button";
import {useState} from "react";
import {Input} from "@/components/ui/input";

export default function Home() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

  return (
      <div>
          <Input placeholder={name} value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder={email} value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder={password} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button>Create User</Button>
      </div>
  )
}
