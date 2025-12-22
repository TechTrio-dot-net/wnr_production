// src/routes/contact.ts
import { Router } from "express";
import { postContact, getContactList, patchContact } from "../modules/inbox/controller";

const router = Router();

// List for admin inbox
router.get("/", getContactList);

// Create from public contact form
router.post("/", postContact);

// Update (confirm / resolve / archive + note)
router.patch("/:id", patchContact);

export default router;
