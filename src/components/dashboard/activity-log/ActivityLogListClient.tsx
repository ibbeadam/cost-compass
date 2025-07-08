"use client";

import { useState } from "react";
import { 
  Activity,
  User,
  Shield,
  Settings
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserActivityLogClient from "./UserActivityLogClient";
import GeneralActivityLogClient from "./GeneralActivityLogClient";

export default function ActivityLogListClient() {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="w-full space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            General Activity
          </TabsTrigger>
          <TabsTrigger value="user" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            User Activity
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="mt-6">
          <GeneralActivityLogClient />
        </TabsContent>
        
        <TabsContent value="user" className="mt-6">
          <UserActivityLogClient />
        </TabsContent>
      </Tabs>
    </div>
  );
}