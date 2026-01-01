export interface UserProfile {
  age: number;
  weight_kg: number;
  height_cm: number;
  bmr_kcal: number;
  tdee_maintenance_kcal: number;
  target_lose_weight_kcal: number;
  target_protein_g: number;
}

export interface FoodItem {
  time: string;
  item: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface Exercise {
  cardio_1?: {
    type: string;
    distance_mi: number;
    duration_min: number;
    calories_burned: number;
  };
  cardio_2?: {
    type: string;
    distance_mi: number;
    duration_min: number;
    calories_burned: number;
  };
  strength?: {
    type: string;
    duration_min: number;
    calories_burned: number;
  };
  total_burned_calories: number;
  status?: string;
}

export interface DailySummary {
  total_intake_calories: number;
  total_burned_calories: number;
  net_calories: number;
  total_protein_g: number;
  total_carbs_g?: number;
  total_fat_g?: number;
  analysis?: string;
  status?: string;
}

export interface DailyLog {
  date: string;
  food_diary: FoodItem[];
  exercise: Exercise;
  daily_summary: DailySummary;
}

export interface FitnessData {
  user_profile: UserProfile;
  daily_logs: DailyLog[];
}