// src/data/Product.ts

export type Product = {
  id: string;
  name: string;
  image: string;       // main grid image
  images: string[];    // gallery images
  pack?: string;
  price?: number;
  hoverImage?: string; // small pack/overlay shown on hover

  // NEW fields for PDP/data completeness
  about?: string;          // short description
  ingredients?: string[];  // list of ingredients

  // (Optional) Per-product override if you ever want custom steps for a product.
  // Not required; PDP will use STEEPING_INSTRUCTIONS by default.
  // steepingInstructions?: string[];
};

// Shared steeping instructions (same for all brews)
export const STEEPING_INSTRUCTIONS: string[] = [
  "Boil fresh water and let it cool slightly to 90–95°C.",
  "Place your dip bag in a cup and pour the warm water gently over it.",
  "Let it steep for 2–5 minutes, allowing the flavours to unfold.",
  "Remove the bag, inhale the soothing aroma and enjoy each sip mindfully.",
];

export const products: Product[] = [
  {
    id: "power-brew",
    name: "Power Brew",
    image: "https://res.cloudinary.com/dob666wa0/image/upload/v1761774081/power-brew_hstfm7.png",
    images: [
      "https://res.cloudinary.com/dob666wa0/image/upload/v1761774081/power-brew_hstfm7.png",
     
    ],
    hoverImage: "/https://res.cloudinary.com/dob666wa0/image/upload/v1761774082/power-brew-pack_e6kpoa.png",
    pack: "15 DIP BAGS",
    price: 599,
    about:
      "A premium brew designed to naturally boost energy levels and improve focus and reduce fatigue.",
    ingredients: [
      "Moringa",
      "Ashwagnadha",
      "Gokhru",
      "Lemongrass",
      "Turmeric",
      "Green Tea",
      "Lindi Piper",
      "Peppermint",
      "Hibiscus",
    ],
  },
  {
    id: "gutease-brew",
    name: "Gutease Brew",
    image: "https://res.cloudinary.com/dob666wa0/image/upload/v1761774089/gutease-brew_fuphx7.png",
    images: [
      "https://res.cloudinary.com/dob666wa0/image/upload/v1761774089/gutease-brew_fuphx7.png",

    ],
    hoverImage: "https://res.cloudinary.com/dob666wa0/image/upload/v1761774091/gutease-brew-pack_oa6r79.png",
    pack: "15 DIP BAGS",
    price: 599,
    about:
      "A natural blend of herbs to improve gut health and enhance appetite and support lightness after meals.",
    ingredients: [
      "Ginger",
      "Fennel",
      "Ajwain",
      "Mint",
      "Sanya Leaves",
      "Rose Petals",
      "Bay Leaf",
      "Green Tea",
      "Lindi Piper",
      "Jethimadh",
    ],
  },
  {
    id: "sugarwise-brew",
    name: "Sugarwise Brew",
    image: "https://res.cloudinary.com/dob666wa0/image/upload/v1761774084/sugarwise-brew_bw52x8.png",
    images: [
      "https://res.cloudinary.com/dob666wa0/image/upload/v1761774084/sugarwise-brew_bw52x8.png",
     
    ],
    hoverImage: "https://res.cloudinary.com/dob666wa0/image/upload/v1761774085/sugarwise-brew-pack_frk9bu.png",
    pack: "15 DIP BAGS",
    price: 599,
    about:
      "A brew crafted with natural ingredients to support healthy blood sugar balance and enhance metabolism and easing diabetic wellness.",
    ingredients: ["Turmeric", "Tamarind", "Karela", "Tulsi", "Cinnamon", "Jethimadh"],
  },
  {
    id: "digestive-brew",
    name: "Digestive Brew",
    image: "/images/products/digestive-brew.png",
    images: [
      "/images/products/digestive-brew.png",
      "/images/products/digestive-brew.png",
      "/images/products/digestive-brew.png",
    ],
    hoverImage: "/images/products/digestive-brew-pack.png",
    pack: "15 DIP BAGS",
    price: 499,
    about:
      "A tangy blend designed with salts to improve digestion and reduce post meal sluggishness and heaviness.",
    ingredients: [
      "Salt",
      "Lime Powder",
      "Black Salt",
      "Black Pepper",
      "Chaat Masala",
      "Green Tea",
      "CTC PF",
    ],
  },
  {
    id: "slim-brew",
    name: "Slim Brew",
    image: "https://res.cloudinary.com/dob666wa0/image/upload/v1761774082/slim-brew_mhd9at.png",
    images: [
      "https://res.cloudinary.com/dob666wa0/image/upload/v1761774082/slim-brew_mhd9at.png",
    
    ],
    hoverImage: "https://res.cloudinary.com/dob666wa0/image/upload/v1761774083/slim-brew-pack_poitmi.png",
    pack: "15 DIP BAGS",
    price: 599,
    about:
      "A healthy blend crafted with 15 herbs to naturally manage water retention to reduce swelling and assist in healthy fat burn and boosting confidence.",
    ingredients: [
      "Cardamom",
      "Fennel",
      "Ginger",
      "Green Tea",
      "Gymema Sylvester",
      "Purnanava",
      "Jasmine",
      "Lemon Grass",
      "Jethimadh",
      "Mint",
      "Oolong",
      "Pipli",
      "Rooibos",
      "Turmeric",
      "Tulsi",
    ],
  },
];
