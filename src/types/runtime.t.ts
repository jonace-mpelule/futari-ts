import type { Method } from "./network"

export type RuntimeRoutes = {
    method: Method,
      path: string,
      handler: () => void
      middlewares: [],
}

