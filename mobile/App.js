// ClawNote 移动端原生 App —— 导航根。
// 底部 Tab（首页 / 文档 / 任务 / 日历 / 更多）+ 原生 Stack（编辑器、详情、Agent、设置…）。
// 直接消费现有 Next.js REST API（/api/*），与 web 共用同一工作区数据。
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import { ServerProvider } from "./src/config/ServerContext";
import { colors } from "./src/theme";

import HomeScreen from "./src/screens/HomeScreen";
import DocumentsScreen from "./src/screens/DocumentsScreen";
import DocumentEditorScreen from "./src/screens/DocumentEditorScreen";
import DocumentVersionsScreen from "./src/screens/DocumentVersionsScreen";
import DocumentCommentsScreen from "./src/screens/DocumentCommentsScreen";
import TasksScreen from "./src/screens/TasksScreen";
import CalendarScreen from "./src/screens/CalendarScreen";
import MoreScreen from "./src/screens/MoreScreen";
import InboxScreen from "./src/screens/InboxScreen";
import MemoryScreen from "./src/screens/MemoryScreen";
import SearchScreen from "./src/screens/SearchScreen";
import AgentScreen from "./src/screens/AgentScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import TrashScreen from "./src/screens/TrashScreen";
import BitableScreen from "./src/screens/BitableScreen";
import TableScreen from "./src/screens/TableScreen";
import FilesScreen from "./src/screens/FilesScreen";
import TemplatesScreen from "./src/screens/TemplatesScreen";
import AiConfigScreen from "./src/screens/AiConfigScreen";
import MembersScreen from "./src/screens/MembersScreen";
import AccountScreen from "./src/screens/AccountScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

const TAB_ICONS = {
  Home: ["home", "home-outline"],
  Docs: ["document-text", "document-text-outline"],
  Tasks: ["checkbox", "checkbox-outline"],
  Calendar: ["calendar", "calendar-outline"],
  More: ["grid", "grid-outline"],
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text, fontWeight: "700" },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 58, paddingBottom: 6, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ focused, color, size }) => {
          const [on, off] = TAB_ICONS[route.name] || ["ellipse", "ellipse-outline"];
          return <Ionicons name={focused ? on : off} size={size - 2} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: "ClawNote", tabBarLabel: "首页" }} />
      <Tab.Screen name="Docs" component={DocumentsScreen} options={{ title: "文档", tabBarLabel: "文档" }} />
      <Tab.Screen name="Tasks" component={TasksScreen} options={{ title: "任务", tabBarLabel: "任务" }} />
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{ title: "日历", tabBarLabel: "日历" }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ title: "更多", tabBarLabel: "更多" }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ServerProvider>
        <StatusBar style="dark" />
        <NavigationContainer theme={navTheme}>
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: colors.surface },
              headerTitleStyle: { color: colors.text, fontWeight: "700" },
              headerTintColor: colors.text,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen name="DocumentEditor" component={DocumentEditorScreen} options={{ title: "文档", headerBackTitle: "返回" }} />
            <Stack.Screen name="DocumentVersions" component={DocumentVersionsScreen} options={{ title: "版本历史" }} />
            <Stack.Screen name="DocumentComments" component={DocumentCommentsScreen} options={{ title: "评论" }} />
            <Stack.Screen name="Inbox" component={InboxScreen} options={{ title: "收集箱" }} />
            <Stack.Screen name="Memory" component={MemoryScreen} options={{ title: "Agent Memory" }} />
            <Stack.Screen name="Search" component={SearchScreen} options={{ title: "搜索" }} />
            <Stack.Screen name="Agent" component={AgentScreen} options={{ title: "AI 助手" }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "设置" }} />
            <Stack.Screen name="Trash" component={TrashScreen} options={{ title: "回收站" }} />
            <Stack.Screen name="Bitable" component={BitableScreen} options={{ title: "多维表格" }} />
            <Stack.Screen name="Table" component={TableScreen} options={{ title: "数据表" }} />
            <Stack.Screen name="Files" component={FilesScreen} options={{ title: "文件" }} />
            <Stack.Screen name="Templates" component={TemplatesScreen} options={{ title: "模板中心" }} />
            <Stack.Screen name="AiConfig" component={AiConfigScreen} options={{ title: "AI 配置" }} />
            <Stack.Screen name="Members" component={MembersScreen} options={{ title: "成员" }} />
            <Stack.Screen name="Account" component={AccountScreen} options={{ title: "账号" }} />
          </Stack.Navigator>
        </NavigationContainer>
      </ServerProvider>
    </SafeAreaProvider>
  );
}
