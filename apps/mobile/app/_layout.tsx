import { Ionicons } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#2563eb", tabBarStyle: { height: 76, paddingBottom: 12, paddingTop: 8 } }}>
        <Tabs.Screen name="index" options={{ title: "文档", tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" color={color} size={size} /> }} />
        <Tabs.Screen name="database" options={{ title: "数据库", tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" color={color} size={size} /> }} />
        <Tabs.Screen name="ai" options={{ title: "AI", tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" color={color} size={size} /> }} />
        <Tabs.Screen name="inbox" options={{ title: "Inbox", tabBarIcon: ({ color, size }) => <Ionicons name="mail-outline" color={color} size={size} /> }} />
        <Tabs.Screen name="me" options={{ title: "我的", tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} /> }} />
        <Tabs.Screen name="document/[id]" options={{ href: null }} />
      </Tabs>
    </QueryClientProvider>
  );
}
