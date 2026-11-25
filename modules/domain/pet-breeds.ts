/**
 * PawCare Companion Pet Breeds & Species Master Catalog
 * Specially curated for Vietnamese domestic pet owners with legal compliance
 * under Decree 06/2019/ND-CP and Decree 84/2021/ND-CP (prohibiting endangered wildlife).
 */

export interface BreedItem {
  id: string;
  nameVi: string;
  nameEn: string;
  groupVi?: string;
  groupEn?: string;
  icon?: string;
}

// ==================== 1. CHÓ (DOG BREEDS) ====================
export const DOG_BREEDS: BreedItem[] = [
  { id: "dog-ta", nameVi: "Chó Cỏ / Chó Ta (Bản địa)", nameEn: "Vietnam Native Dog", icon: "🐕" },
  { id: "dog-phuquoc", nameVi: "Chó Phú Quốc (Xoáy lưng)", nameEn: "Phu Quoc Ridgeback", icon: "🐕" },
  { id: "dog-hmong", nameVi: "Chó H'Mông cộc đuôi", nameEn: "H'Mong Bobtail Dog", icon: "🐕" },
  { id: "dog-bacha", nameVi: "Chó Bắc Hà", nameEn: "Bac Ha Dog", icon: "🐕" },
  { id: "dog-corgi", nameVi: "Corgi Wales", nameEn: "Welsh Corgi", icon: "🦊" },
  { id: "dog-poodle", nameVi: "Poodle (Toy / Tiny / Standard)", nameEn: "Poodle", icon: "🐩" },
  { id: "dog-golden", nameVi: "Golden Retriever", nameEn: "Golden Retriever", icon: "🦮" },
  { id: "dog-pomeranian", nameVi: "Phốc Sóc (Pomeranian)", nameEn: "Pomeranian", icon: "🐶" },
  { id: "dog-husky", nameVi: "Siberian Husky", nameEn: "Siberian Husky", icon: "🐺" },
  { id: "dog-alaska", nameVi: "Alaskan Malamute", nameEn: "Alaskan Malamute", icon: "🐺" },
  { id: "dog-pug", nameVi: "Pug (Mặt xệ)", nameEn: "Pug", icon: "🐶" },
  { id: "dog-dachshund", nameVi: "Chó Lạp Xưởng (Dachshund)", nameEn: "Dachshund", icon: "🌭" },
  { id: "dog-samoyed", nameVi: "Samoyed (Tuyết trắng)", nameEn: "Samoyed", icon: "🐕" },
  { id: "dog-shiba", nameVi: "Shiba Inu", nameEn: "Shiba Inu", icon: "🐕" },
  { id: "dog-beagle", nameVi: "Beagle (Săn thỏ)", nameEn: "Beagle", icon: "🐶" },
  { id: "dog-chihuahua", nameVi: "Chihuahua", nameEn: "Chihuahua", icon: "🐶" },
  { id: "dog-french-bull", nameVi: "Bull Pháp (French Bulldog)", nameEn: "French Bulldog", icon: "🐶" },
  { id: "dog-border-collie", nameVi: "Border Collie", nameEn: "Border Collie", icon: "🐕" },
  { id: "dog-doberman", nameVi: "Doberman Pinscher", nameEn: "Doberman Pinscher", icon: "🐕" },
  { id: "dog-rottweiler", nameVi: "Rottweiler", nameEn: "Rottweiler", icon: "🐕" },
  { id: "dog-schnauzer", nameVi: "Schnauzer (Miniature)", nameEn: "Miniature Schnauzer", icon: "🐶" },
  { id: "dog-labrador", nameVi: "Labrador Retriever", nameEn: "Labrador Retriever", icon: "🦮" },
  { id: "dog-chowchow", nameVi: "Chow Chow", nameEn: "Chow Chow", icon: "🐻" },
  { id: "dog-dalmatian", nameVi: "Chó Đốm (Dalmatian)", nameEn: "Dalmatian", icon: "🐕" },
  { id: "dog-pinscher", nameVi: "Phốc Hươu (Miniature Pinscher)", nameEn: "Miniature Pinscher", icon: "🐶" },
];

