import { type RouteConfig, index, layout, route } from "@react-router/dev/routes"

export default [
  route("login", "routes/login.tsx"),
  layout("routes/protected.tsx", [
    index("routes/home.tsx"),
    route("chat", "routes/chat.tsx"),
    route("configs", "routes/configs.tsx"),
  ]),
] satisfies RouteConfig
