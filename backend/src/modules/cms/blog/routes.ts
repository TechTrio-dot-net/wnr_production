import { Router } from "express";
import * as ctrl from "./controller";

const r = Router();

// List + search + paginate
r.get("/", ctrl.list);

// Get by id or slug
r.get("/:idOrSlug", ctrl.getOne);

// Create / Update / Delete (protect with auth/RBAC middleware if needed)
r.post("/", /* authMiddleware?, rbac? ,*/ ctrl.create);
r.put("/:id", /* authMiddleware?, rbac? ,*/ ctrl.update);
r.delete("/:id", /* authMiddleware?, rbac? ,*/ ctrl.remove);

export default r;
