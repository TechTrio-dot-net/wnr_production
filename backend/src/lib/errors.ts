import { Response } from "express";

export function badRequest(res: Response, message: string) {
  return res.status(400).json({ message });
}
export function notFound(res: Response, message: string) {
  return res.status(404).json({ message });
}
export function conflict(res: Response, message: string) {
  return res.status(409).json({ message });
}
export function serverError(res: Response, err: unknown) {
  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(500).json({ message: "Internal Server Error" });
}
