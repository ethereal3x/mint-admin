import { type RouteConfig, index, route } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("strategies", "routes/strategies.tsx"),
  route("mappings", "routes/mappings.tsx"),
  route("chat", "routes/chat.tsx"),
] satisfies RouteConfig
