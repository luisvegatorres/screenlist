import { Platform } from "react-native";
import { createApi, DEFAULT_API_URL } from "./api";
// Production web is served beside /api; native devices use the public HTTPS URL.
const base =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "web" ? "/api" : DEFAULT_API_URL);
export const api = createApi(base);
