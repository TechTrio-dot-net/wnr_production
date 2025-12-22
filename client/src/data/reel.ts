// Add url (the Reel permalink you copy from Instagram)
export type ReelItem = {
  id: string;
  video?: string;   // e.g. "/reels/r1.mp4"
  poster?: string;  // e.g. "/reels/r1.jpg"
  url?: string;     // instagram permalink as fallback
};
export const reels: ReelItem[] = [
  { id: "r1", url: "https://www.instagram.com/reel/DErJzgoPDM6/" },
  { id: "r2", url: "https://www.instagram.com/reel/DECpY2gsAXV/" },
  { id: "r3", url: "https://www.instagram.com/reel/DDpCi7esCV2/" },
];
