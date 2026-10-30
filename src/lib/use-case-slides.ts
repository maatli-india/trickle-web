import {
  Backpack,
  Cake,
  ChefHat,
  Cookie,
  FileText,
  Gem,
  GraduationCap,
  Laptop,
  PawPrint,
  Pill,
  type LucideIcon,
} from "lucide-react";

export type UseCaseSlide = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  tint: { bg: string; fg: string };
};

// Illustrative use cases for the home carousel — real stories Trickle is
// built for, not literal testimonials. Each one pairs with a tint from the
// shared palette (lib/home-constants TINTS) so the slide styling matches the
// rest of the site rather than introducing new colors.
export const USE_CASE_SLIDES: UseCaseSlide[] = [
  {
    icon: Pill,
    eyebrow: "Emergency delivery",
    title: "Medicines that couldn't wait for a courier.",
    description:
      "A sender needed emergency medicines to reach their hometown fast. A traveler already on that route picked them up and handed them over within hours — the kind of speed a regular courier just can't promise.",
    tint: { bg: "#faece7", fg: "#712b13" },
  },
  {
    icon: Cookie,
    eyebrow: "Food cravings",
    title: "A taste of Jaipur, delivered fresh.",
    description:
      "Missing ghewar, namkeen, or that one sweet shop back home? Someone traveling from Jaipur carried a box of local favorites straight to a craving in another city — still fresh when it arrived.",
    tint: { bg: "#faeeda", fg: "#633806" },
  },
  {
    icon: GraduationCap,
    eyebrow: "Exam-day rescue",
    title: "The admit card that almost got left behind.",
    description:
      "A student realized their admit card was still at home — just hours before the exam. A traveler already heading that way delivered it with time to spare, no panic required.",
    tint: { bg: "#e6f1fb", fg: "#0c447c" },
  },
  {
    icon: Laptop,
    eyebrow: "Work emergencies",
    title: "The charger that saved an important meeting.",
    description:
      "A forgotten laptop charger threatened to derail a big presentation. Someone already on the same route carried it over, arriving well before the meeting started.",
    tint: { bg: "#eeedfe", fg: "#3c3489" },
  },
  {
    icon: ChefHat,
    eyebrow: "Home-cooked love",
    title: "Mom's cooking, wherever you're studying.",
    description:
      "A mother packed homemade food for her son away at college. A traveler heading in that direction made sure it reached him warm, home-made, and on time.",
    tint: { bg: "#eaf3de", fg: "#27500a" },
  },
  {
    icon: Gem,
    eyebrow: "Wedding-day saves",
    title: "Jewelry that reached just before the ceremony.",
    description:
      "The wedding jewelry was left behind and the function was hours away. A traveler already on the route carried it safely to the venue before the ceremony began.",
    tint: { bg: "#fbeaf0", fg: "#72243e" },
  },
  {
    icon: Backpack,
    eyebrow: "School-day emergencies",
    title: "The school project that made it just in time.",
    description:
      "A child's school project was forgotten at home on a rushed morning. A traveler heading toward the same school area delivered it before the bell rang.",
    tint: { bg: "#e1f5ee", fg: "#085041" },
  },
  {
    icon: PawPrint,
    eyebrow: "For your pets",
    title: "Pet medicine, delivered with care.",
    description:
      "A pet's medicine ran out while its owner was traveling. A traveler on that route picked it up from a family member and delivered it the same day.",
    tint: { bg: "#faece7", fg: "#712b13" },
  },
  {
    icon: Cake,
    eyebrow: "Celebrations on time",
    title: "A cake that arrived still a surprise.",
    description:
      "A birthday cake needed to cross the city without melting, tipping, or losing its icing. A traveler carried it carefully and delivered it right on time for the celebration.",
    tint: { bg: "#faeeda", fg: "#633806" },
  },
  {
    icon: FileText,
    eyebrow: "Documents & deadlines",
    title: "Papers that couldn't miss their appointment.",
    description:
      "Important certificates were needed for a same-day appointment in another city. A traveler already making that trip delivered them hours before the deadline.",
    tint: { bg: "#e6f1fb", fg: "#0c447c" },
  },
];