// ==================== 2. MÈO (CAT BREEDS) ====================
export const CAT_BREEDS: BreedItem[] = [
  { id: "cat-ta", nameVi: "Mèo Ta / Mèo Mướp (Bản địa)", nameEn: "Domestic Shorthair (Mướp)", icon: "🐱" },
  { id: "cat-vang", nameVi: "Mèo Vàng (Domestic)", nameEn: "Domestic Yellow Cat", icon: "🐱" },
  { id: "cat-tamthe", nameVi: "Mèo Tam Thể (Calico)", nameEn: "Calico Cat", icon: "🐱" },
  { id: "cat-aln", nameVi: "Mèo Anh lông ngắn (ALN)", nameEn: "British Shorthair", icon: "🐱" },
  { id: "cat-ald", nameVi: "Mèo Anh lông dài (ALD)", nameEn: "British Longhair", icon: "🐱" },
  { id: "cat-scottish", nameVi: "Mèo Tai cụp (Scottish Fold)", nameEn: "Scottish Fold", icon: "🐱" },
  { id: "cat-batu", nameVi: "Mèo Ba Tư (Persian)", nameEn: "Persian Cat", icon: "🐱" },
  { id: "cat-munchkin", nameVi: "Mèo Chân ngắn Munchkin", nameEn: "Munchkin Cat", icon: "🐱" },
  { id: "cat-ragdoll", nameVi: "Mèo Ragdoll", nameEn: "Ragdoll Cat", icon: "🐱" },
  { id: "cat-xiem", nameVi: "Mèo Xiêm (Siamese)", nameEn: "Siamese Cat", icon: "🐱" },
  { id: "cat-sphynx", nameVi: "Mèo Sphynx (Không lông)", nameEn: "Sphynx Cat", icon: "🐱" },
  { id: "cat-mainecoon", nameVi: "Mèo Maine Coon", nameEn: "Maine Coon", icon: "🐱" },
  { id: "cat-bengal", nameVi: "Mèo Bengal (Da báo)", nameEn: "Bengal Cat", icon: "🐆" },
  { id: "cat-russian-blue", nameVi: "Mèo Nga mắt xanh (Russian Blue)", nameEn: "Russian Blue", icon: "🐱" },
  { id: "cat-exotic", nameVi: "Mèo Mũi tẹt Exotic", nameEn: "Exotic Shorthair", icon: "🐱" },
  { id: "cat-norwegian", nameVi: "Mèo Rừng Na Uy", nameEn: "Norwegian Forest Cat", icon: "🐱" },
];

