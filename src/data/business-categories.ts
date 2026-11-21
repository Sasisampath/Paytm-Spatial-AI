type BusinessCategory = {
  id: string;
  label: string;
  subcategories: readonly {
    id: string;
    label: string;
    iconSrc?: `/assets/subcategories/${string}.png`;
  }[];
};

export const businessCategories = [
  {
    id: "retail-shopping",
    label: "Retail & Shopping",
    subcategories: [
      {
        id: "grocery",
        label: "Grocery / Supermarket / Vegetables",
        iconSrc: "/assets/subcategories/subcategory-grocery.png",
      },
      {
        id: "pan-shop",
        label: "Pan / Tobacco / Cigar Shops",
        iconSrc: "/assets/subcategories/subcategory-pan-shop.png",
      },
      {
        id: "meat-shop",
        label: "Meat Shop",
        iconSrc: "/assets/subcategories/subcategory-meat-shop.png",
      },
      {
        id: "hardware",
        label: "Hardware Stores",
        iconSrc: "/assets/subcategories/subcategory-hardware.png",
      },
      {
        id: "cosmetics",
        label: "Cosmetic Stores",
        iconSrc: "/assets/subcategories/subcategory-cosmetics.png",
      },
      {
        id: "electrical",
        label: "Electrical Equipment & Repair",
        iconSrc: "/assets/subcategories/subcategory-electrical.png",
      },
      {
        id: "clothing",
        label: "Clothing & Fashion",
        iconSrc: "/assets/subcategories/subcategory-clothing.png",
      },
    ],
  },
  {
    id: "individual-services",
    label: "Individual Services",
    subcategories: [
      {
        id: "salon",
        label: "Salon / Beauty Services",
        iconSrc: "/assets/subcategories/subcategory-salon.png",
      },
      {
        id: "freelance",
        label: "Freelance Services",
        iconSrc: "/assets/subcategories/subcategory-freelance.png",
      },
    ],
  },
] as const satisfies readonly BusinessCategory[];