// ==================== 3. LOÀI THÚ NUÔI KHÁC (HỢP PHÁP TẠI VIỆT NAM) ====================
export const OTHER_LEGAL_PET_BREEDS: BreedItem[] = [
  // Thỏ cảnh (Domestic Rabbits)
  {
    id: "rabbit-minilop",
    nameVi: "Thỏ Minilop (Tai cụp Hà Lan)",
    nameEn: "Minilop Rabbit",
    groupVi: "Thỏ cảnh thuần dưỡng",
    groupEn: "Domestic Rabbits",
    icon: "🐰",
  },
  {
    id: "rabbit-netherland",
    nameVi: "Thỏ Netherland Dwarf (Tai ngắn)",
    nameEn: "Netherland Dwarf Rabbit",
    groupVi: "Thỏ cảnh thuần dưỡng",
    groupEn: "Domestic Rabbits",
    icon: "🐰",
  },
  {
    id: "rabbit-lionhead",
    nameVi: "Thỏ Lionhead (Sư tử)",
    nameEn: "Lionhead Rabbit",
    groupVi: "Thỏ cảnh thuần dưỡng",
    groupEn: "Domestic Rabbits",
    icon: "🐰",
  },
  {
    id: "rabbit-newzealand",
    nameVi: "Thỏ New Zealand trắng",
    nameEn: "New Zealand White Rabbit",
    groupVi: "Thỏ cảnh thuần dưỡng",
    groupEn: "Domestic Rabbits",
    icon: "🐰",
  },
  {
    id: "rabbit-angora",
    nameVi: "Thỏ Angora (Lông xù)",
    nameEn: "Angora Rabbit",
    groupVi: "Thỏ cảnh thuần dưỡng",
    groupEn: "Domestic Rabbits",
    icon: "🐰",
  },

  // Chuột Hamster (Hamsters)
  {
    id: "hamster-bear",
    nameVi: "Chuột Hamster Bear (Syrian)",
    nameEn: "Syrian Hamster (Bear)",
    groupVi: "Chuột Hamster cảnh",
    groupEn: "Pet Hamsters",
    icon: "🐹",
  },
  {
    id: "hamster-winter-white",
    nameVi: "Chuột Hamster Winter White",
    nameEn: "Winter White Hamster",
    groupVi: "Chuột Hamster cảnh",
    groupEn: "Pet Hamsters",
    icon: "🐹",
  },
  {
    id: "hamster-robo",
    nameVi: "Chuột Hamster Robo (Roborovski)",
    nameEn: "Roborovski Hamster",
    groupVi: "Chuột Hamster cảnh",
    groupEn: "Pet Hamsters",
    icon: "🐹",
  },
  {
    id: "hamster-campbell",
    nameVi: "Chuột Hamster Campbell",
    nameEn: "Campbell Hamster",
    groupVi: "Chuột Hamster cảnh",
    groupEn: "Pet Hamsters",
    icon: "🐹",
  },

  // Bọ ú / Chuột lang (Guinea Pigs)
  {
    id: "guineapig-american",
    nameVi: "Bọ ú / Chuột lang lông ngắn (American)",
    nameEn: "American Guinea Pig",
    groupVi: "Bọ ú / Chuột lang",
    groupEn: "Guinea Pigs",
    icon: "🐹",
  },
  {
    id: "guineapig-abyssinian",
    nameVi: "Bọ ú / Chuột lang lông xoắn (Abyssinian)",
    nameEn: "Abyssinian Guinea Pig",
    groupVi: "Bọ ú / Chuột lang",
    groupEn: "Guinea Pigs",
    icon: "🐹",
  },
  {
    id: "guineapig-peruvian",
    nameVi: "Bọ ú / Chuột lang Peruvian (Lông dài)",
    nameEn: "Peruvian Guinea Pig",
    groupVi: "Bọ ú / Chuột lang",
    groupEn: "Guinea Pigs",
    icon: "🐹",
  },
  {
    id: "chinchilla",
    nameVi: "Sóc Chinchilla (Sinh sản hợp pháp)",
    nameEn: "Chinchilla (Captive-bred)",
    groupVi: "Bọ ú / Chuột lang",
    groupEn: "Guinea Pigs",
    icon: "🐭",
  },

  // Nhím kiểng (Hedgehogs)
  {
    id: "hedgehog-pygmy",
    nameVi: "Nhím kiểng châu Phi (African Pygmy)",
    nameEn: "African Pygmy Hedgehog",
    groupVi: "Nhím kiểng",
    groupEn: "Pet Hedgehogs",
    icon: "🦔",
  },

  // Chim & Vẹt cảnh thuần dưỡng (Legal Domestic Pet Birds)
  {
    id: "bird-budgie",
    nameVi: "Vẹt Yến Phụng (Budgerigar)",
    nameEn: "Budgerigar (Parakeet)",
    groupVi: "Chim & Vẹt cảnh hợp pháp",
    groupEn: "Legal Companion Birds",
    icon: "🦜",
  },
  {
    id: "bird-cockatiel",
    nameVi: "Vẹt Cockatiel (Vẹt Mã Lai)",
    nameEn: "Cockatiel",
    groupVi: "Chim & Vẹt cảnh hợp pháp",
    groupEn: "Legal Companion Birds",
    icon: "🦜",
  },
  {
    id: "bird-lovebird",
    nameVi: "Vẹt Lovebird (Vẹt Mẫu Đơn)",
    nameEn: "Lovebird",
    groupVi: "Chim & Vẹt cảnh hợp pháp",
    groupEn: "Legal Companion Birds",
    icon: "🦜",
  },
  {
    id: "bird-canary",
    nameVi: "Chim Yến hót (Canary)",
    nameEn: "Canary Bird",
    groupVi: "Chim & Vẹt cảnh hợp pháp",
    groupEn: "Legal Companion Birds",
    icon: "🐦",
  },
  {
    id: "bird-finch",
    nameVi: "Chim Manh Manh (Zebra Finch)",
    nameEn: "Zebra Finch",
    groupVi: "Chim & Vẹt cảnh hợp pháp",
    groupEn: "Legal Companion Birds",
    icon: "🐦",
  },
  {
    id: "bird-pigeon",
    nameVi: "Bồ câu cảnh (Fancy Pigeon)",
    nameEn: "Fancy Pigeon",
    groupVi: "Chim & Vẹt cảnh hợp pháp",
    groupEn: "Legal Companion Birds",
    icon: "🕊️",
  },

  // Bò sát cảnh sinh sản nhân tạo (Captive-bred legal pet reptiles)
  {
    id: "reptile-bearded-dragon",
    nameVi: "Rồng Úc (Bearded Dragon - Nhân tạo)",
    nameEn: "Bearded Dragon (Captive-bred)",
    groupVi: "Bò sát sinh sản nhân tạo",
    groupEn: "Captive-bred Reptiles",
    icon: "🦎",
  },
  {
    id: "reptile-leopard-gecko",
    nameVi: "Tắc kè da báo (Leopard Gecko - Nhân tạo)",
    nameEn: "Leopard Gecko (Captive-bred)",
    groupVi: "Bò sát sinh sản nhân tạo",
    groupEn: "Captive-bred Reptiles",
    icon: "🦎",
  },
  {
    id: "reptile-turtle",
    nameVi: "Rùa cạn cảnh hợp pháp (Sulcata / Herman)",
    nameEn: "Sulcata Tortoise (Captive-bred)",
    groupVi: "Bò sát sinh sản nhân tạo",
    groupEn: "Captive-bred Reptiles",
    icon: "🐢",
  },

  // Cá cảnh & Thủy sinh (Aquarium Fish)
  {
    id: "fish-betta",
    nameVi: "Cá Betta / Cá Xiêm",
    nameEn: "Betta Fish (Siamese Fighting)",
    groupVi: "Cá cảnh & Thủy sinh",
    groupEn: "Aquarium Fish",
    icon: "🐟",
  },
  {
    id: "fish-guppy",
    nameVi: "Cá Bảy màu (Guppy)",
    nameEn: "Guppy Fish",
    groupVi: "Cá cảnh & Thủy sinh",
    groupEn: "Aquarium Fish",
    icon: "🐠",
  },
  {
    id: "fish-goldfish",
    nameVi: "Cá Vàng / Ba đuôi",
    nameEn: "Goldfish",
    groupVi: "Cá cảnh & Thủy sinh",
    groupEn: "Aquarium Fish",
    icon: "🐠",
  },
  {
    id: "fish-koi",
    nameVi: "Cá Koi cảnh",
    nameEn: "Koi Fish",
    groupVi: "Cá cảnh & Thủy sinh",
    groupEn: "Aquarium Fish",
    icon: "🎏",
  },
  {
    id: "fish-discus",
    nameVi: "Cá Dĩa (Discus)",
    nameEn: "Discus Fish",
    groupVi: "Cá cảnh & Thủy sinh",
    groupEn: "Aquarium Fish",
    icon: "🐡",
  },
];

/**
 * Returns the list of breeds matching the selected species.
 */
export function getBreedsForSpecies(species: "dog" | "cat" | "other"): BreedItem[] {
  switch (species) {
    case "dog":
      return DOG_BREEDS;
    case "cat":
      return CAT_BREEDS;
    case "other":
    default:
      return OTHER_LEGAL_PET_BREEDS;
  }
}

/**
 * Normalizes text for accent-insensitive search (e.g., "cho ta" matches "Chó Ta").
 */
export function removeVietnameseTones(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

/**
 * Filters breeds by query across Vietnamese and English names, group names, and accents.
 */
export function filterBreeds(
  breeds: BreedItem[],
  query: string,
  isEn: boolean = false
): BreedItem[] {
  if (!query || !query.trim()) return breeds;
  const rawQ = query.trim().toLowerCase();
  const normalizedQ = removeVietnameseTones(rawQ);

  return breeds.filter((b) => {
    const name = isEn ? b.nameEn.toLowerCase() : b.nameVi.toLowerCase();
    const otherName = isEn ? b.nameVi.toLowerCase() : b.nameEn.toLowerCase();
    const normName = removeVietnameseTones(name);
    const normOther = removeVietnameseTones(otherName);
    const group = (isEn ? b.groupEn : b.groupVi) || "";
    const normGroup = removeVietnameseTones(group.toLowerCase());

    return (
      name.includes(rawQ) ||
      otherName.includes(rawQ) ||
      normName.includes(normalizedQ) ||
      normOther.includes(normalizedQ) ||
      normGroup.includes(normalizedQ)
    );
  });
}
